// STATUS: CREATED

import * as subscriptionService from '../services/subscription.service.js';

export async function getMySubscription(
  req,
  res,
  next,
) {
  try {
    const subscription =
      await subscriptionService.getSubscription(
        req.user.id,
      );

    return res.status(200).json({
      success: true,
      data: {
        subscription,
      },
    });
  } catch (error) {
    return next(error);
  }
}