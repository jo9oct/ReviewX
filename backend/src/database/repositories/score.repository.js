
import { Score } from "../models/score.model.js";

export async function create(data) {
  return Score.create(data);
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
  data
) {
  return Score.findOneAndUpdate(
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
  return Score.findOneAndDelete({
    reviewId
  }).lean();
}

export const scoreRepository = Object.freeze({
  create,
  findByReviewId,
  upsertByReviewId,
  deleteByReviewId
});