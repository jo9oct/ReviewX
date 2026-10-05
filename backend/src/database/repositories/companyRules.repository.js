import { CompanyRule } from "../models/companyRule.model.js";

/**
 * Company rules repository — all MongoDB queries for the CompanyRule collection.
 */

export async function findRules({ company, category, enabled }) {
  const query = { company };

  if (category) {
    query.category = category;
  }

  if (typeof enabled === "boolean") {
    query.enabled = enabled;
  }

  return CompanyRule.find(query)
    .sort({ createdAt: -1 })
    .lean()
    .exec();
}

export async function findById(id) {
  return CompanyRule.findById(id).lean().exec();
}

export async function createRule(data) {
  const rule = new CompanyRule(data);
  const saved = await rule.save();
  return saved.toObject ? saved.toObject() : saved;
}

export async function updateRule(id, updates) {
  return CompanyRule.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  )
    .lean()
    .exec();
}

export async function deleteRule(id) {
  return CompanyRule.findByIdAndDelete(id).lean().exec();
}
