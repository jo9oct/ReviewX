import { AppError } from '../utils/errors.js';

const validationMiddleware = (schema, source = 'body') => {
  return (req, res, next) => {
    if (!schema || typeof schema.validate !== 'function') {
      return next(
        new AppError({
          code: 'VALIDATION_SCHEMA_INVALID',
          message: 'The request validation schema is invalid.',
          statusCode: 500
        })
      );
    }

    const input = req[source];

    const result = schema.validate(input, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: false
    });

    if (result.error) {
      return next(
        new AppError({
          code: 'REQUEST_VALIDATION_FAILED',
          message: 'The request contains invalid data.',
          statusCode: 400,
          details: result.error.details.map((detail) => ({
            path: detail.path,
            message: detail.message,
            type: detail.type
          }))
        })
      );
    }

    req[source] = result.value;

    return next();
  };
};

export {
  validationMiddleware
};