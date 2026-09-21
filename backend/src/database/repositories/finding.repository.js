import {
  Finding
} from "../models/finding.model.js";


export async function create(
  data,
  options = {}
) {
  if (
    Object.keys(options).length ===
    0
  ) {
    return Finding.create(data);
  }


  const [
    finding
  ] =
    await Finding.create(
      [data],
      options
    );


  return finding;
}


export async function createMany(
  findings,
  options = {}
) {
  if (
    !Array.isArray(findings) ||
    findings.length === 0
  ) {
    return [];
  }


  return Finding.insertMany(
    findings,
    {
      ordered:
        true,

      ...options
    }
  );
}


export async function findById(
  findingId
) {
  return Finding.findById(
    findingId
  ).lean();
}


export async function findByReviewId(
  reviewId
) {
  return Finding.find({
    reviewId
  })
    .sort({
      createdAt:
        1
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
  update,
  options = {}
) {
  return Finding.findByIdAndUpdate(
    findingId,
    update,
    {
      new: true,

      runValidators:
        true,

      ...options
    }
  ).lean();
}


export async function deleteById(
  findingId
) {
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


export const findingRepository =
  Object.freeze({
    create,

    createMany,

    findById,

    findByReviewId,

    findByFingerprint,

    updateById,

    deleteById,

    deleteByReviewId
  });