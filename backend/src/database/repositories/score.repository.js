import Score from '../models/score.model.js';

const create = async (data) => {
  return Score.create(data);
};

const findByReviewId = async (
  reviewId,
) => {
  return Score.findOne({
    reviewId,
  }).lean();
};

const upsertByReviewId = async (
  reviewId,
  data,
) => {
  return Score.findOneAndUpdate(
    {
      reviewId,
    },
    {
      $set: data,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      lean: true,
    },
  );
};

const scoreRepository = Object.freeze({
  create,
  findByReviewId,
  upsertByReviewId,
});

export {
  create,
  findByReviewId,
  upsertByReviewId,
  scoreRepository,
};

export default scoreRepository;