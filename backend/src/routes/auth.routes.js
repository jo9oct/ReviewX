/**
 * Auth routes.
 *
 *   POST   /api/v1/auth/register   Register a new account
 *   POST   /api/v1/auth/login      Authenticate and receive a JWT
 *   GET    /api/v1/auth/me         Return the authenticated user's profile
 */

import { Router } from 'express';
import Joi        from 'joi';

import { validate } from '../middleware/validate.js';
import { protect }  from '../middleware/protect.js';
import * as authCtrl from '../controllers/auth.controller.js';

const router = Router();

// ── Validation schemas ────────────────────────────────────────────────────────

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required().messages({
    'string.min':  'Name must be at least 2 characters',
    'string.max':  'Name must be at most 80 characters',
    'any.required': 'Name is required',
  }),

  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),

  password: Joi.string().min(8).max(128).required().messages({
    'string.min':  'Password must be at least 8 characters',
    'any.required': 'Password is required',
  }),

  // Clients cannot self-assign elevated roles via the public API.
  // The field is accepted and stripped — the service always assigns 'member'.
  role: Joi.any().strip(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: { allow: false } }).required().messages({
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

// ── Routes ────────────────────────────────────────────────────────────────────

router.post('/register', validate(registerSchema), authCtrl.register);
router.post('/login',    validate(loginSchema),    authCtrl.login);
router.get('/me',        protect,                  authCtrl.getMe);

export default router;
