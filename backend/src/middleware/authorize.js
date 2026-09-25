/**
 * authorize — role-based access control middleware factory.
 *
 * Must be used AFTER `authenticate` (which sets req.user).
 *
 * Usage:
 *   router.get('/admin/users',
 *     authenticate,
 *     authorize('platform_admin'),
 *     usersController.list,
 *   );
 *
 *   router.post('/companies/:id/rules',
 *     authenticate,
 *     authorize('company_admin', 'platform_admin'),
 *     rulesController.create,
 *   );
 *
 * @param {...string} allowedRoles  One or more role strings that may access the route
 * @returns {import('express').RequestHandler}
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
          code:    'FORBIDDEN',
        },
      });
    }

    next();
  };
}
