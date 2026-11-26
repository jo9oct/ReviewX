import test from "node:test";
import assert from "node:assert/strict";

process.env.GITHUB_CLIENT_ID = "github-test-client";
process.env.GITHUB_CLIENT_SECRET = "github-test-secret";
process.env.GITHUB_REDIRECT_URI = "http://localhost:5000/api/v1/github/callback";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.NODE_ENV = "test";

const {
  getVerifiedPrimaryGithubEmail,
  getGithubFrontendCallbackUrl,
  isGithubLoginState,
  startGithubLogin,
} = await import("../../controllers/github-auth.controller.js");
const { createGithubAuthorizationUrl } = await import(
  "../../integrations/github/github.auth.js"
);
const { Auth } = await import("../../database/models/user.model.js");

test("GitHub sign-in requests email access and binds OAuth state to a short-lived cookie", () => {
  const response = {
    cookieData: null,
    redirectUrl: null,
    cookie(name, value, options) {
      this.cookieData = { name, value, options };
    },
    redirect(url) {
      this.redirectUrl = url;
      return this;
    },
  };
  let nextError;

  startGithubLogin({}, response, (error) => {
    nextError = error;
  });

  assert.equal(nextError, undefined);
  const authorizationUrl = new URL(response.redirectUrl);
  const state = authorizationUrl.searchParams.get("state");

  assert.equal(authorizationUrl.searchParams.get("scope"), "user:email");
  assert.equal(
    authorizationUrl.searchParams.get("redirect_uri"),
    process.env.GITHUB_REDIRECT_URI,
  );
  assert.equal(response.cookieData.name, "reviewx_github_oauth_state");
  assert.equal(response.cookieData.value, state);
  assert.equal(response.cookieData.options.httpOnly, true);
  assert.equal(response.cookieData.options.maxAge, 10 * 60 * 1000);
  assert.equal(response.cookieData.options.path, "/api/v1/github/callback");
  assert.equal(isGithubLoginState(state), true);
  assert.equal(isGithubLoginState("not-a-github-login-state"), false);
  assert.equal(
    new URL(createGithubAuthorizationUrl("repo-state")).searchParams.get("scope"),
    "repo",
  );
});

test("GitHub email selection requires a verified primary address", () => {
  assert.equal(
    getVerifiedPrimaryGithubEmail([
      { email: "secondary@example.com", primary: false, verified: true },
      { email: "unverified@example.com", primary: true, verified: false },
      { email: "Primary@Example.com", primary: true, verified: true },
    ]),
    "primary@example.com",
  );
  assert.equal(
    getVerifiedPrimaryGithubEmail([
      { email: "unverified@example.com", primary: true, verified: false },
    ]),
    null,
  );
});

test("GitHub OAuth success and failure redirect to the configured frontend callback", () => {
  const localFailure = new URL(
    getGithubFrontendCallbackUrl({ error: "github" }),
  );
  assert.equal(localFailure.origin, "http://localhost:5173");
  assert.equal(localFailure.pathname, "/auth/callback");
  assert.equal(localFailure.searchParams.get("error"), "github");

  const previousFrontendUrl = process.env.FRONTEND_URL;
  const previousNodeEnv = process.env.NODE_ENV;

  try {
    process.env.FRONTEND_URL = "https://review-x.vercel.app";
    process.env.NODE_ENV = "production";

    const productionSuccess = new URL(
      getGithubFrontendCallbackUrl({ token: "session-token" }),
    );
    const productionFailure = new URL(
      getGithubFrontendCallbackUrl({ error: "github" }),
    );

    assert.equal(
      productionSuccess.toString().startsWith(
        "https://review-x.vercel.app/auth/callback?token=",
      ),
      true,
    );
    assert.equal(
      productionFailure.toString(),
      "https://review-x.vercel.app/auth/callback?error=github",
    );
  } finally {
    process.env.FRONTEND_URL = previousFrontendUrl;
    process.env.NODE_ENV = previousNodeEnv;
  }
});

test("GitHub accounts can be created without passwords while local accounts still require one", () => {
  const githubUser = new Auth({
    name: "GitHub User",
    userName: "githubuser",
    email: "github@example.com",
    githubId: "12345",
    provider: "github",
  });

  assert.equal(githubUser.validateSync(), undefined);
  assert.equal(githubUser.toPublic().hasPassword, false);

  const localUser = new Auth({
    name: "Local User",
    userName: "localuser",
    email: "local@example.com",
    provider: "local",
  });

  assert.equal(localUser.validateSync().errors.password.kind, "required");
});
