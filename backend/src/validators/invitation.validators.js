/**
 * Joi validation schemas for invitation endpoints.
 */

import Joi from 'joi';

const objectId = Joi.string()
  .pattern(/^[a-f\d]{24}$/i)
  .message('{#label} must be a valid ID');

const token = Joi.string()
  .pattern(/^[A-Za-z0-9_-]{20,100}$/)
  .message('Invalid invitation token');

// ── Create invitation (company_admin) ─────────────────────────────────────────

export const createInvitationSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.empty':  'Email is required',
      'string.email':   'Please provide a valid email address',
      'any.required':   'Email is required',
    }),

  // Invitations always grant 'member' (company_admin belongs to the owner).
  // Stripped so stale clients sending a role don't break.
  role: Joi.any().strip(),
  name: Joi.any().strip(),
});

// ── List invitations (query) ──────────────────────────────────────────────────

export const listInvitationsSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'accepted', 'revoked')
    .optional(),
});

// ── Revoke invitation (params) ────────────────────────────────────────────────

export const invitationIdParamSchema = Joi.object({
  id: objectId.required(),
});

// ── Public token params ───────────────────────────────────────────────────────

export const invitationTokenParamSchema = Joi.object({
  token: token.required(),
});

// ── Accept invitation (body) ──────────────────────────────────────────────────

/**
 * New-account branch requires name + password; the existing-account branch
 * sends an empty body (authenticated). The service enforces which is needed.
 */
export const acceptInvitationSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(80)
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must be at most 80 characters',
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .optional()
    .messages({
      'string.min':    'Password must be at least 8 characters',
      'string.max':    'Password must be at most 128 characters',
    }),
});
