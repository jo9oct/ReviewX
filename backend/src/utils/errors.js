class AppError extends Error {
  constructor({
    code,
    message,
    statusCode = 500,
    details = undefined,
    cause = undefined
  }) {
    super(message, { cause });

    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    Error.captureStackTrace?.(this, AppError);
  }
}

const isOperationalError = (error) => {
  return error instanceof AppError;
};

export {
  AppError,
  isOperationalError
};