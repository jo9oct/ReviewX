import Report from "../models/report.model.js";

const create = async (
  data,
) =>
  Report.create(data);

const findById = async (
  id,
) =>
  Report.findById(id)
    .lean();

const findByReviewId = async (
  reviewId,
) =>
  Report.find({
    reviewId,
  })
    .sort({
      createdAt: 1,
    })
    .lean();

const findByReviewAndFormat =
  async (
    reviewId,
    format,
  ) =>
    Report.findOne({
      reviewId,
      format,
    })
      .lean();

const updateById = async (
  id,
  updates,
) =>
  Report.findByIdAndUpdate(
    id,
    {
      $set: updates,
    },
    {
      new: true,
      runValidators: true,
      lean: true,
    },
  );

const markGenerating = async ({
  id,
}) =>
  updateById(id, {
    status: "generating",
    errorCode: null,
  });

const markCompleted = async ({
  id,
  storageProvider,
  publicId,
  secureUrl,
  resourceType,
}) =>
  updateById(id, {
    status: "completed",
    storageProvider,
    publicId,
    secureUrl,
    resourceType,
    errorCode: null,
  });

const markFailed = async ({
  id,
  errorCode,
}) =>
  updateById(id, {
    status: "failed",
    errorCode:
      String(
        errorCode ||
          "REPORT_GENERATION_FAILED",
      ),
  });

export {
  create,
  findById,
  findByReviewId,
  findByReviewAndFormat,
  updateById,
  markGenerating,
  markCompleted,
  markFailed,
};

export default Object.freeze({
  create,
  findById,
  findByReviewId,
  findByReviewAndFormat,
  updateById,
  markGenerating,
  markCompleted,
  markFailed,
});