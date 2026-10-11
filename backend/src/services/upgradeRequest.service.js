/**
 * upgradeRequest.service.js
 *
 * Business logic for workspace upgrade requests.
 * Admins and members can ask the company owner to upgrade the subscription.
 */

import { UpgradeRequest } from '../database/models/upgradeRequest.model.js';
import { ApiError }       from '../utils/ApiError.js';

const RATE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Create an upgrade request for a company workspace.
 *
 * Rate-limited: one pending request per user per 24 hours.
 * The owner is notified via email (stub until Resend is wired).
 *
 * @param {string} requesterId
 * @param {string} companyId
 * @param {string} [message]
 */
export async function createUpgradeRequest(requesterId, companyId, message = '') {
  const cutoff = new Date(Date.now() - RATE_LIMIT_MS);

  const existing = await UpgradeRequest.findOne({
    requesterId,
    companyId,
    status: 'pending',
    createdAt: { $gte: cutoff },
  });

  if (existing) {
    throw ApiError.tooManyRequests(
      'You already have a pending upgrade request. Please wait 24 hours before sending another.',
    );
  }

  const record = await UpgradeRequest.create({ requesterId, companyId, message });

  // notifyOwner stub — wire Resend here when the email service is ready
  // await notifyOwner(companyId, requesterId);

  return record;
}

/**
 * List all pending upgrade requests for a company (owner-only).
 *
 * @param {string} companyId
 */
export async function listUpgradeRequests(companyId) {
  return UpgradeRequest.find({ companyId, status: 'pending' })
    .populate('requesterId', 'name email')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Acknowledge (close) an upgrade request (owner-only).
 *
 * @param {string} id         UpgradeRequest _id
 * @param {string} companyId  Ensures the owner can only touch their own company's requests
 */
export async function acknowledgeUpgradeRequest(id, companyId) {
  const record = await UpgradeRequest.findOneAndUpdate(
    { _id: id, companyId, status: 'pending' },
    { $set: { status: 'acknowledged' } },
    { new: true },
  );

  if (!record) {
    throw ApiError.notFound('Upgrade request not found or already acknowledged.');
  }

  return record;
}

/**
 * Check whether the requester has a pending request in the last 24 hours.
 * Returns { exists: boolean, createdAt?: Date }.
 *
 * Used by GET /subscriptions to surface the pending state without a
 * client-side localStorage lock.
 *
 * @param {string} requesterId
 * @param {string} companyId
 */
export async function getPendingRequestStatus(requesterId, companyId) {
  const cutoff = new Date(Date.now() - RATE_LIMIT_MS);

  const pending = await UpgradeRequest.findOne({
    requesterId,
    companyId,
    status: 'pending',
    createdAt: { $gte: cutoff },
  }).lean();

  if (pending) {
    return { exists: true, createdAt: pending.createdAt };
  }
  return { exists: false };
}
