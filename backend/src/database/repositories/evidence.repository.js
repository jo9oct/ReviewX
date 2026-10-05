import Evidence from '../models/evidence.model.js';

const create = async (data) => {
  return Evidence.create(data);
};

const createMany = async (documents) => {
  if (
    !Array.isArray(documents) ||
    documents.length === 0
  ) {
    return [];
  }

  return Evidence.insertMany(
    documents,
    {
      ordered: true,
    },
  );
};

const findById = async (evidenceId) => {
  return Evidence.findById(
    evidenceId,
  ).lean();
};

const findByFindingId = async (
  findingId,
) => {
  return Evidence.find({
    findingId,
  })
    .sort({
      lineStart: 1,
    })
    .lean();
};

const findByReviewId = async (
  reviewId,
) => {
  return Evidence.find({
    reviewId,
  })
    .sort({
      createdAt: 1,
    })
    .lean();
};

const evidenceRepository = Object.freeze({
  create,
  createMany,
  findById,
  findByFindingId,
  findByReviewId,
});

export {
  create,
  createMany,
  findById,
  findByFindingId,
  findByReviewId,
  evidenceRepository,
};

export default evidenceRepository;