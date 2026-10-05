import * as companyRulesService from "../services/companyRules.service.js";

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

export async function listRules(req, res, next) {
  try {
    const rules = await companyRulesService.getCompanyRules(req.user, req.query);
    res.status(200).json({ success: true, data: rules });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getRuleById(req, res, next) {
  try {
    const rule = await companyRulesService.getCompanyRuleById(req.user, req.params.id);
    res.status(200).json({ success: true, data: rule });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function createRule(req, res, next) {
  try {
    const rule = await companyRulesService.createCompanyRule(req.user, req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function updateRule(req, res, next) {
  try {
    const rule = await companyRulesService.updateCompanyRule(
      req.user,
      req.params.id,
      req.body
    );
    res.status(200).json({ success: true, data: rule });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function toggleRule(req, res, next) {
  try {
    const rule = await companyRulesService.toggleCompanyRule(req.user, req.params.id);
    res.status(200).json({ success: true, data: rule });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function deleteRule(req, res, next) {
  try {
    const result = await companyRulesService.deleteCompanyRule(req.user, req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}
