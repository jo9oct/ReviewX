/**
 * entitlement.service.js
 *
 * Resolves the "effective" subscription for a workspace, applying:
 *   1. Status degradation (expired / past-due-past-grace → Free limits)
 *   2. Admin custom-limit overrides (written by adminBilling.applyCustomLimits)
 *   3. Feature flags merged from the static tier policy
 *
 * This is the single function every enforcement point should call.
 * If the DB lookup fails it falls back to Free — never to an env var.
 */

import { getSubscription } from './subscription.service.js';
import { getTierPolicy }   from '../access/subscription.service.js';

export const FREE_LIMITS = Object.freeze({
  monthlyReviews:       50,
  aiAssistedReviews:    5,
  linesPerReview:       1000,
  filesPerReview:       50,
  historyRetentionDays: 30,
  seats:                0,
});

/**
 * Returns true if a past_due subscription has exceeded the 3-day grace period.
 */
function isPastGrace(sub) {
  if (sub.status !== 'past_due') return false;
  if (!sub.expiresAt) return true; // no expiry recorded → treat as expired
  const grace = 3 * 24 * 60 * 60 * 1000; // 3 days
  return new Date(sub.expiresAt).getTime() + grace < Date.now();
}

/**
 * Resolve the effective subscription and feature flags for a workspace.
 *
 * @param {{ type: string, userId: string, companyId: string|null }} workspace
 * @returns {Promise<{
 *   sub: object,       the effective subscription (may be degraded to Free)
 *   features: object,  merged feature flags from tier policy + custom overrides
 * }>}
 */
export async function getEffectiveSubscription(workspace) {
  let sub;

  try {
    sub = await getSubscription(workspace);
  } catch (err) {
    // DB failure → fall back to Free, never expose an env-var tier
    console.error(
      '[entitlement] getSubscription failed, falling back to Free:',
      err.message,
    );
    sub = { plan: 'free', status: 'active', ...FREE_LIMITS };
  }

  // ── Status degradation ──────────────────────────────────────────────────
  const degraded =
    sub.status === 'expired' ||
    (sub.status === 'past_due' && isPastGrace(sub));

  if (degraded) {
    // Keep the subscription document's identity fields (_id, userId, companyId)
    // but replace all limit fields with Free defaults.
    sub = { ...sub, plan: 'free', ...FREE_LIMITS };
  }

  // ── Feature flags ───────────────────────────────────────────────────────
  // Start from the static tier policy for the (possibly degraded) plan.
  let basePolicy;
  try {
    basePolicy = getTierPolicy(sub.plan);
  } catch {
    // Unrecognised plan → Free policy
    basePolicy = getTierPolicy('free');
  }

  // Admin custom overrides: the billing module can write feature flags into
  // sub.customLimits.features, which take precedence over the static policy.
  const features = {
    ...basePolicy,
    ...(sub.customLimits?.features ?? {}),
  };

  return { sub, features };
}
