/**
 * authenticate — JWT verification middleware.
 *
 * Reads the `Authorization: Bearer <token>` header, verifies the JWT,
 * confirms the user still exists in the database (so deleted/deactivated
 * accounts are blocked before their token expires), and attaches a
 * lightweight identity object to `req.user`:
 *
 *   req.user = { id: string, role: string }
 *
 * Errors use the standard { error: { message, code } } response shape.
 *
 * Usage:
 *   router.get('/me', authenticate, authController.getMe);
 */

import jwt            from 'jsonwebtoken';
import { config }     from '../config/env.js';
import { findById }   from '../repositories/user.repository.js';

function authError(res, message, code = 'UNAUTHORIZED') {
  return res.status(401).json({ error: { message, code } });
}

export async function authenticate(req, res, next) {
  // ── 1. Extract the Bearer token ────────────────────────────────────────────
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return authError(res, 'No token provided. Include "Authorization: Bearer <token>"');
  }

  const token = authHeader.slice(7).trim();

  // ── 2. Verify signature and expiry ─────────────────────────────────────────
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return authError(res, 'Token has expired — please log in again', 'TOKEN_EXPIRED');
    }
    return authError(res, 'Invalid token', 'INVALID_TOKEN');
  }

  // ── 3. Confirm the user still exists and is active ─────────────────────────
  // payload.userId is set by signToken() in auth.service.js
  const user = await findById(payload.userId);

  if (!user) {
    return authError(
      res,
      'The account associated with this token no longer exists',
      'USER_NOT_FOUND',
    );
  }

  if (!user.isActive) {
    return res.status(403).json({
      error: { message: 'Your account has been deactivated', code: 'ACCOUNT_DISABLED' },
    });
  }

  // ── 4. Attach identity to the request ──────────────────────────────────────
  req.user = {
    id:   user._id.toString(),
    role: user.role,
  };

  next();
}
