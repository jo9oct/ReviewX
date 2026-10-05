import mongoose from 'mongoose';
import Review from '../models/review.model.js';

const normalizeReviewId = (reviewId) => {
  if (reviewId === null || reviewId === undefined) {
    throw new TypeError('Review ID is required.');
  }
  const str = String(reviewId).trim();
  if (!str) {
    throw new TypeError('Review ID is required.');
  }
  return str;
};

const formatReviewDoc = (doc) => {
  if (!doc) return null;
  const idStr = doc._id ? doc._id.toString() : (doc.reviewId ? doc.reviewId.toString() : null);
  return {
    ...doc,
    id: idStr,
    reviewId: idStr
  };
};

export async function create(data, options = {}) {
  if (!data || typeof data !== 'object') {
    throw new TypeError('Review data is required.');
  }

  const reviewId = data.reviewId || (mongoose.Types.ObjectId.isValid(data._id) ? data._id : new mongoose.Types.ObjectId());
  const reviewDoc = {
    ...data,
    _id: reviewId,
    reviewId
  };

  if (Object.keys(options).length === 0) {
    const created = await Review.create(reviewDoc);
    return formatReviewDoc(created.toObject ? created.toObject() : created);
  }

  const [created] = await Review.create([reviewDoc], options);
  return formatReviewDoc(created.toObject ? created.toObject() : created);
}

export async function findById(reviewId) {
  const normalized = normalizeReviewId(reviewId);
  const isObjectId = mongoose.Types.ObjectId.isValid(normalized);
  const query = isObjectId
    ? { $or: [{ _id: normalized }, { reviewId: normalized }] }
    : { reviewId: normalized };

  const doc = await Review.findOne(query).lean();
  return formatReviewDoc(doc);
}

export async function findByReviewId(reviewId) {
  return findById(reviewId);
}

export async function findByOwnerId(ownerId) {
  if (!ownerId) return [];
  const docs = await Review.find({
    $or: [{ ownerId: String(ownerId) }, { user: ownerId }]
  }).sort({ createdAt: -1 }).lean();
  return docs.map(formatReviewDoc);
}

export async function findRecent(limit = 20, filter = {}) {
  const docs = await Review.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return docs.map(formatReviewDoc);
}

export async function countAll(filter = {}) {
  return Review.countDocuments(filter);
}

export async function countByStatus(status, filter = {}) {
  return Review.countDocuments({ ...filter, status });
}

export async function findIds(filter = {}) {
  const docs = await Review.find(filter, { _id: 1 }).lean();
  return docs.map((d) => d._id);
}

export async function updateById(reviewId, update, options = {}) {
  const normalized = normalizeReviewId(reviewId);
  const isObjectId = mongoose.Types.ObjectId.isValid(normalized);
  const query = isObjectId
    ? { $or: [{ _id: normalized }, { reviewId: normalized }] }
    : { reviewId: normalized };

  const doc = await Review.findOneAndUpdate(
    query,
    update,
    {
      new: true,
      runValidators: true,
      ...options
    }
  ).lean();

  return formatReviewDoc(doc);
}

export async function updateByIdAndStatus(reviewId, status, update, options = {}) {
  const normalized = normalizeReviewId(reviewId);
  const isObjectId = mongoose.Types.ObjectId.isValid(normalized);
  const query = isObjectId
    ? { $or: [{ _id: normalized }, { reviewId: normalized }], status }
    : { reviewId: normalized, status };

  const doc = await Review.findOneAndUpdate(
    query,
    update,
    {
      new: true,
      runValidators: true,
      ...options
    }
  ).lean();

  return formatReviewDoc(doc);
}

export async function deleteById(reviewId) {
  const normalized = normalizeReviewId(reviewId);
  const isObjectId = mongoose.Types.ObjectId.isValid(normalized);
  const query = isObjectId
    ? { $or: [{ _id: normalized }, { reviewId: normalized }] }
    : { reviewId: normalized };

  const doc = await Review.findOneAndDelete(query).lean();
  return formatReviewDoc(doc);
}

export const reviewRepository = Object.freeze({
  create,
  findById,
  findByReviewId,
  findByOwnerId,
  findRecent,
  countAll,
  countByStatus,
  findIds,
  updateById,
  updateByIdAndStatus,
  deleteById
});

export default reviewRepository;
