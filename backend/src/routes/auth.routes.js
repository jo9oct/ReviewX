/**
 * Auth routes — mounted under /auth.
 *
 *   POST  /register   Create a new member account
 *   POST  /login      Authenticate and receive a JWT
 *   GET   /me         Return the authenticated user's profile
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { registerSchema, loginSchema } from '../validators/authValidators.js';
import * as authCtrl from '../controllers/auth.controller.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts — please try again in 15 minutes.',
      code: 'RATE_LIMITED',
    },
  },
  skip: () => process.env.NODE_ENV === 'test',
});

router.post('/register', authLimiter, validate(registerSchema), authCtrl.register);
router.post('/login', authLimiter, validate(loginSchema), authCtrl.login);
router.get('/me', authenticate, authCtrl.getMe);

export default router;
