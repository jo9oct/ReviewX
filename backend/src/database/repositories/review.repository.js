
import { Review } from "../models/review.model.js";

export async function create(data) {
  return Review.create(data);
}

export async function findById(reviewId) {
  return Review.findById(reviewId).lean();
}

export async function updateById(
  reviewId,
  update
) {
  return Review.findByIdAndUpdate(
    reviewId,
    update,
    {
      new: true,
      runValidators: true
    }
  ).lean();
}

export async function deleteById(reviewId) {
  return Review.findByIdAndDelete(reviewId).lean();
}

export async function countByStatus(status) {
  return Review.countDocuments({
    status
  });
}

export const reviewRepository = Object.freeze({
  create,
  findById,
  updateById,
  deleteById,
  countByStatus
});