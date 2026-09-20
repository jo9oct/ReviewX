import { AiAnalysis } from "../models/aiAnalysis.model.js";

export async function create(
  data
) {
  return AiAnalysis.create(data);
}

export async function findByReviewId(
  reviewId
) {
  return AiAnalysis.findOne({
    reviewId
  }).lean();
}

export async function upsertByReviewId(
  reviewId,
  data
) {
  return AiAnalysis.findOneAndUpdate(
    {
      reviewId
    },
    {
      $set: data,
      $setOnInsert: {
        reviewId
      }
    },
    {
      new: true,
      upsert: true,
      runValidators: true
    }
  ).lean();
}

export async function deleteByReviewId(
  reviewId
) {
  return AiAnalysis.findOneAndDelete({
    reviewId
  }).lean();
}

export const aiAnalysisRepository =
  Object.freeze({
    create,
    findByReviewId,
    upsertByReviewId,
    deleteByReviewId
  });