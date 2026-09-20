import {
  AppError
} from "../utils/errors.js";

import {
  errorResponse
} from "../utils/response.js";

import {
  logger
} from "../utils/logger.js";

export function errorHandler(
  error,
  req,
  res,
  _next
) {
  const isOperational =
    error instanceof AppError &&
    error.isOperational;

  const statusCode =
    error instanceof AppError
      ? error.statusCode
      : 500;

  const code =
    error instanceof AppError
      ? error.code
      : "INTERNAL_SERVER_ERROR";

  const message =
    isOperational
      ? error.message
      : "An unexpected error occurred.";

  if (!isOperational) {
    logger.error(
      "Unhandled application error",
      {
        requestId:
          req.requestId,

        method:
          req.method,

        path:
          req.originalUrl,

        error:
          error.message,

        stack:
          error.stack
      }
    );
  } else {
    logger.warn(
      "Operational request error",
      {
        requestId:
          req.requestId,

        method:
          req.method,

        path:
          req.originalUrl,

        code,

        message
      }
    );
  }

  if (res.headersSent) {
    return;
  }

  return res.status(
    statusCode
  ).json(
    errorResponse({
      message,
      code,
      requestId:
        req.requestId,
      details:
        isOperational
          ? error.details
          : null
    })
  );
}