import {
  createReview,
  getReview
} from "../services/review.service.js";

import {
  sendSuccess
} from "../utils/response.js";

export async function create(
  req,
  res,
  next
) {
  try {
    const result =
      await createReview({
        input:
          req.body,
        file:
          req.file || null,
        accessContext:
          req.analysisAccessContext ||
          null
      });

    return sendSuccess(
      res,
      {
        reviewId:
          result.reviewId,
        ...result.result
      },
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req,
  res,
  next
) {
  try {
    const review =
      await getReview(
        req.params.reviewId
      );

    return sendSuccess(
      res,
      review
    );
  } catch (error) {
    next(error);
  }
}