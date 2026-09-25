/**
 * Operational error class.
 *
 * Throw ApiError for expected failure states (validation failures,
 * not-found, unauthorised, etc.). The global error handler checks
 * `isOperational` to decide whether to expose the message to the client
 * or mask it as a generic "Internal Server Error".
 *
 * Usage:
 *   throw new ApiError(404, 'Review not found');
 *   throw new ApiError(422, 'Validation failed', errors);
 */
export class ApiError extends Error {
  /**
   * @param {number}  statusCode  HTTP status code
   * @param {string}  message     Human-readable error message (sent to client)
   * @param {Array}   [errors]    Optional array of field-level validation errors
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name       = 'ApiError';
    this.statusCode = statusCode;
    this.errors     = errors;
    /** Marks this as an expected, handled error — not a bug. */
    this.isOperational = true;

    // Preserve original stack from the call site
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Convenience factories ────────────────────────────────────────────────

  static badRequest(message = 'Bad request', errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Unprocessable entity', errors = []) {
    return new ApiError(422, message, errors);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}
