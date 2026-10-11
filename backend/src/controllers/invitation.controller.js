/**
 * Invitation controller — HTTP layer only.
 * Delegates business logic to invitation.service.js and formats HTTP responses.
 */

import * as invitationService from '../services/invitation.service.js';

function errorCode(status) {
  const map = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    500: 'INTERNAL_ERROR',
  };
  return map[status] ?? 'ERROR';
}

function handleError(err, res, next) {
  if (err.isOperational || err.statusCode) {
    const status = err.statusCode || 500;
    const code = err.code || errorCode(status);
    return res.status(status).json({
      success: false,
      error: { message: err.message, code },
      ...(err.errors?.length && { errors: err.errors }),
      ...(err.details && { details: err.details }),
    });
  }
  return next(err);
}

// ── Company-scoped management (company_admin) ────────────────────────────────

export async function createInvitation(req, res, next) {
  try {
    const result = await invitationService.createInvitation(req.user, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listInvitations(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query ?? {};
    const invitations = await invitationService.listInvitations(
      req.user,
      query.status ? { status: query.status } : {},
    );
    res.status(200).json({ success: true, data: invitations });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function revokeInvitation(req, res, next) {
  try {
    const invitation = await invitationService.revokeInvitation(
      req.user,
      req.params.id,
    );
    res.status(200).json({ success: true, data: invitation });
  } catch (err) {
    handleError(err, res, next);
  }
}

// ── Public token endpoints ───────────────────────────────────────────────────

export async function getInvitationInfo(req, res, next) {
  try {
    const info = await invitationService.getInvitationInfo(req.params.token);
    res.status(200).json({ success: true, data: info });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function acceptInvitation(req, res, next) {
  try {
    const payload = await invitationService.acceptInvitation(
      req.params.token,
      {
        user:     req.user ?? null,
        name:     req.body?.name,
        password: req.body?.password,
      },
    );
    res.status(201).json({ success: true, data: payload });
  } catch (err) {
    handleError(err, res, next);
  }
}
