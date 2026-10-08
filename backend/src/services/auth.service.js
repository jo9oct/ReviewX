// STATUS: UPDATED

/**
 * Auth service — all business logic for registration, login, and token issuance.
 *
 * Rules enforced here:
 *   • New public registrations are always role "member".
 *   • JWT payload is { userId, role }.
 *   • Login returns the same generic error for invalid email/password.
 *   • passwordHash is never returned.
 *   • Every new user receives a FREE subscription.
 */

import jwt from 'jsonwebtoken';

import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import * as userRepo from '../database/repositories/user.repository.js';
import * as subscriptionService from './subscription.service.js';

// ── JWT helpers ──────────────────────────────────────────────────────────────

/**
 * Sign an access token.
 *
 * Payload: { userId, role }
 *
 * @param {object} user
 * @returns {string}
 */
function signToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
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
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company ?? null,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Build the standard authentication response.
 *
 * @param {object} user
 * @param {object|null} subscription
 * @returns {{ token: string, expiresIn: string, user: object, subscription?: object }}
 */
function buildAuthPayload(user, subscription = null) {
  const publicUser = buildPublicUser(user);

  // Security guard: passwordHash must never be returned.
  delete publicUser.passwordHash;

  const payload = {
    token: signToken(user),
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
 * Public registration always creates:
 *   role: member
 *
 * It also automatically creates:
 *   plan: free
 *   status: active
 *
 * @param {{
 *   name: string,
 *   email: string,
 *   password: string,
 *   companyId?: string
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
    companyId,
  } = dto;

  const emailAlreadyExists =
    await userRepo.emailExists(email);

  if (emailAlreadyExists) {
    throw ApiError.conflict(
      'An account with that email already exists',
    );
  }

  // Public registration is ALWAYS a member account.
  const user = await userRepo.createUser(
    {
      name,
      email,
      role: 'member',
      company: companyId ?? null,
    },
    password,
  );

  // Every newly registered user starts on the FREE plan.
  const subscription =
    await subscriptionService.createFreeSubscription(
      user._id,
    );

  return buildAuthPayload(
    user,
    subscription,
  );
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

  return buildAuthPayload(user);
}

/**
 * Return the currently authenticated user's profile.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getMe(userId) {
  const user =
    await userRepo.findById(
      userId,
      false,
    );

  if (!user) {
    throw ApiError.notFound(
      'User not found',
    );
  }

  const safeUser = {
    ...user,
    id: user._id?.toString(),
  };

  delete safeUser.passwordHash;

  return safeUser;
}