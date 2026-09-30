import Finding from '../models/finding.model.js';

const create = async (data) => {
  return Finding.create(data);
};

const createMany = async (documents) => {
  if (
    !Array.isArray(documents) ||
    documents.length === 0
  ) {
    return [];
  }

  return Finding.insertMany(
    documents,
    {
      ordered: true,
    },
  );
};

const findById = async (findingId) => {
  return Finding.findById(
    findingId,
  ).lean();
};

const findByReviewId = async (
  reviewId,
) => {
  return Finding.find({
    reviewId,
  })
    .sort({
      createdAt: 1,
    })
    .lean();
};

const updateById = async (
  findingId,
  update,
) => {
  return Finding.findByIdAndUpdate(
    findingId,
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

const countBySeverity = async (
  reviewId,
) => {
  return Finding.aggregate([
    {
      $match: {
        reviewId,
      },
    },
    {
      $group: {
        _id: '$severity',
        count: {
          $sum: 1,
        },
      },
    },
  ]);
};

const findingRepository = Object.freeze({
  create,
  createMany,
  findById,
  findByReviewId,
  updateById,
  countBySeverity,
});

export {
  create,
  createMany,
  findById,
  findByReviewId,
  updateById,
  countBySeverity,
  findingRepository,
};

export default findingRepository;