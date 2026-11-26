import Auth from "../model/auth.model.js";
import generateTokenAndSetCookie from "../utils/token.utils.js";
import { createFreeSubscription } from "../services/subscription.service.js";
import {
  createGithubAuthorizationUrl,
  createOAuthState,
  exchangeGithubCode,
  isGithubConfigured,
} from "../integrations/github/github.auth.js";
import { githubRequest } from "../integrations/github/github.client.js";
import {
  isProductionEnvironment,
  resolveFrontendOrigin,
} from "../config/cors.config.js";

const STATE_COOKIE = "reviewx_github_oauth_state";
const STATE_COOKIE_PATH = "/api/v1/github/callback";
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const GITHUB_LOGIN_STATE_PREFIX = "reviewx-login-";

function createAuthError(message, code, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: STATE_COOKIE_PATH,
  };
}

function consumeLoginState(req, res, state) {
  const isValid = isGithubLoginState(state) && req.cookies?.[STATE_COOKIE] === state;
  res.clearCookie(STATE_COOKIE, cookieOptions());

  if (!isValid) {
    throw createAuthError("GitHub sign-in state is invalid or expired.", "INVALID_GITHUB_OAUTH_STATE", 400);
  }
}

export function getGithubFrontendCallbackUrl({ token, error } = {}) {
  const frontendOrigin = resolveFrontendOrigin(
    process.env.FRONTEND_URL,
    isProductionEnvironment(),
  );
  const callbackUrl = new URL("/auth/callback", frontendOrigin);

  if (token) {
    callbackUrl.searchParams.set("token", token);
  }
  if (error) {
    callbackUrl.searchParams.set("error", error);
  }

  return callbackUrl.toString();
}

export function getVerifiedPrimaryGithubEmail(emailRecords) {
  if (!Array.isArray(emailRecords)) {
    return null;
  }

  const primaryEmail = emailRecords.find(
    (record) =>
      record?.primary === true &&
      record?.verified === true &&
      typeof record.email === "string" &&
      record.email.trim(),
  );

  return primaryEmail?.email.trim().toLowerCase() || null;
}

export function isGithubLoginState(state) {
  return typeof state === "string" && state.startsWith(GITHUB_LOGIN_STATE_PREFIX);
}

export function startGithubLogin(_req, res, next) {
  try {
    if (!isGithubConfigured()) {
      throw createAuthError("GitHub OAuth is not configured.", "GITHUB_OAUTH_NOT_CONFIGURED", 503);
    }

    const state = `${GITHUB_LOGIN_STATE_PREFIX}${createOAuthState()}`;
    const authorizationUrl = createGithubAuthorizationUrl(state, ["user:email"]);
    res.cookie(STATE_COOKIE, state, {
      ...cookieOptions(),
      maxAge: OAUTH_STATE_MAX_AGE_MS,
    });

    return res.redirect(authorizationUrl);
  } catch (error) {
    return next(error);
  }
}

async function findOrCreateGithubUser(githubProfile, email) {
  const githubId = String(githubProfile.id);
  let user = await Auth.findOne({ githubId });

  if (!user) {
    user = await Auth.findOne({ email });

    if (
      user &&
      (user.status === "disabled" ||
        user.status === "suspended" ||
        (user.status !== "inactive" && user.isActive === false))
    ) {
      throw createAuthError("Your account has been deactivated.", "ACCOUNT_DISABLED", 403);
    }

    if (user?.githubId && user.githubId !== githubId) {
      throw createAuthError(
        "This email is already linked to a different GitHub account.",
        "GITHUB_ACCOUNT_CONFLICT",
        409,
      );
    }

    if (user) {
      user.githubId = githubId;
      if (!user.Photo && githubProfile.avatar_url) {
        user.Photo = githubProfile.avatar_url;
      }
    } else {
      const baseUsername = githubProfile.login.trim().toLowerCase();
      let userName = baseUsername;

      if (await Auth.exists({ userName })) {
        userName = `${baseUsername}${githubId}`;
      }
      if (await Auth.exists({ userName })) {
        throw createAuthError("Could not create a unique username for this GitHub account.", "GITHUB_USERNAME_CONFLICT", 409);
      }

      let name = String(githubProfile.name || githubProfile.login).trim().slice(0, 80);
      if (name.length < 2) {
        name = `GitHub ${name || "user"}`;
      }

      user = await Auth.create({
        name,
        userName,
        email,
        githubId,
        provider: "github",
        role: "member",
        Photo: githubProfile.avatar_url || "",
        status: "active",
        isActive: true,
      });

      try {
        await createFreeSubscription(user._id);
      } catch (error) {
        console.warn("Could not create free subscription for GitHub user:", error.message);
      }
    }
  }

  if (user.status === "disabled" || user.status === "suspended") {
    throw createAuthError("Your account has been deactivated.", "ACCOUNT_DISABLED", 403);
  }

  if (user.status === "inactive") {
    user.status = "active";
    user.isActive = true;
  } else if (user.isActive === false) {
    throw createAuthError("Your account has been deactivated.", "ACCOUNT_DISABLED", 403);
  }

  user.lastLogin = new Date();
  user.lastLoginAt = user.lastLogin;
  await user.save();

  return user;
}

export async function completeGithubLogin(req, res, next) {
  const { code, state, error } = req.query;

  try {
    consumeLoginState(req, res, state);

    if (error) {
      return res.redirect(getGithubFrontendCallbackUrl({ error: "github" }));
    }
    if (typeof code !== "string" || !code.trim()) {
      throw createAuthError("GitHub authorization code is required.", "GITHUB_AUTHORIZATION_CODE_REQUIRED", 400);
    }

    const accessToken = await exchangeGithubCode(code);
    const [githubProfile, emailRecords] = await Promise.all([
      githubRequest({ path: "/user", accessToken: accessToken.accessToken }),
      githubRequest({ path: "/user/emails", accessToken: accessToken.accessToken }),
    ]);

    if (
      !githubProfile ||
      typeof githubProfile.id !== "number" ||
      typeof githubProfile.login !== "string" ||
      !githubProfile.login.trim()
    ) {
      throw createAuthError("GitHub returned an invalid user profile.", "INVALID_GITHUB_USER", 502);
    }

    const email = getVerifiedPrimaryGithubEmail(emailRecords);
    if (!email) {
      throw createAuthError(
        "Your GitHub account must have a verified primary email address.",
        "GITHUB_VERIFIED_EMAIL_REQUIRED",
        422,
      );
    }

    const user = await findOrCreateGithubUser(githubProfile, email);
    const token = generateTokenAndSetCookie(res, user._id);
    user.sessionToken = token;
    await user.save();

    return res.redirect(getGithubFrontendCallbackUrl({ token }));
  } catch (error) {
    if (!(error?.statusCode >= 400 && error.statusCode < 500)) {
      console.error(
        "GitHub OAuth callback failed:",
        error instanceof Error ? error.message : String(error),
      );
    }

    try {
      return res.redirect(
        getGithubFrontendCallbackUrl({ error: "github" }),
      );
    } catch (redirectError) {
      return next(redirectError);
    }
  }
}
