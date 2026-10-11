/**
 * usage.service.js
 *
 * Single source of truth for workspace usage counts.
 * Used by both the subscription endpoint (display) and the enforcement
 * middleware (limit checks) so the bar never says "3 of 10" while the
 * backend blocks the user at a different number.
 */

import { Review } from '../database/models/review.model.js';
import { User } from '../database/models/user.model.js';

/**
 * Count completed and AI-assisted reviews for a workspace in its current
 * billing period, and count active seats.
 *
 * @param {{ type: 'personal'|'company', userId: string, companyId: string|null }} workspace
 * @param {object} subscription  The subscription document (from getSubscription)
 * @returns {Promise<{
 *   reviews:   { used: number, limit: number|null },
 *   aiReviews: { used: number, limit: number|null },
 *   seats:     { used: number, limit: number|null },
 *   periodStart: string,
 *   periodEnd:   string,
 * }>}
 */
export async function getWorkspaceUsage(workspace, subscription) {
  // ── Billing period ──────────────────────────────────────────────────────
  const periodStart = subscription?.startedAt
    ? new Date(subscription.startedAt)
    : (() => {
        // Calendar-month fallback (e.g. Free with no explicit start date)
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
      })();

  const now = new Date();
  const periodEnd =
    subscription?.expiresAt && new Date(subscription.expiresAt) > now
      ? new Date(subscription.expiresAt)
      : now;

  // ── Base review filter ──────────────────────────────────────────────────
  const baseFilter = {
    status: 'completed',
    createdAt: { $gte: periodStart, $lte: periodEnd },
  };

  if (workspace.type === 'company') {
    baseFilter.company = workspace.companyId;
  } else {
    baseFilter.user = workspace.userId;
    baseFilter.company = null;
  }

  // ── Counts (parallel) ──────────────────────────────────────────────────
  const [reviews, aiReviews, seats] = await Promise.all([
    Review.countDocuments(baseFilter),
    Review.countDocuments({ ...baseFilter, hasAiAnalysis: true }),
    workspace.type === 'company'
      ? User.countDocuments({ company: workspace.companyId, isActive: true })
      : Promise.resolve(1),
  ]);

  // ── Limits ─────────────────────────────────────────────────────────────
  const reviewLimit    = subscription?.monthlyReviews    ?? 50;
  const aiLimit        = subscription?.aiAssistedReviews ?? 5;
  const rawSeatLimit   = subscription?.seats             ?? 0;
  // seats === 0 means "no seat limit" (personal plans) — surface as null
  const seatLimit      = rawSeatLimit === 0 ? null : rawSeatLimit;

  return {
    reviews:   { used: reviews,   limit: reviewLimit },
    aiReviews: { used: aiReviews, limit: aiLimit     },
    seats:     { used: seats,     limit: seatLimit   },
    periodStart: periodStart.toISOString(),
    periodEnd:   periodEnd.toISOString(),
  };
}
