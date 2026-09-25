/**
 * Auth routes — mounted at /api/auth
 *
 *   POST  /api/auth/register   Create a new member account
 *   POST  /api/auth/login      Authenticate and receive a JWT
 *   GET   /api/auth/me         Return the authenticated user's profile
 */

import { Router }    from 'express';
import rateLimit     from 'express-rate-limit';

import { validate }       from '../middleware/validate.js';
import { authenticate }   from '../middleware/authenticate.js';
import { registerSchema, loginSchema } from '../validators/authValidators.js';
import * as authCtrl      from '../controllers/authController.js';

const router = Router();

// ── Auth-specific stricter rate limiter ───────────────────────────────────────
// Tighter than the global limiter (security.js) — slows brute-force attacks
// on login and prevents automated bulk registration.
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,  // 15-minute window
  max:             20,               // 20 attempts per window per IP
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message: {
    error: {
      message: 'Too many authentication attempts — please try again in 15 minutes.',
      code:    'RATE_LIMITED',
    },
  },
  // Skip in test environment so tests don't get blocked
  skip: () => process.env.NODE_ENV === 'test',
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Public. Validates body with Joi, then creates the account.
 */
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authCtrl.register,
);

/**
 * POST /api/auth/login
 * Public. Validates body, verifies credentials, returns JWT.
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authCtrl.login,
);

/**
 * GET /api/auth/me
 * Protected. Returns the user attached by the authenticate middleware.
 */
router.get(
  '/me',
  authenticate,
  authCtrl.getMe,
);

export default router;
