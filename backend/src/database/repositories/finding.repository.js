
import { Finding } from "../models/finding.model.js";

export async function create(data) {
  return Finding.create(data);
}

export async function createMany(findings) {
  if (!Array.isArray(findings) || findings.length === 0) {
    return [];
  }

  return Finding.insertMany(
    findings,
    {
      ordered: true
    }
  );
}

export async function findById(findingId) {
  return Finding.findById(findingId).lean();
}

export async function findByReviewId(reviewId) {
  return Finding.find({
    reviewId
  })
    .sort({
      createdAt: 1
    })
    .lean();
}

export async function findByFingerprint(
  reviewId,
  fingerprint
) {
  return Finding.findOne({
    reviewId,
    fingerprint
  }).lean();
}

export async function updateById(
  findingId,
  update
) {
  return Finding.findByIdAndUpdate(
    findingId,
    update,
    {
      new: true,
      runValidators: true
    }
  ).lean();
}

export async function deleteById(findingId) {
  return Finding.findByIdAndDelete(
    findingId
  ).lean();
}

export async function deleteByReviewId(
  reviewId
) {
  return Finding.deleteMany({
    reviewId
  });
}

export const findingRepository = Object.freeze({
  create,
  createMany,
  findById,
  findByReviewId,
  findByFingerprint,
  updateById,
  deleteById,
  deleteByReviewId
});