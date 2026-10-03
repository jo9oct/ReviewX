import { authenticate } from './authenticate.js';
import { ApiError } from '../utils/ApiError.js';

export const protect = authenticate;
export { authenticate };

/**
 * authorize — role-based access control middleware factory.
 *
 * Must be used AFTER `authenticate`/`protect` (which sets req.user).
 *
 * Usage:
 *   router.get('/admin', protect, authorize('platform'), adminCtrl.overview);
 *   router.post('/rules', protect, authorize('company', 'platform'), rulesCtrl.create);
 *
 * @param {...string} roles  One or more allowed roles
 * @returns {import('express').RequestHandler}
 */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Not authenticated'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role "${req.user.role}" is not allowed to access this resource`,
        ),
      );
    }
    next();
  };
}
