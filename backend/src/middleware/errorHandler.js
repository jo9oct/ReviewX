/**
 * Global error-handling middleware.
 *
 * Must be registered LAST in the middleware chain (after routes and notFound).
 * Express identifies error handlers by their 4-argument signature: (err, req, res, next).
 *
 * Strategy:
 *   - ApiError (isOperational = true)  → expose the message + details to the client
 *   - Mongoose ValidationError         → map to 422 with field-level detail
 *   - Mongoose CastError (bad ObjectId) → map to 400
 *   - Mongoose duplicate key (11000)   → map to 409 Conflict
 *   - Everything else                  → 500, hide internals in production
 */

import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { logger }   from '../utils/logger.js';
import { config }   from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode ?? 500;
  let message    = err.message   ?? 'Internal server error';
  let errors     = err.errors    ?? [];

  // ── Mongoose: document validation failed ─────────────────────────────────
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    message    = 'Validation failed';
    errors     = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
  }

  // ── Mongoose: invalid ObjectId (e.g. /reviews/not-an-id) ─────────────────
  else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message    = `Invalid value for field "${err.path}": "${err.value}"`;
  }

  // ── MongoDB: duplicate unique key ─────────────────────────────────────────
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    message    = `A record with that ${field} already exists`;
  }

  // ── Unknown / programming errors → 500 ───────────────────────────────────
  else if (!err.isOperational) {
    statusCode = 500;
    // Never leak internal error details to the client in production
    if (config.isProd) {
      message = 'Internal server error';
      errors  = [];
    }
    // Log the full stack for non-operational errors — these are bugs
    logger.error('Unhandled error', err.stack ?? err.message);
  }

  // Log operational errors at warn level (expected), unknowns at error level
  if (err.isOperational) {
    logger.warn(`[${statusCode}] ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error:   message,
    ...(errors.length > 0 && { errors }),
    // Include stack trace only in dev for debugging convenience
    ...(config.isDev && !err.isOperational && { stack: err.stack }),
  });
}
