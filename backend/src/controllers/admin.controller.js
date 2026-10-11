import * as adminService from "../services/admin.service.js";
import { EmailLog } from "../database/models/emailLog.model.js";
import { findById as findUserById } from "../database/repositories/user.repository.js";

function errorCode(status) {
  const map = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    500: "INTERNAL_ERROR",
  };
  return map[status] ?? "ERROR";
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

export async function getStats(req, res, next) {
  try {
    const data = await adminService.getPlatformStats();
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listUsers(req, res, next) {
  try {
    const data = await adminService.listUsers(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    const data = await adminService.updateUserRole(req.params.id, role);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function toggleUserStatus(req, res, next) {
  try {
    const data = await adminService.toggleUserStatus(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listCompanies(req, res, next) {
  try {
    const data = await adminService.listCompanies();
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getQueuesSummary(req, res, next) {
  try {
    const data = await adminService.getQueuesSummary();
    res.status(200).json({ success: true, data });
  } catch (err) { handleError(err, res, next); }
}

export async function getQueuesDetail(req, res, next) {
  try {
    const data = await adminService.getQueuesDetail();
    res.status(200).json({ success: true, data });
  } catch (err) { handleError(err, res, next); }
}

export async function retryFailedJobs(req, res, next) {
  try {
    const data = await adminService.retryFailedJobs(req.params.queue);
    res.status(200).json({ success: true, data });
  } catch (err) { handleError(err, res, next); }
}

export async function listAllReviews(req, res, next) {
  try {
    const data = await adminService.listAllReviews(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) { handleError(err, res, next); }
}

export async function listAllAuditLogs(req, res, next) {
  try {
    const data = await adminService.listAllAuditLogs(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) { handleError(err, res, next); }
}

export async function listEmailLogs(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const parsedPage = Math.max(Number(page) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    const [logs, total] = await Promise.all([
      EmailLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit).lean(),
      EmailLog.countDocuments(filter),
    ]);
    res.status(200).json({ success: true, data: { logs, total, page: parsedPage, totalPages: Math.ceil(total / parsedLimit) } });
  } catch (err) { handleError(err, res, next); }
}

export async function getPlatformSettings(req, res, next) {
  try {
    const data = adminService.getPlatformSettings();
    res.status(200).json({ success: true, data });
  } catch (err) { handleError(err, res, next); }
}

export async function listAdmins(req, res, next) {
  try {
    const data = await adminService.listAdmins();
    res.status(200).json({ success: true, data });
  } catch (err) { handleError(err, res, next); }
}

export async function promoteToAdmin(req, res, next) {
  try {
    const { userId, reason } = req.body;
    const actorUser = await findUserById(req.user._id || req.user.userId) || req.user;
    const data = await adminService.promoteToAdmin(userId, reason, actorUser);
    res.status(200).json({ success: true, data });
  } catch (err) { handleError(err, res, next); }
}

export async function demoteAdmin(req, res, next) {
  try {
    const { userId, reason } = req.body;
    const actorUser = await findUserById(req.user._id || req.user.userId) || req.user;
    const data = await adminService.demoteAdmin(userId, reason, actorUser);
    res.status(200).json({ success: true, data });
  } catch (err) { handleError(err, res, next); }
}
