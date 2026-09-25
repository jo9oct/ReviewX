/**
 * Joi validation schemas for auth endpoints.
 *
 * Kept separate from routes so they can be independently tested
 * and reused across different route files if needed.
 */

import Joi from 'joi';

// ── Register ──────────────────────────────────────────────────────────────────

export const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(80)
    .required()
    .messages({
      'string.empty':  'Name is required',
      'string.min':    'Name must be at least 2 characters',
      'string.max':    'Name must be at most 80 characters',
      'any.required':  'Name is required',
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.empty':  'Email is required',
      'string.email':  'Please provide a valid email address',
      'any.required':  'Email is required',
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.empty':  'Password is required',
      'string.min':    'Password must be at least 8 characters',
      'string.max':    'Password must be at most 128 characters',
      'any.required':  'Password is required',
    }),

  /**
   * Optional company ID — a new user can be pre-associated with a company
   * at registration time (e.g. via an invite link that carries a companyId).
   * The service validates that the company actually exists.
   */
  companyId: Joi.string()
    .pattern(/^[a-f\d]{24}$/i, 'MongoDB ObjectId')
    .optional()
    .messages({
      'string.pattern.name': 'companyId must be a valid ID',
    }),

  // Role is intentionally NOT accepted — always defaults to 'member'.
  // Stripping it here prevents any client from escalating privileges.
  role: Joi.any().strip(),
});

// ── Login ─────────────────────────────────────────────────────────────────────

export const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.empty':  'Email is required',
      'string.email':  'Please provide a valid email address',
      'any.required':  'Email is required',
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty':  'Password is required',
      'any.required':  'Password is required',
    }),
});
