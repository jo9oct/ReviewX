import Review from '../models/review.model.js';

const create = async (data) => {
  return Review.create(data);
};

const findById = async (reviewId) => {
  return Review.findById(
    reviewId,
  ).lean();
};

const findMany = async (
  filter = {},
  options = {},
) => {
  const {
    limit = 50,
    skip = 0,
  } = options;

  return Review.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const updateById = async (
  reviewId,
  update,
) => {
  return Review.findByIdAndUpdate(
    reviewId,
    {
      $set: update,
    },
    {
      new: true,
      runValidators: true,
      lean: true,
    },
  );
};

const count = async (
  filter = {},
) => {
  return Review.countDocuments(
    filter,
  );
};

const reviewRepository = Object.freeze({
  create,
  findById,
  findMany,
  updateById,
  count,
});

export {
  create,
  findById,
  findMany,
  updateById,
  count,
  reviewRepository,
};

export default reviewRepository;