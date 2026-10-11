// STATUS: UPDATED

/**
 * Auth service — all business logic for registration, login, and token issuance.
 *
 * Rules enforced here:
 *   • Public registrations produce role "member" or, for accountType
 *     "company_owner", "company_admin" — never "platform_admin".
 *   • JWT payload is { userId, role }.
 *   • Login returns the same generic error for invalid email/password.
 *   • passwordHash is never returned.
 *   • Every new user receives a FREE subscription.
 */

import jwt from 'jsonwebtoken';

import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import * as userRepo from '../database/repositories/user.repository.js';
import * as companyRepo from '../database/repositories/company.repository.js';
import * as subscriptionService from './subscription.service.js';
import * as subscriptionRepo from '../database/repositories/subscription.repositories.js';

// ── JWT helpers ──────────────────────────────────────────────────────────────

/**
 * Sign an access token.
 *
 * Payload: { userId, role, tokenVersion, activeCompanyId }
 *
 * `activeCompanyId` is the workspace the user is currently operating in.
 * null = personal workspace, ObjectId string = company workspace.
 *
 * @param {object} user
 * @param {string|null} [activeCompanyId]
 * @returns {string}
 */
function signToken(user, activeCompanyId = null) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
      activeCompanyId: activeCompanyId ?? null,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
    },
  );
}

/**
 * Build the public user object.
 *
 * @param {object} user Mongoose document or lean object
 * @returns {object}
 */
function buildPublicUser(user) {
  if (typeof user.toPublic === 'function') {
    return user.toPublic();
  }

  return {
    id: user._id?.toString() || user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company ?? null,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ?? null,
    companyRole: user.companyRole ?? null,
    isOwner: user.isOwner ?? false,
    workspaces: user.workspaces ?? [],
    activeWorkspace: user.activeWorkspace ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Build the standard authentication response.
 *
 * Exported for reuse by invitation.service.js (accept → login payload).
 *
 * @param {object} user
 * @param {object|null} subscription
 * @param {string|null} [activeCompanyId]
 * @returns {{ token: string, expiresIn: string, user: object, subscription?: object }}
 */
export function buildAuthPayload(user, subscription = null, activeCompanyId = null) {
  const publicUser = buildPublicUser(user);

  // Security guard: passwordHash must never be returned.
  delete publicUser.passwordHash;

  const payload = {
    token: signToken(user, activeCompanyId),
    expiresIn: config.jwtExpiresIn,
    user: publicUser,
  };

  if (subscription) {
    payload.subscription = subscription;
  }

  return payload;
}

// ── Service methods ──────────────────────────────────────────────────────────

/**
 * Register a new account.
 *
 * Two signup paths (driven by `accountType`):
 *   individual     → role: member,  no company
 *   company_owner  → creates a Company, role: company_admin, linked to it
 *
 * Public registration can NEVER produce a platform_admin — the role is
 * derived here from accountType and `role` is stripped by the Joi schema.
 *
 * Every newly registered user gets a FREE subscription.
 *
 * @param {{
 *   name: string,
 *   email: string,
 *   password: string,
 *   accountType?: 'individual' | 'company_owner',
 *   companyName?: string
 * }} dto
 *
 * @returns {Promise<{
 *   token: string,
 *   expiresIn: string,
 *   user: object,
 *   subscription: object
 * }>}
 */
export async function register(dto) {
  const {
    name,
    email,
    password,
    accountType = 'individual',
    companyName,
  } = dto;

  // Belt and braces: the Joi schema restricts these values, but privilege
  // assignment must never depend on validation alone.
  if (accountType !== 'individual' && accountType !== 'company_owner') {
    throw ApiError.badRequest('Invalid accountType');
  }
  if (accountType === 'company_owner' && !companyName?.trim()) {
    throw ApiError.badRequest('Company name is required to create a company');
  }

  const emailAlreadyExists =
    await userRepo.emailExists(email);

  if (emailAlreadyExists) {
    throw ApiError.conflict(
      'An account with that email already exists',
    );
  }

  const isCompanyOwner = accountType === 'company_owner';

  // Create the user first (company link is added right after the Company doc).
  const user = await userRepo.createUser(
    {
      name,
      email,
      role:    isCompanyOwner ? 'company_admin' : 'member',
      company: null,
    },
    password,
  );

  if (isCompanyOwner) {
    const company = await companyRepo.create({
      name:  companyName.trim(),
      slug:  await uniqueSlug(companyName.trim()),
      owner: user._id,
    });

    await userRepo.setCompany(user._id, company._id);
    user.company = company._id;

    // Create a team-trial subscription scoped to the company.
    // The owner's personal subscription stays Free (created below).
    await subscriptionRepo.findOrCreateTrialingByCompanyId(company._id, user._id);
  }

  // Final guard — a platform_admin must only ever come from the seed script.
  if (user.role === 'platform_admin') {
    throw ApiError.forbidden('Invalid account role');
  }

  // Every newly registered user starts on the FREE plan.
  const subscription =
    await subscriptionService.createFreeSubscription(
      user._id,
    );

  // Default activeCompanyId: company workspace for company owners, personal for individuals
  const activeCompanyId = isCompanyOwner && user.company
    ? user.company.toString()
    : null;

  const enrichedUser = await getMe(user._id.toString(), activeCompanyId).catch(() => null);

  return buildAuthPayload(
    enrichedUser ?? user,
    subscription,
    activeCompanyId,
  );
}

/** Slugify a company name and ensure it doesn't collide. */
async function uniqueSlug(companyName) {
  const base = companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'company';

  let slug = base;
  for (let i = 2; await companyRepo.findBySlug(slug); i += 1) {
    slug = `${base}-${i}`;
    if (i > 1000) {
      slug = `${base}-${Date.now().toString(36)}`;
      break;
    }
  }
  return slug;
}

/**
 * Authenticate with email + password.
 *
 * The same generic error is returned for:
 *   • email not found
 *   • incorrect password
 *
 * This prevents account enumeration.
 *
 * @param {{ email: string, password: string }} dto
 * @returns {Promise<{
 *   token: string,
 *   expiresIn: string,
 *   user: object
 * }>}
 */
export async function login(dto) {
  const {
    email,
    password,
  } = dto;

  const invalidCredentials =
    ApiError.unauthorized(
      'Invalid credentials',
    );

  // Repository returns a Mongoose document with
  // passwordHash explicitly selected.
  const user =
    await userRepo.findByEmailDocument(
      email,
    );

  if (!user) {
    throw invalidCredentials;
  }

  const passwordValid =
    await user.verifyPassword(
      password,
    );

  if (!passwordValid) {
    throw invalidCredentials;
  }

  if (!user.isActive) {
    throw ApiError.forbidden(
      'Your account has been deactivated',
    );
  }

  // Update login time without blocking login response.
  userRepo
    .touchLoginAt(user._id)
    .catch(() => {});

  // Default activeCompanyId: company workspace for company members, null for personal
  const activeCompanyId = user.company ? user.company.toString() : null;

  const enrichedUser = await getMe(user._id.toString(), activeCompanyId).catch(() => null);

  return buildAuthPayload(enrichedUser ?? user, null, activeCompanyId);
}

/**
 * Return the currently authenticated user's profile, enriched with
 * workspace context, computed role, and ownership flag.
 *
 * @param {string} userId
 * @param {string|null} [activeCompanyId]  from the JWT payload
 * @returns {Promise<object>}
 */
export async function getMe(userId, activeCompanyId = null) {
  const user = await userRepo.findById(userId, false);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const safeUser = {
    ...user,
    id: user._id?.toString(),
  };
  delete safeUser.passwordHash;

  // ── Personal subscription (never throws — falls back to Free) ────────────
  let personalSub = { plan: 'free', status: 'active' };
  try {
    personalSub = await subscriptionService.getSubscription({
      type: 'personal',
      userId,
      companyId: null,
    });
  } catch {
    // DB gap — Free defaults are safe
  }

  const personalWorkspace = {
    type:      'personal',
    companyId: null,
    name:      `${user.name}'s Workspace`,
    role:      'owner',
    planCode:  personalSub.plan,
    status:    personalSub.status,
  };

  const workspaces = [personalWorkspace];
  let companyRole  = null;
  let isOwner      = false;

  // ── Company workspace ────────────────────────────────────────────────────
  if (user.company) {
    const { Company } = await import('../database/models/company.model.js');
    const company = await Company.findById(user.company).lean();

    if (company) {
      isOwner     = company.owner.equals(user._id);
      companyRole = isOwner
        ? 'owner'
        : user.role === 'company_admin'
          ? 'admin'
          : 'member';

      let companySub = { plan: 'free', status: 'active' };
      try {
        companySub = await subscriptionService.getSubscription({
          type:      'company',
          userId,
          companyId: user.company.toString(),
        });
      } catch {
        // Fall back to Free display
      }

      workspaces.push({
        type:      'company',
        companyId: company._id.toString(),
        name:      company.name,
        role:      companyRole,
        planCode:  companySub.plan,
        status:    companySub.status,
      });
    }
  }

  // ── Determine activeWorkspace from token ─────────────────────────────────
  // Use the activeCompanyId carried by the JWT; do NOT default to the company
  // workspace on every call (that would undo a switch-to-personal).
  let activeWorkspace = personalWorkspace;
  if (activeCompanyId) {
    const match = workspaces.find(w => w.companyId === activeCompanyId);
    if (match) {
      activeWorkspace = match;
    } else {
      // activeCompanyId is stale (company deleted, membership revoked, etc.)
      // Fall back to personal silently.
      console.warn(
        `[getMe] activeCompanyId=${activeCompanyId} not found in workspaces for user=${userId}, falling back to personal`,
      );
    }
  }

  return {
    ...safeUser,
    companyRole,
    isOwner,
    workspaces,
    activeWorkspace,
  };
}

/**
 * Revoke all other sessions by bumping tokenVersion.
 * The caller's current token (which carries the old version + 1 implicitly
 * via re-issue) stays valid — all other existing tokens are rejected.
 *
 * @param {string} userId
 * @returns {Promise<{ token: string, expiresIn: string, user: object }>}
 */
export async function revokeOtherSessions(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  // Bump version atomically
  const updated = await userRepo.updateById(userId, {
    $inc: { tokenVersion: 1 },
  });

  // Preserve the active workspace across session revocation
  const activeCompanyId = user.company ? user.company.toString() : null;

  // Issue a fresh token with the new version so the caller stays logged in
  return buildAuthPayload(updated, null, activeCompanyId);
}

/**
 * Switch the active workspace for the authenticated user.
 *
 * Validates membership, then re-issues a JWT with the new `activeCompanyId`.
 * The caller must store the returned token — subsequent requests carry
 * the new workspace context automatically.
 *
 * @param {string} userId
 * @param {'personal'|'company'} workspaceType
 * @param {string|null} [companyId]
 * @returns {Promise<{ token: string, expiresIn: string, activeWorkspace: object }>}
 */
export async function switchWorkspace(userId, workspaceType, companyId = null) {
  const user = await userRepo.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  let activeCompanyId = null;
  let activeWorkspace;

  if (workspaceType === 'company') {
    if (!companyId) {
      throw ApiError.badRequest('companyId is required when switching to a company workspace');
    }

    // Verify the user actually belongs to this company
    if (!user.company || user.company.toString() !== companyId) {
      throw ApiError.forbidden('You do not have access to this workspace');
    }

    activeCompanyId = companyId;
    activeWorkspace = { type: 'company', companyId };
  } else {
    // Personal workspace — no membership check needed
    activeWorkspace = { type: 'personal', companyId: null };
  }

  const token = signToken(user, activeCompanyId);

  return {
    token,
    expiresIn: config.jwtExpiresIn,
    activeWorkspace,
  };
}