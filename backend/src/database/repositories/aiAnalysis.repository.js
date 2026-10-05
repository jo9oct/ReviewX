import AiAnalysis from '../models/aiAnalysis.model.js';

const create = async (data) => {
  return AiAnalysis.create(data);
};

const findById = async (analysisId) => {
  return AiAnalysis.findById(analysisId).lean();
};

const findByReviewId = async (reviewId) => {
  return AiAnalysis.find({
    reviewId,
  })
    .sort({
      createdAt: 1,
    })
    .lean();
};

const findByReviewAndType = async (
  reviewId,
  analysisType,
) => {
  return AiAnalysis.findOne({
    reviewId,
    analysisType,
  }).lean();
};

const updateById = async (
  analysisId,
  updates,
) => {
  return AiAnalysis.findByIdAndUpdate(
    analysisId,
    {
      $set: updates,
    },
    {
      new: true,
      runValidators: true,
      lean: true,
    },
  );
};

const updateByReviewId = async (
  reviewId,
  updates,
) => {
  return AiAnalysis.findOneAndUpdate(
    {
      reviewId,
    },
    {
      $set: updates,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      lean: true,
    },
  );
};

const aiAnalysisRepository = Object.freeze({
  create,
  findById,
  findByReviewId,
  findByReviewAndType,
  updateById,
  updateByReviewId,
});

export {
  create,
  findById,
  findByReviewId,
  findByReviewAndType,
  updateById,
  updateByReviewId,
  aiAnalysisRepository,
};

export default aiAnalysisRepository;