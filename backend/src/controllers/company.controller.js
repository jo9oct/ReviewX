import * as companyService from "../services/company.service.js";

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

export async function listMembers(req, res, next) {
  try {
    const members = await companyService.getCompanyMembers(req.user);
    res.status(200).json({ success: true, data: members });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getCompanyProfile(req, res, next) {
  try {
    const company = await companyService.getCompanyProfile(req.user);
    res.status(200).json({ success: true, data: company });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function updateCompanyProfile(req, res, next) {
  try {
    const company = await companyService.updateCompanyProfile(req.user, req.body);
    res.status(200).json({ success: true, data: company });
  } catch (err) {
    handleError(err, res, next);
  }
}
