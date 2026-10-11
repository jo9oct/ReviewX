/**
 * Company repository — all direct MongoDB interactions for the Company collection.
 *
 * The service layer never imports the Company model directly.
 */

import { Company } from '../models/company.model.js';

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * Find a company by id.
 *
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function findById(id) {
  return Company.findById(id).lean().exec();
}

/**
 * Find a company by slug.
 *
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
export async function findBySlug(slug) {
  return Company.findOne({ slug }).lean().exec();
}

/**
 * List all companies.
 *
 * @returns {Promise<object[]>}
 */
export async function findAll() {
  return Company.find().sort({ createdAt: 1 }).lean().exec();
}

// ── Writes ────────────────────────────────────────────────────────────────────

/**
 * Create a company.
 *
 * @param {object} data  { name, slug, owner }
 * @returns {Promise<object>}
 */
export async function create(data) {
  const doc = await Company.create(data);
  return doc.toObject();
}
