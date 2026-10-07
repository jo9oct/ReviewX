import {
  createReviewResponse,
  getReviewResponse,
} from '../services/review.service.js';

import {
  findMany,
} from '../database/repositories/review.repository.js';

import {
  createResponse,
} from '../utils/response.js';

const createReview = async (
  req,
  res,
  next,
) => {
  try {
    const result =
      await createReviewResponse(
        req.body,
      );

    return res.status(202).json(
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

const getReview = async (
  req,
  res,
  next,
) => {
  try {
    const result =
      await getReviewResponse(
        req.params.reviewId,
      );

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

const getAllReviews = async (
  req,
  res,
  next,
) => {
  try {
    const limit = Number(
      req.query.limit || 50,
    );

    const skip = Number(
      req.query.skip || 0,
    );

    const ownerId =
      typeof req.query.ownerId ===
      'string'
        ? req.query.ownerId
        : undefined;

    const reviews =
      await findMany(
        ownerId
          ? { ownerId }
          : {},
        {
          limit,
          skip,
        },
      );

    return res.status(200).json(
      createResponse({
        success: true,

        data: {
          reviews,
        },

        meta: {
          requestId:
            req.requestId,

          count:
            reviews.length,

          limit,

          skip,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

export {
  createReview,
  getReview,
  getAllReviews,
};