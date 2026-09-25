/**
 * protect — JWT authentication middleware.
 *
 * Reads the bearer token from the Authorization header, verifies it,
 * and attaches a lightweight user object to `req.user` so downstream
 * handlers know who is making the request.
 *
 * req.user shape after this middleware runs:
 *   { id: string, role: string }
 *
 * Usage:
 *   router.get('/me', protect, userController.getMe);
 *   router.delete('/users/:id', protect, authorize('platform'), ...);
 *
 * Throws ApiError(401) for missing/malformed/expired tokens.
 * Throws ApiError(403) for deactivated accounts.
 */

import jwt from 'jsonwebtoken';
import { config }     from '../config/env.js';
import { ApiError }   from '../utils/ApiError.js';
import { findById }   from '../repositories/user.repository.js';

export async function protect(req, _res, next) {
  // ── 1. Extract token ────────────────────────────────────────────────────────
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      ApiError.unauthorized('No token provided — include "Authorization: Bearer <token>"'),
    );
  }

  const token = authHeader.slice(7).trim(); // remove "Bearer "

  // ── 2. Verify signature + expiry ────────────────────────────────────────────
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token has expired — please log in again'));
    }
    return next(ApiError.unauthorized('Invalid token'));
  }

  // ── 3. Confirm the user still exists and is active ──────────────────────────
  // We always hit the DB here so deactivated/deleted accounts are blocked
  // immediately rather than waiting for their token to expire.
  const user = await findById(payload.sub);

  if (!user) {
    return next(ApiError.unauthorized('The account belonging to this token no longer exists'));
  }

  if (!user.isActive) {
    return next(ApiError.forbidden('Your account has been deactivated'));
  }

  // ── 4. Attach minimal user identity to the request ──────────────────────────
  req.user = {
    id:   user._id.toString(),
    role: user.role,
  };

  next();
}

/**
 * authorize — role-based access control middleware factory.
 *
 * Must be used AFTER `protect` (which sets req.user).
 *
 * Usage:
 *   router.get('/admin', protect, authorize('platform'), adminCtrl.overview);
 *   router.post('/rules', protect, authorize('company', 'platform'), rulesCtrl.create);
 *
 * @param {...string} roles  One or more allowed roles
 * @returns {import('express').RequestHandler}
 */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Not authenticated'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role "${req.user.role}" is not allowed to access this resource`,
        ),
      );
    }
    next();
  };
}
