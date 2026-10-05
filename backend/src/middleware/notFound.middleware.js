import { AppError } from '../utils/errors.js';

const notFoundMiddleware = (req, res, next) => {
  return next(
    new AppError({
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested resource was not found.',
      statusCode: 404,
      details: {
        method: req.method,
        path: req.originalUrl
      }
    })
  );
};

export {
  notFoundMiddleware
};