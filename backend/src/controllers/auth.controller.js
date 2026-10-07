/**
 * Auth controller — HTTP layer only.
 * Delegates business logic to auth.service.js and formats HTTP responses.
 */
import * as authService from '../services/auth.service.js';

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

function handleError(err, res, next) {
  if (err.isOperational) {
    const code = errorCode(err.statusCode);
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code },
      ...(err.errors?.length && { errors: err.errors }),
    });
  }
  return next(err);
}

export async function register(req, res, next) {
  try {
    const payload = await authService.register(req.body);
    res.status(201).json({ success: true, data: payload });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function login(req, res, next) {
  try {
    const payload = await authService.login(req.body);
    res.status(200).json({ success: true, data: payload });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id || req.user.userId);
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    handleError(err, res, next);
  }
}
