import {
  Review
} from "../models/review.model.js";


export async function create(
  data,
  options = {}
) {
  if (
    Object.keys(options).length ===
    0
  ) {
    return Review.create(data);
  }


  const [
    review
  ] =
    await Review.create(
      [data],
      options
    );


  return review;
}


export async function findById(
  reviewId
) {
  return Review.findById(
    reviewId
  ).lean();
}


export async function updateById(
  reviewId,
  update,
  options = {}
) {
  return Review.findByIdAndUpdate(
    reviewId,
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
  reviewId
) {
  return Review.findByIdAndDelete(
    reviewId
  ).lean();
}


export async function countByStatus(
  status
) {
  return Review.countDocuments({
    status
  });
}


export const reviewRepository =
  Object.freeze({
    create,

    findById,

    updateById,

    deleteById,

    countByStatus
  });