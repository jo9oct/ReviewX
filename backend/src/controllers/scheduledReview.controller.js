import {
  createScheduledReviewService,
} from '../scheduler/scheduledReview.service.js';

import reviewRepository from '../database/repositories/review.repository.js';

import scheduledReviewRepository from '../database/repositories/scheduledReview.repository.js';

import {
  createResponse,
} from '../utils/response.js';

const scheduledReviewService =
  createScheduledReviewService({
    reviewRepository,
    scheduledReviewRepository,
  });

const createScheduledReview = async (
  req,
  res,
  next,
) => {
  try {
    const {
      ownerId,
      reviewId,
      intervalSeconds,
    } = req.body;

    const result =
      await scheduledReviewService.createSchedule({
        ownerId,
        reviewId,
        intervalSeconds,
      });

    return res.status(201).json(
      createResponse({
        success: true,

        data: result,

        meta: {
          requestId:
            req.requestId,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

const getScheduledReviews = async (
  req,
  res,
  next,
) => {
  try {
    const {
      ownerId,
    } = req.query;

    const result =
      await scheduledReviewService.listSchedules({
        ownerId,
      });

    return res.status(200).json(
      createResponse({
        success: true,

        data: result,

        meta: {
          requestId:
            req.requestId,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

const getScheduledReview = async (
  req,
  res,
  next,
) => {
  try {
    const {
      ownerId,
    } = req.query;

    const result =
      await scheduledReviewService.getSchedule({
        ownerId,
        scheduleId:
          req.params.scheduleId,
      });

    return res.status(200).json(
      createResponse({
        success: true,

        data: result,

        meta: {
          requestId:
            req.requestId,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

const cancelScheduledReview = async (
  req,
  res,
  next,
) => {
  try {
    const {
      ownerId,
    } = req.body;

    const result =
      await scheduledReviewService.cancelSchedule({
        ownerId,
        scheduleId:
          req.params.scheduleId,
      });

    return res.status(200).json(
      createResponse({
        success: true,

        data: result,

        meta: {
          requestId:
            req.requestId,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

export {
  createScheduledReview,
  getScheduledReviews,
  getScheduledReview,
  cancelScheduledReview,
};