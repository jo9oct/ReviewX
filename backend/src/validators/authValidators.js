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
   * Which signup path the user is taking:
   *   individual     → plain member account, no company
   *   company_owner  → creates a Company and becomes its company_admin
   *
   * companyName is only required (and only accepted) for company_owner.
   */
  accountType: Joi.string()
    .valid('individual', 'company_owner')
    .default('individual')
    .messages({
      'any.only': 'accountType must be "individual" or "company_owner"',
    }),

  companyName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .when('accountType', {
      is: 'company_owner',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'any.required': 'Company name is required to create a company',
      'string.min':   'Company name must be at least 2 characters',
      'string.max':   'Company name must be at most 100 characters',
      'any.forbidden': 'companyName is only valid when accountType is "company_owner"',
    }),

  // Role is intentionally NOT accepted — service derives it from accountType.
  // Stripping it here prevents any client from escalating privileges.
  role: Joi.any().strip(),

  // Legacy field (invite links now use the Invitation collection).
  // Stripped so old clients don't trigger unknown-field errors.
  companyId: Joi.any().strip(),
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
