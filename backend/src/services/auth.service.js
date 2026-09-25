/**
 * Auth service — all business logic for registration, login, and token issuance.
 *
 * Rules enforced here (not in the controller or router):
 *   • New public registrations are always role "member" — never escalable
 *   • JWT payload is { userId, role } per spec
 *   • Login returns the same generic error regardless of whether the email
 *     exists or the password is wrong (prevents account enumeration)
 *   • passwordHash is never present on any returned object
 */

import jwt  from 'jsonwebtoken';
import { config }    from '../config/env.js';
import { ApiError }  from '../utils/ApiError.js';
import * as userRepo from '../repositories/user.repository.js';
import { User }      from '../models/User.js';

// ── JWT helpers ───────────────────────────────────────────────────────────────

/**
 * Sign an access token.
 * Payload: { userId, role } — matches the spec.
 *
 * @param   {{ _id: string, role: string }} user
 * @returns {string}
 */
function signToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role:   user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

/**
 * Build the standard auth response shape.
 *
 * @param   {object} user  Mongoose document or plain lean object
 * @returns {{ token: string, expiresIn: string, user: object }}
 */
function buildAuthPayload(user) {
  // Works with both Mongoose documents (have .toPublic) and lean plain objects
  const publicUser = typeof user.toPublic === 'function'
    ? user.toPublic()
    : {
        id:          user._id,
        name:        user.name,
        email:       user.email,
        role:        user.role,
        company:     user.company ?? null,
        isActive:    user.isActive,
        lastLoginAt: user.lastLoginAt ?? null,
        createdAt:   user.createdAt,
        updatedAt:   user.updatedAt,
      };

  // Guard: passwordHash must never appear here
  delete publicUser.passwordHash;

  return {
    token:     signToken(user),
    expiresIn: config.jwtExpiresIn,
    user:      publicUser,
  };
}

// ── Service methods ───────────────────────────────────────────────────────────

/**
 * Register a new account.
 *
 * @param {{ name: string, email: string, password: string, companyId?: string }} dto
 * @returns {Promise<{ token, expiresIn, user }>}
 * @throws {ApiError} 409 if email already registered
 */
export async function register(dto) {
  const { name, email, password, companyId } = dto;

  if (await userRepo.emailExists(email)) {
    throw ApiError.conflict('An account with that email already exists');
  }

  const user = await userRepo.createUser(
    {
      name,
      email,
      role:    'member',             // public registration is ALWAYS member
      company: companyId ?? null,
    },
    password,
  );

  return buildAuthPayload(user);
}

/**
 * Authenticate with email + password.
 *
 * Returns identical error for wrong email and wrong password — the client
 * cannot tell which one failed (prevents account enumeration).
 *
 * @param {{ email: string, password: string }} dto
 * @returns {Promise<{ token, expiresIn, user }>}
 * @throws {ApiError} 401 on bad credentials | 403 if account deactivated
 */
export async function login(dto) {
  const { email, password } = dto;
  const INVALID = ApiError.unauthorized('Invalid credentials');

  // Fetch lean object WITH the normally-hidden passwordHash field
  const leanUser = await userRepo.findByEmail(email, /* withPassword */ true);
  if (!leanUser) throw INVALID;

  // Re-fetch as a full Mongoose document to use the verifyPassword instance method
  const doc = await User.findById(leanUser._id).select('+passwordHash');
  if (!doc) throw INVALID;

  const passwordOk = await doc.verifyPassword(password);
  if (!passwordOk) throw INVALID;

  if (!leanUser.isActive) {
    throw ApiError.forbidden('Your account has been deactivated');
  }

  // Fire-and-forget — don't block the response on this
  userRepo.touchLoginAt(leanUser._id).catch(() => {});

  return buildAuthPayload(leanUser);
}

/**
 * Return the currently authenticated user's profile.
 *
 * @param {string} userId  Set on req.user by the authenticate middleware
 * @returns {Promise<object>}
 * @throws {ApiError} 404 if user was deleted after token was issued
 */
export async function getMe(userId) {
  // Don't populate company yet — Company model isn't registered.
  // Re-enable populate:true once src/models/Company.js exists.
  const user = await userRepo.findById(userId, /* populate */ false);
  if (!user) throw ApiError.notFound('User not found');

  const safe = { ...user };
  delete safe.passwordHash;
  return safe;
}
