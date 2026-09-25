/**
 * 404 handler — must be registered AFTER all routes.
 *
 * If a request reaches this middleware no route matched it.
 * Passes a 404 ApiError to the global error handler so the
 * response format stays consistent with all other errors.
 */

import { ApiError } from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
