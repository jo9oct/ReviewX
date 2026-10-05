import Finding from '../models/finding.model.js';

export async function create(data, options = {}) {
  if (Object.keys(options).length === 0) {
    return Finding.create(data);
  }
  const [finding] = await Finding.create([data], options);
  return finding;
}

export async function createMany(documents, options = {}) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return [];
  }
  return Finding.insertMany(documents, {
    ordered: true,
    ...options
  });
}

export async function findById(findingId) {
  return Finding.findById(findingId).lean();
}

export async function findByReviewId(reviewId) {
  return Finding.find({ reviewId }).sort({ createdAt: 1 }).lean();
}

export async function findOpenFindings(limit = 20, reviewIds = null) {
  const query = { status: { $ne: 'resolved' } };
  if (Array.isArray(reviewIds)) {
    query.reviewId = { $in: reviewIds };
  }
  return Finding.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function countFindings(reviewIds = null) {
  const baseQuery = {};
  if (Array.isArray(reviewIds)) {
    baseQuery.reviewId = { $in: reviewIds };
  }
  const total = await Finding.countDocuments(baseQuery);
  const resolved = await Finding.countDocuments({ ...baseQuery, status: 'resolved' });
  return { total, resolved };
}

export async function findByFingerprint(reviewId, fingerprint) {
  return Finding.findOne({ reviewId, fingerprint }).lean();
}

export async function updateById(findingId, update, options = {}) {
  return Finding.findByIdAndUpdate(
    findingId,
    {
      $set: update
    },
    {
      new: true,
      runValidators: true,
      ...options
    }
  ).lean();
}

export async function deleteById(findingId) {
  return Finding.findByIdAndDelete(findingId).lean();
}

export async function deleteByReviewId(reviewId) {
  return Finding.deleteMany({ reviewId }).lean();
}

export const findingRepository = Object.freeze({
  create,
  createMany,
  findById,
  findByReviewId,
  findOpenFindings,
  countFindings,
  findByFingerprint,
  updateById,
  deleteById,
  deleteByReviewId
});

export default findingRepository;
