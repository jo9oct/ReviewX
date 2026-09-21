import {
  AiAnalysis
} from "../models/aiAnalysis.model.js";


export async function create(
  data,
  options = {}
) {
  if (
    Object.keys(options).length ===
    0
  ) {
    return AiAnalysis.create(data);
  }


  const [
    aiAnalysis
  ] =
    await AiAnalysis.create(
      [data],
      options
    );


  return aiAnalysis;
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
  data,
  options = {}
) {
  return AiAnalysis.findOneAndUpdate(
    {
      reviewId
    },

    {
      $set:
        data,

      $setOnInsert: {
        reviewId
      }
    },

    {
      new:
        true,

      upsert:
        true,

      runValidators:
        true,

      ...options
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