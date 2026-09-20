
export class AppError extends Error {
  constructor(
    message,
    {
      statusCode = 500,
      code = "INTERNAL_SERVER_ERROR",
      details = null,
      isOperational = true
    } = {}
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace?.(
      this,
      this.constructor
    );
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request.", details = null) {
    super(message, {
      statusCode: 400,
      code: "BAD_REQUEST",
      details
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.") {
    super(message, {
      statusCode: 401,
      code: "UNAUTHORIZED"
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied.") {
    super(message, {
      statusCode: 403,
      code: "FORBIDDEN"
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super(message, {
      statusCode: 404,
      code: "NOT_FOUND"
    });
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests.") {
    super(message, {
      statusCode: 429,
      code: "RATE_LIMIT_EXCEEDED"
    });
  }
}