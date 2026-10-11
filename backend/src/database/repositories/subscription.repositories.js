// STATUS: CREATED

import {
  Subscription,
} from '../models/subscription.model.js';

export async function createSubscription(
  fields,
) {
  const subscription =
    new Subscription(fields);

  await subscription.save();

  return subscription;
}

export async function findByUserId(
  userId,
) {
  return Subscription.findOne({
    userId,
  })
    .lean()
    .exec();
}

export async function findOrCreateFreeByUserId(
  userId,
) {
  return Subscription.findOneAndUpdate(
    {
      userId,
    },
    {
      $setOnInsert: {
        userId,
        plan: 'free',
        status: 'active',
        startedAt: new Date(),
        expiresAt: null,
        monthlyReviews: 50,
        aiAssistedReviews: 5,
        linesPerReview: 1000,
        filesPerReview: 50,
        historyRetentionDays: 30,
        seats: 0,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    },
  )
    .lean()
    .exec();
}

export async function updateByUserId(
  userId,
  updates,
) {
  return Subscription.findOneAndUpdate(
    {
      userId,
    },
    {
      $set: updates,
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .lean()
    .exec();
}

export async function existsByUserId(
  userId,
) {
  const count =
    await Subscription.countDocuments({
      userId,
    });

  return count > 0;
}

/**
 * Find a company-scoped subscription by companyId.
 *
 * @param {string|ObjectId} companyId
 * @returns {Promise<object|null>}
 */
export async function findByCompanyId(companyId) {
  return Subscription.findOne({ companyId }).lean().exec();
}

/**
 * Create (or return existing) a Team-trialing subscription for a new company.
 * The trial lasts 14 days.
 *
 * @param {string|ObjectId} companyId
 * @param {string|ObjectId} ownerId  — userId of the company creator
 * @returns {Promise<object>}
 */
export async function findOrCreateTrialingByCompanyId(companyId, ownerId) {
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  return Subscription.findOneAndUpdate(
    { companyId },
    {
      $setOnInsert: {
        userId: ownerId,
        companyId,
        plan: 'team',
        status: 'trialing',
        startedAt: new Date(),
        trialEndsAt,
        expiresAt: trialEndsAt,
        monthlyReviews: 5000,
        aiAssistedReviews: 100,
        linesPerReview: 10000,
        filesPerReview: 200,
        historyRetentionDays: 180,
        seats: 10,
      },
    },
    { upsert: true, new: true, runValidators: true },
  ).lean().exec();
}

/**
 * Update a company-scoped subscription.
 *
 * @param {string|ObjectId} companyId
 * @param {object} updates
 * @returns {Promise<object|null>}
 */
export async function updateByCompanyId(companyId, updates) {
  return Subscription.findOneAndUpdate(
    { companyId },
    { $set: updates },
    { new: true, runValidators: true },
  ).lean().exec();
}