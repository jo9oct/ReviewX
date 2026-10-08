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