// STATUS: UPDATED

import * as subscriptionRepo from '../database/repositories/subscription.repositories.js';

import { ApiError } from '../utils/ApiError.js';

const PLANS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

const STATUSES = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

export async function createFreeSubscription(
  userId,
) {
  if (!userId) {
    throw ApiError.badRequest(
      'User ID is required to create a subscription',
    );
  }

  return subscriptionRepo.findOrCreateFreeByUserId(
    userId,
  );
}

export async function getSubscription(
  userId,
) {
  if (!userId) {
    throw ApiError.badRequest(
      'User ID is required',
    );
  }

  return subscriptionRepo.findOrCreateFreeByUserId(
    userId,
  );
}

export async function updateSubscription(
  userId,
  updates,
) {
  if (!userId) {
    throw ApiError.badRequest(
      'User ID is required',
    );
  }

  const subscription =
    await subscriptionRepo.findByUserId(
      userId,
    );

  if (!subscription) {
    throw ApiError.notFound(
      'Subscription not found',
    );
  }

  const allowedUpdates = {};

  if (updates.plan !== undefined) {
    if (
      !Object.values(PLANS).includes(
        updates.plan,
      )
    ) {
      throw ApiError.badRequest(
        'Invalid subscription plan',
      );
    }

    allowedUpdates.plan =
      updates.plan;
  }

  if (updates.status !== undefined) {
    if (
      !Object.values(STATUSES).includes(
        updates.status,
      )
    ) {
      throw ApiError.badRequest(
        'Invalid subscription status',
      );
    }

    allowedUpdates.status =
      updates.status;
  }

  if (updates.startedAt !== undefined) {
    allowedUpdates.startedAt =
      updates.startedAt;
  }

  if (updates.expiresAt !== undefined) {
    allowedUpdates.expiresAt =
      updates.expiresAt;
  }

  if (
    Object.keys(
      allowedUpdates,
    ).length === 0
  ) {
    throw ApiError.badRequest(
      'No valid subscription fields provided',
    );
  }

  return subscriptionRepo.updateByUserId(
    userId,
    allowedUpdates,
  );
}

export async function upgradeSubscription(
  userId,
  plan,
  expiresAt = null,
) {
  if (!userId) {
    throw ApiError.badRequest(
      'User ID is required',
    );
  }

  if (
    !Object.values(PLANS).includes(
      plan,
    )
  ) {
    throw ApiError.badRequest(
      'Invalid subscription plan',
    );
  }

  if (plan === PLANS.FREE) {
    throw ApiError.badRequest(
      'Use the free subscription for new registrations',
    );
  }

  return updateSubscription(
    userId,
    {
      plan,
      status: STATUSES.ACTIVE,
      startedAt: new Date(),
      expiresAt,
    },
  );
}

export {
  PLANS,
  STATUSES,
};