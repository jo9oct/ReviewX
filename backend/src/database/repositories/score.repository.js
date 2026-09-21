import {
  Score
} from "../models/score.model.js";


export async function create(
  data,
  options = {}
) {
  if (
    Object.keys(options).length ===
    0
  ) {
    return Score.create(data);
  }


  const [
    score
  ] =
    await Score.create(
      [data],
      options
    );


  return score;
}


export async function findByReviewId(
  reviewId
) {
  return Score.findOne({
    reviewId
  }).lean();
}


export async function upsertByReviewId(
  reviewId,
  data,
  options = {}
) {
  return Score.findOneAndUpdate(
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
  return Score.findOneAndDelete({
    reviewId
  }).lean();
}


export const scoreRepository =
  Object.freeze({
    create,

    findByReviewId,

    upsertByReviewId,

    deleteByReviewId
  });