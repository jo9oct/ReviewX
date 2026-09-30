import { createReviewResponse } from '../services/review.service.js';
import { createResponse } from '../utils/response.js';

const createReview = async (req, res, next) => {
  try {
    const result = await createReviewResponse(req.body);

    return res.status(202).json(
      createResponse({
        success: true,
        data: result,
        meta: {
          requestId: req.requestId
        }
      })
    );
  } catch (error) {
    return next(error);
  }
};

export {
  createReview
};