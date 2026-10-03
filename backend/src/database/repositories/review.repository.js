import { Review } from "../models/review.model.js";

export async function create(data, options = {}) {
  if (Object.keys(options).length === 0) {
    return Review.create(data);
  }
  const [review] = await Review.create([data], options);
  return review;
}

export async function findById(reviewId) {
  return Review.findById(reviewId).lean();
}

export async function findRecent(limit = 20, filter = {}) {
  return Review.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
}

export async function countAll(filter = {}) {
  return Review.countDocuments(filter);
}

export async function findIds(filter = {}) {
  const docs = await Review.find(filter, { _id: 1 }).lean();
  return docs.map((d) => d._id);
}

export async function updateById(reviewId, update, options = {}) {
  return Review.findByIdAndUpdate(
    reviewId,
    update,
    {
      new: true,
      runValidators: true,
      ...options
    }
  ).lean();
}

export async function deleteById(reviewId) {
  return Review.findByIdAndDelete(reviewId).lean();
}

export async function countByStatus(status, filter = {}) {
  return Review.countDocuments({ ...filter, status });
}

export const reviewRepository = Object.freeze({
  create,
  findById,
  findRecent,
  countAll,
  findIds,
  updateById,
  deleteById,
  countByStatus
});
