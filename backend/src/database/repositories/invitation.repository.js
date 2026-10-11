/**
 * Invitation repository — all direct MongoDB interactions for the Invitation collection.
 *
 * The service layer never imports the Invitation model directly.
 *
 * The accept flow uses `markAccepted` / `markRevoked` with a status guard so
 * a token can only be consumed once, even under concurrent requests.
 */

import { Invitation } from '../models/invitation.model.js';

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * Find a pending invitation by token hash.
 *
 * @param {string} tokenHash
 * @returns {Promise<object|null>}
 */
export async function findByTokenHash(tokenHash) {
  return Invitation.findOne({ tokenHash }).lean().exec();
}

/**
 * Find a pending invitation for an email within a company.
 *
 * @param {string} companyId
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function findPending(companyId, email) {
  return Invitation.findOne({
    company: companyId,
    email:    email.toLowerCase().trim(),
    status:   'pending',
  }).lean().exec();
}

/**
 * List invitations for a company (newest first).
 *
 * @param {string} companyId
 * @param {object} [filter]  e.g. { status: 'pending' }
 * @returns {Promise<object[]>}
 */
export async function listByCompany(companyId, filter = {}) {
  return Invitation.find({ company: companyId, ...filter })
    .sort({ createdAt: -1 })
    .select('-tokenHash')
    .lean()
    .exec();
}

/**
 * Get a single invitation by id, scoped to a company.
 *
 * @param {string} id
 * @param {string} companyId
 * @returns {Promise<object|null>}
 */
export async function findById(id, companyId) {
  return Invitation.findOne({ _id: id, company: companyId })
    .select('-tokenHash')
    .lean()
    .exec();
}

// ── Writes ────────────────────────────────────────────────────────────────────

/**
 * Create an invitation.
 *
 * @param {object} data  { email, company, role, invitedBy, tokenHash, expiresAt }
 * @returns {Promise<object>}
 */
export async function create(data) {
  const doc = await Invitation.create(data);
  const obj = doc.toObject();
  delete obj.tokenHash;
  return obj;
}

/**
 * Atomically consume a pending invitation (single-use guard).
 *
 * Only transitions pending → accepted when not yet expired.
 *
 * @param {string} id
 * @param {string} userId  The user who accepted
 * @returns {Promise<object|null>}  Updated invitation, or null if the guard failed
 *                                  (already accepted/revoked/expired).
 */
export async function markAccepted(id, userId) {
  const doc = await Invitation.findOneAndUpdate(
    {
      _id:       id,
      status:    'pending',
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        status:      'accepted',
        acceptedAt:  new Date(),
        acceptedBy:  userId,
      },
    },
    { new: true },
  ).lean().exec();

  if (doc) {
    delete doc.tokenHash;
  }
  return doc;
}

/**
 * Atomically revoke a pending invitation.
 *
 * @param {string} id
 * @param {string} companyId
 * @returns {Promise<object|null>}  Updated invitation, or null if not pending.
 */
export async function markRevoked(id, companyId) {
  const doc = await Invitation.findOneAndUpdate(
    { _id: id, company: companyId, status: 'pending' },
    { $set: { status: 'revoked' } },
    { new: true },
  ).lean().exec();

  if (doc) {
    delete doc.tokenHash;
  }
  return doc;
}

/**
 * Delete all pending invitations for an email in a company (used when
 * re-inviting so only the newest token stays live).
 *
 * @param {string} companyId
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function deletePendingForEmail(companyId, email) {
  await Invitation.deleteMany({
    company: companyId,
    email:    email.toLowerCase().trim(),
    status:   'pending',
  }).exec();
}
