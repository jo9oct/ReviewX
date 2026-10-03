import * as adminService from "../services/admin.service.js";

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
