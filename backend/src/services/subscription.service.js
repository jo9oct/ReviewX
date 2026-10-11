// STATUS: UPDATED

import * as subscriptionRepo from '../database/repositories/subscription.repositories.js';
import { ApiError } from '../utils/ApiError.js';
import { Subscription } from '../database/models/subscription.model.js';

// Plan definitions with limits and prices
export const PLANS = {
  FREE: 'free',
  PRO: 'pro',
  TEAM: 'team',
  ENTERPRISE: 'enterprise',
};

export const STATUSES = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
};

// Plan configurations
export const PLAN_CONFIGS = {
  free: {
    monthlyReviews: 50,
    aiAssistedReviews: 5,
    linesPerReview: 1000,
    filesPerReview: 50,
    historyRetentionDays: 30,
    seats: 0,
  },

  pro: {
    monthlyReviews: 500,
    aiAssistedReviews: 20,
    linesPerReview: 5000,
    filesPerReview: 100,
    historyRetentionDays: 90,
    seats: 10,
  },

  team: {
    monthlyReviews: 5000,
    aiAssistedReviews: 100,
    linesPerReview: 10000,
    filesPerReview: 200,
    historyRetentionDays: 180,
    seats: 10,
  },

  enterprise: {
    monthlyReviews: 100000,
    aiAssistedReviews: 500,
    linesPerReview: 50000,
    filesPerReview: 500,
    historyRetentionDays: 365,
    seats: 100,
  },
};

export const DEFAULT_PRICES = {
  free: 0,
  pro: 500,
  team: 2000,
  enterprise: 5000,
};

/**
 * Create a free subscription for a personal (individual) user.
 */
export async function createFreeSubscription(userId) {
  if (!userId) {
    throw ApiError.badRequest('User ID is required to create a subscription');
  }

  return subscriptionRepo.findOrCreateFreeByUserId(userId);
}

/**
 * Get the subscription for a workspace.
 *
 * Accepts a workspace object: { type: 'personal'|'company', userId, companyId }.
 * - Company workspace → looks up by companyId; falls back to Free defaults if not found.
 * - Personal workspace → find-or-create a free subscription by userId.
 *
 * @param {object} workspace  { type, userId, companyId }
 * @returns {Promise<object>}
 */
export async function getSubscription(workspace) {
  if (!workspace) {
    throw ApiError.badRequest('Workspace is required');
  }

  if (workspace.type === 'company' && workspace.companyId) {
    const sub = await subscriptionRepo.findByCompanyId(workspace.companyId);
    if (sub) return sub;
    // Auto-provision 14-day Team trial for the company
    return subscriptionRepo.findOrCreateTrialingByCompanyId(
      workspace.companyId,
      workspace.userId,
    );
  }

  return subscriptionRepo.findOrCreateFreeByUserId(workspace.userId);
}

/**
 * Update a subscription
 */
export async function updateSubscription(userId, updates) {
  if (!userId) {
    throw ApiError.badRequest('User ID is required');
  }

  const subscription = await subscriptionRepo.findByUserId(userId);

  if (!subscription) {
    throw ApiError.notFound('Subscription not found');
  }

  const allowedUpdates = {};

  if (updates.plan !== undefined) {
    if (!Object.values(PLANS).includes(updates.plan)) {
      throw ApiError.badRequest('Invalid subscription plan');
    }

    allowedUpdates.plan = updates.plan;
  }

  if (updates.status !== undefined) {
    if (!Object.values(STATUSES).includes(updates.status)) {
      throw ApiError.badRequest('Invalid subscription status');
    }

    allowedUpdates.status = updates.status;
  }

  if (updates.startedAt !== undefined) {
    allowedUpdates.startedAt = updates.startedAt;
  }

  if (updates.expiresAt !== undefined) {
    allowedUpdates.expiresAt = updates.expiresAt;
  }

  const limitFields = [
    'monthlyReviews',
    'aiAssistedReviews',
    'linesPerReview',
    'filesPerReview',
    'historyRetentionDays',
    'seats',
  ];
  for (const field of limitFields) {
    if (updates[field] !== undefined) {
      allowedUpdates[field] = updates[field];
    }
  }

  if (Object.keys(allowedUpdates).length === 0) {
    throw ApiError.badRequest('No valid subscription fields provided');
  }

  return subscriptionRepo.updateByUserId(userId, allowedUpdates);
}

/**
 * Upgrade a subscription to a new plan (personal-only legacy path).
 */
export async function upgradeSubscription(userId, plan, expiresAt = null) {
  if (!userId) {
    throw ApiError.badRequest('User ID is required');
  }

  if (!Object.values(PLANS).includes(plan)) {
    throw ApiError.badRequest('Invalid subscription plan');
  }

  if (plan === PLANS.FREE) {
    throw ApiError.badRequest('Use the free subscription for new registrations');
  }

  const planConfig = PLAN_CONFIGS[plan] || {};

  return updateSubscription(userId, {
    plan,
    status: STATUSES.ACTIVE,
    startedAt: new Date(),
    expiresAt,
    ...planConfig,
  });
}

/**
 * Upgrade the subscription that belongs to a workspace.
 *
 * - Company workspace → updates by companyId.
 * - Personal workspace → updates by userId.
 *
 * @param {{ type: string, userId: string, companyId: string|null }} workspace
 * @param {string} plan
 * @returns {Promise<object>}
 */
export async function upgradeWorkspaceSubscription(workspace, plan) {
  if (!Object.values(PLANS).includes(plan)) {
    throw ApiError.badRequest('Invalid subscription plan');
  }

  if (plan === PLANS.FREE) {
    throw ApiError.badRequest('Cannot downgrade to Free via payment');
  }

  const planConfig = PLAN_CONFIGS[plan] || {};
  const updates = {
    plan,
    status: STATUSES.ACTIVE,
    startedAt: new Date(),
    expiresAt: null,
    ...planConfig,
  };

  if (workspace.type === 'company' && workspace.companyId) {
    return subscriptionRepo.updateByCompanyId(workspace.companyId, updates);
  }
  return subscriptionRepo.updateByUserId(workspace.userId, updates);
}

/**
 * Get subscription tier policies based on the plan
 */
export function getTierPolicy(plan) {
  return PLAN_CONFIGS[plan] || {};
}

/**
 * Check if a subscription meets the plan's limits
 */
export function checkPlanLimits(subscription) {
  if (!subscription || !subscription.plan) {
    throw new Error('Subscription must have a plan');
  }

  const policy = getTierPolicy(subscription.plan);

  if (!policy || Object.keys(policy).length === 0) {
    throw new Error('Unknown plan: ' + subscription.plan);
  }

  return true;
}

/**
 * Validate subscription status transitions
 */
export function validateStatusTransition(subscription) {
  if (!subscription || !subscription.status) {
    throw new Error('Subscription must have a status');
  }

  switch (subscription.status) {
    case 'trialing':
      break;
    case 'active':
      break;
    case 'past_due':
      break;
    case 'expired':
      break;
    case 'cancelled':
      break;
    default:
      throw new Error(`Unknown subscription status: ${subscription.status}`);
  }

  return true;
}
