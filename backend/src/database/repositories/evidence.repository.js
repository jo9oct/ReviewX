
import { Evidence } from "../models/evidence.model.js";

export async function create(data) {
  return Evidence.create(data);
}

export async function createMany(evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return [];
  }

  return Evidence.insertMany(
    evidence,
    {
      ordered: true
    }
  );
}

export async function findById(evidenceId) {
  return Evidence.findById(
    evidenceId
  ).lean();
}

export async function findByFindingId(
  findingId
) {
  return Evidence.find({
    findingId
  })
    .sort({
      createdAt: 1
    })
    .lean();
}

export async function findByReviewId(
  reviewId
) {
  return Evidence.find({
    reviewId
  })
    .sort({
      createdAt: 1
    })
    .lean();
}

export async function deleteByReviewId(
  reviewId
) {
  return Evidence.deleteMany({
    reviewId
  });
}

export const evidenceRepository = Object.freeze({
  create,
  createMany,
  findById,
  findByFindingId,
  findByReviewId,
  deleteByReviewId
});