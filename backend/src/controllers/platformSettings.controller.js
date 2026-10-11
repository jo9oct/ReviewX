import * as platformSettingsService from '../services/platformSettings.service.js';
import { findById as findUserById } from '../database/repositories/user.repository.js';

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
    });
  }
  return next(err);
}

export async function getSettings(req, res, next) {
  try {
    const data = await platformSettingsService.getSettings();
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const { section } = req.params;
    const updates = req.body;
    const data = await platformSettingsService.updateSettings(section, updates, req.user);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function sendTestEmail(req, res, next) {
  try {
    // req.user from authenticate only has _id/role — load full user for email
    const fullUser = await findUserById(req.user._id || req.user.userId);
    const data = await platformSettingsService.sendTestEmail(fullUser || req.user);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getIntegrationStatuses(req, res, next) {
  try {
    const data = await platformSettingsService.getIntegrationStatuses();
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}
