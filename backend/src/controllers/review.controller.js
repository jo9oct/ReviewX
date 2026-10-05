import {
  createReviewResponse,
  getReviewResponse,
  listReviews,
  getDashboardMetrics,
} from '../services/review.service.js';

import {
  createResponse,
  sendSuccess,
} from '../utils/response.js';

export const create = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const result = await createReviewResponse(payload, req.user || null);

    return res.status(202).json(
      createResponse({
        success: true,
        data: result,
        meta: {
          requestId: req.requestId,
        },
      })
    );
  } catch (error) {
    return next(error);
  }
};

export const createReview = create;

export const getById = async (req, res, next) => {
  try {
    const result = await getReviewResponse(req.params.reviewId, req.user || null);

    return res.status(200).json(
      createResponse({
        success: true,
        data: result,
        meta: {
          requestId: req.requestId,
        },
      })
    );
  } catch (error) {
    return next(error);
  }
};

export const getReview = getById;

export const list = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const reviews = await listReviews({
      limit,
      user: req.user || null,
    });
    return sendSuccess(res, reviews);
  } catch (error) {
    return next(error);
  }
};

export const getMetrics = async (req, res, next) => {
  try {
    const metrics = await getDashboardMetrics({
      user: req.user || null,
    });
    return sendSuccess(res, metrics);
  } catch (error) {
    return next(error);
  }
};

export default {
  create,
  createReview,
  getById,
  getReview,
  list,
  getMetrics,
};
