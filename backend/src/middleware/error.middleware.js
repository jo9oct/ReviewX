import { createResponse } from '../utils/response.js';

const errorMiddleware = (
  error,
  req,
  res,
  next,
) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode =
    Number.isInteger(
      error?.statusCode,
    ) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  const code =
    typeof error?.code === 'string'
      ? error.code
      : 'INTERNAL_SERVER_ERROR';

  const message =
    statusCode >= 500
      ? 'An internal server error occurred.'
      : error.message ||
        'The request could not be processed.';

  if (statusCode >= 500) {
    process.stderr.write(
      `[${req.requestId || 'unknown-request'}] ${code}: ${
        error?.stack ||
        error?.message ||
        String(error)
      }\n`,
    );
  }

  const errorResponse = {
    code,
    message,
  };

  if (
    statusCode < 500 &&
    Array.isArray(error?.details)
  ) {
    errorResponse.details =
      error.details;
  }

  return res
    .status(statusCode)
    .json(
      createResponse({
        success: false,

        error:
          errorResponse,

        meta: {
          requestId:
            req.requestId,
        },
      }),
    );
};

export {
  errorMiddleware,
};