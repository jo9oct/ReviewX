export function successResponse({
  data = null,
  message = "Request successful.",
  requestId = null,
  meta = null
} = {}) {
  const response = {
    success: true,
    message,
    data
  };

  if (requestId) {
    response.requestId = requestId;
  }

  if (meta) {
    response.meta = meta;
  }

  return response;
}

export function errorResponse({
  message = "An unexpected error occurred.",
  code = "INTERNAL_SERVER_ERROR",
  requestId = null,
  details = null
} = {}) {
  const response = {
    success: false,
    error: {
      code,
      message
    }
  };

  if (details) {
    response.error.details = details;
  }

  if (requestId) {
    response.requestId = requestId;
  }

  return response;
}

export function sendSuccess(
  res,
  data = null,
  statusCode = 200
) {
  return res
    .status(statusCode)
    .json(
      successResponse({
        data
      })
    );
}