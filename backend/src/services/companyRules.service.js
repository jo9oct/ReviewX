import { ApiError } from "../utils/ApiError.js";
import * as companyRulesRepo from "../database/repositories/companyRules.repository.js";

function assertAdminRole(user) {
  const allowed = ["company_admin", "platform_admin"];
  if (!user || !allowed.includes(user.role)) {
    throw ApiError.forbidden("Access denied. Admin privileges required.");
  }
}

function assertCompanyOwnership(rule, user) {
  if (!rule) {
    throw ApiError.notFound("Company rule not found");
  }

  const userCompanyId = user?.company ? user.company.toString() : null;
  const ruleCompanyId = rule?.company ? rule.company.toString() : null;

  if (!userCompanyId || ruleCompanyId !== userCompanyId) {
    // 404 if not found or belongs to a different company — don't leak existence with a 403
    throw ApiError.notFound("Company rule not found");
  }
}

export async function getCompanyRules(user, query = {}) {
  const userCompanyId = user?.company ? user.company.toString() : null;
  if (!userCompanyId) {
    return [];
  }

  const filter = { company: userCompanyId };

  if (query.category) {
    filter.category = query.category;
  }

  if (query.enabled !== undefined) {
    if (query.enabled === "true" || query.enabled === true) {
      filter.enabled = true;
    } else if (query.enabled === "false" || query.enabled === false) {
      filter.enabled = false;
    }
  }

  return companyRulesRepo.findRules(filter);
}

export async function getCompanyRuleById(user, id) {
  const rule = await companyRulesRepo.findById(id);
  assertCompanyOwnership(rule, user);
  return rule;
}

export async function createCompanyRule(user, data) {
  assertAdminRole(user);

  const userCompanyId = user?.company ? user.company.toString() : null;
  if (!userCompanyId) {
    throw ApiError.badRequest("User must be associated with a company to create rules");
  }

  const payload = {
    company: userCompanyId,
    createdBy: user._id || user.id || user.userId,
    name: data.name,
    category: data.category,
    description: data.description,
    ruleText: data.ruleText,
    severity: data.severity,
    enabled: typeof data.enabled === "boolean" ? data.enabled : true,
  };

  return companyRulesRepo.createRule(payload);
}

export async function updateCompanyRule(user, id, data) {
  assertAdminRole(user);

  const rule = await companyRulesRepo.findById(id);
  assertCompanyOwnership(rule, user);

  const allowedUpdates = {};
  if (data.name !== undefined) allowedUpdates.name = data.name;
  if (data.category !== undefined) allowedUpdates.category = data.category;
  if (data.description !== undefined) allowedUpdates.description = data.description;
  if (data.ruleText !== undefined) allowedUpdates.ruleText = data.ruleText;
  if (data.severity !== undefined) allowedUpdates.severity = data.severity;
  if (data.enabled !== undefined) allowedUpdates.enabled = data.enabled;

  return companyRulesRepo.updateRule(id, allowedUpdates);
}

export async function toggleCompanyRule(user, id) {
  assertAdminRole(user);

  const rule = await companyRulesRepo.findById(id);
  assertCompanyOwnership(rule, user);

  return companyRulesRepo.updateRule(id, { enabled: !rule.enabled });
}

export async function deleteCompanyRule(user, id) {
  assertAdminRole(user);

  const rule = await companyRulesRepo.findById(id);
  assertCompanyOwnership(rule, user);

  await companyRulesRepo.deleteRule(id);
  return { id, deleted: true };
}
