/**
 * Auth controller — HTTP layer only.
 *
 * Receives validated request bodies (Joi middleware already ran),
 * delegates ALL logic to authService, and formats HTTP responses.
 *
 * Error shape across all endpoints:
 *   { error: { message: string, code: string } }
 *
 * Success shape:
 *   { data: { token, expiresIn, user } }   — register / login
 *   { data: { user } }                      — GET /me
 */

import * as authService from '../services/auth.service.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Map an ApiError (or any Error) to the standard error envelope.
 */
function handleError(err, res) {
  if (err.isOperational) {
    const code = errorCode(err.statusCode);
    return res.status(err.statusCode).json({
      error: { message: err.message, code },
      // Include field-level detail for validation errors
      ...(err.errors?.length && { errors: err.errors }),
    });
  }
  // Unknown / programming error — don't leak internals
  console.error('[AuthController] Unexpected error:', err);
  return res.status(500).json({
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
  });
}

function errorCode(status) {
  const map = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    500: 'INTERNAL_ERROR',
  };
  return map[status] ?? 'ERROR';
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 *
 * Body (validated): { name, email, password, companyId? }
 */
export async function register(req, res) {
  try {
    const payload = await authService.register(req.body);
    res.status(201).json({ data: payload });
  } catch (err) {
    handleError(err, res);
  }
}

/**
 * POST /api/auth/login
 *
 * Body (validated): { email, password }
 */
export async function login(req, res) {
  try {
    const payload = await authService.login(req.body);
    res.status(200).json({ data: payload });
  } catch (err) {
    handleError(err, res);
  }
}

/**
 * GET /api/auth/me
 *
 * Requires: valid Bearer token (authenticate middleware runs first).
 */
export async function getMe(req, res) {
  try {
    const user = await authService.getMe(req.user.id);
    res.status(200).json({ data: { user } });
  } catch (err) {
    handleError(err, res);
  }
}
