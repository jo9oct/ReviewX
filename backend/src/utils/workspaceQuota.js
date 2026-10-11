/**
 * workspaceQuota.js
 *
 * Lightweight MongoDB-backed atomic counter for monthly review quota.
 *
 * One document per workspace per billing month (keyed by a string like
 * `company:<id>:2026-10` or `user:<id>:2026-10`).
 *
 * `atomicIncrementQuota` increments the counter only if it is below the
 * subscription limit, preventing two concurrent requests from both passing
 * at the last available slot.
 *
 * `decrementQuota` is called in the catch branch of a failed review so that
 * a review that errors out does not consume a quota slot.
 */

import mongoose from 'mongoose';

const quotaSchema = new mongoose.Schema(
  {
    key:   { type: String, required: true, unique: true, index: true },
    count: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export const WorkspaceQuota =
  mongoose.models.WorkspaceQuota ||
  mongoose.model('WorkspaceQuota', quotaSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────

function quotaKey(workspace) {
  const now    = new Date();
  const yyyymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return workspace.type === 'company'
    ? `company:${workspace.companyId}:${yyyymm}`
    : `user:${workspace.userId}:${yyyymm}`;
}

/**
 * Atomically increment the quota counter for this workspace/month.
 *
 * Throws an AppError (code MONTHLY_REVIEW_LIMIT_REACHED, status 429) if
 * the current count already equals or exceeds the subscription limit.
 *
 * @param {{ type, userId, companyId }} workspace
 * @param {object} subscription  must have monthlyReviews
 * @returns {Promise<object>}  the updated quota document
 */
export async function atomicIncrementQuota(workspace, subscription) {
  const { AppError } = await import('../utils/errors.js');

  const key   = quotaKey(workspace);
  const limit = subscription?.monthlyReviews ?? 50;

  // findOneAndUpdate with a conditional filter: only matches when count < limit.
  // upsert: true — creates the document (count starts at 0) if it doesn't exist,
  //   then the $inc runs because 0 < limit.
  const result = await WorkspaceQuota.findOneAndUpdate(
    { key, count: { $lt: limit } },
    { $inc: { count: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  if (!result) {
    throw new AppError({
      code:       'MONTHLY_REVIEW_LIMIT_REACHED',
      message:    'You have used all available reviews for this billing period.',
      statusCode: 429,
      details: { limit },
    });
  }

  return result;
}

/**
 * Decrement the quota counter after a failed review so the slot is freed.
 * Silently no-ops if the document does not exist.
 *
 * @param {{ type, userId, companyId }} workspace
 */
export async function decrementQuota(workspace) {
  const key = quotaKey(workspace);
  await WorkspaceQuota.findOneAndUpdate(
    { key, count: { $gt: 0 } },
    { $inc: { count: -1 } },
  ).catch(() => {});
}
