import { Report } from "../models/report.model.js";

export async function create(
  data
) {
  return Report.create(data);
}

export async function findById(
  reportId
) {
  return Report.findById(
    reportId
  ).lean();
}

export async function findByReviewId(
  reviewId
) {
  return Report.find({
    reviewId
  })
    .sort({
      createdAt: -1
    })
    .lean();
}

export async function findByReviewIdAndType(
  reviewId,
  type
) {
  return Report.findOne({
    reviewId,
    type
  })
    .sort({
      createdAt: -1
    })
    .lean();
}

export async function findLatestByReviewIdAndType(
  reviewId,
  type
) {
  return Report.findOne({
    reviewId,
    type
  })
    .sort({
      createdAt: -1
    })
    .lean();
}

export async function updateById(
  reportId,
  updates
) {
  return Report.findByIdAndUpdate(
    reportId,
    {
      $set: updates
    },
    {
      new: true,
      runValidators: true
    }
  ).lean();
}

export async function deleteById(
  reportId
) {
  return Report.findByIdAndDelete(
    reportId
  ).lean();
}

export const reportRepository =
  Object.freeze({
    create,
    findById,
    findByReviewId,
    findByReviewIdAndType,
    findLatestByReviewIdAndType,
    updateById,
    deleteById
  });