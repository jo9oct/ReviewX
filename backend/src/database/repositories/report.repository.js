import mongoose from 'mongoose';

import Report from '../models/report.model.js';

const normalizeOwnerId = (
  ownerId,
) => {
  if (
    typeof ownerId !== 'string' ||
    !ownerId.trim()
  ) {
    throw new TypeError(
      'Owner ID is required.',
    );
  }

  return ownerId.trim();
};

const normalizeReportId = (
  reportId,
) => {
  if (
    typeof reportId !== 'string' ||
    !reportId.trim()
  ) {
    throw new TypeError(
      'Report ID is required.',
    );
  }

  return reportId.trim();
};

const normalizeReviewId = (
  reviewId,
) => {
  if (
    typeof reviewId !== 'string' ||
    !reviewId.trim()
  ) {
    throw new TypeError(
      'Review ID is required.',
    );
  }

  return reviewId.trim();
};

const normalizeObjectId = (
  value,
  message = 'Invalid report ID.',
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      value,
    )
  ) {
    throw new TypeError(
      message,
    );
  }

  return new mongoose.Types.ObjectId(
    value,
  );
};

const attachOwnerId = (
  report,
  ownerId,
) => {
  if (!report) {
    return null;
  }

  return {
    ...report,

    ownerId,
  };
};

const create = async (
  data,
) => {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    throw new TypeError(
      'Report data is required.',
    );
  }

  const {
    ownerId,
    ...reportData
  } = data;

  const normalizedOwnerId =
    normalizeOwnerId(
      ownerId,
    );

  const reportId =
    reportData.reportId ||
    new mongoose.Types.ObjectId();

  const report = {
    ...reportData,

    reportId,
  };

  const result =
    await Report.findOneAndUpdate(
      {
        ownerId:
          normalizedOwnerId,
      },

      {
        $push: {
          reports:
            report,
        },
      },

      {
        new: true,

        upsert: true,

        setDefaultsOnInsert:
          true,

        runValidators:
          true,
      },
    ).lean();

  if (!result) {
    return null;
  }

  const createdReport =
    result.reports?.find(
      (item) =>
        String(
          item.reportId,
        ) ===
        String(reportId),
    );

  return attachOwnerId(
    createdReport,
    result.ownerId ||
      normalizedOwnerId,
  );
};

const findById = async (
  reportId,
) => {
  const normalizedReportId =
    normalizeReportId(
      reportId,
    );

  const objectId =
    normalizeObjectId(
      normalizedReportId,
    );

  const result =
    await Report.findOne({
      reports: {
        $elemMatch: {
          reportId:
            objectId,
        },
      },
    }).lean();

  if (!result) {
    return null;
  }

  const report =
    result.reports?.find(
      (item) =>
        String(
          item.reportId,
        ) ===
        String(objectId),
    );

  return attachOwnerId(
    report,
    result.ownerId,
  );
};

const findByOwnerId = async (
  ownerId,
) => {
  const normalizedOwnerId =
    normalizeOwnerId(
      ownerId,
    );

  const result =
    await Report.findOne({
      ownerId:
        normalizedOwnerId,
    }).lean();

  if (!result) {
    return [];
  }

  return (
    result.reports || []
  ).map(
    (report) =>
      attachOwnerId(
        report,
        result.ownerId,
      ),
  );
};

const findByReviewId = async (
  reviewId,
) => {
  const normalizedReviewId =
    normalizeReviewId(
      reviewId,
    );

  const objectId =
    normalizeObjectId(
      normalizedReviewId,
      'Invalid review ID.',
    );

  const documents =
    await Report.find({
      reports: {
        $elemMatch: {
          reviewId:
            objectId,
        },
      },
    }).lean();

  return documents
    .flatMap(
      (document) =>
        (
          document.reports ||
          []
        )
          .filter(
            (report) =>
              String(
                report.reviewId,
              ) ===
              String(objectId),
          )
          .map(
            (report) =>
              attachOwnerId(
                report,
                document.ownerId,
              ),
          ),
    )
    .sort(
      (a, b) =>
        new Date(
          a.createdAt || 0,
        ) -
        new Date(
          b.createdAt || 0,
        ),
    );
};

const findByReviewAndFormat =
  async (
    reviewId,
    format,
  ) => {
    const normalizedReviewId =
      normalizeReviewId(
        reviewId,
      );

    const objectId =
      normalizeObjectId(
        normalizedReviewId,
        'Invalid review ID.',
      );

    if (
      typeof format !== 'string' ||
      !format.trim()
    ) {
      throw new TypeError(
        'Report format is required.',
      );
    }

    const normalizedFormat =
      format.trim().toLowerCase();

    const documents =
      await Report.find({
        reports: {
          $elemMatch: {
            reviewId:
              objectId,

            format:
              normalizedFormat,
          },
        },
      }).lean();

    for (
      const document of documents
    ) {
      const report =
        (
          document.reports ||
          []
        ).find(
          (item) =>
            String(
              item.reviewId,
            ) ===
              String(objectId) &&
            item.format ===
              normalizedFormat,
        );

      if (report) {
        return attachOwnerId(
          report,
          document.ownerId,
        );
      }
    }

    return null;
  };

const updateById = async (
  reportId,
  updates,
) => {
  const normalizedReportId =
    normalizeReportId(
      reportId,
    );

  const objectId =
    normalizeObjectId(
      normalizedReportId,
    );

  if (
    !updates ||
    typeof updates !== 'object' ||
    Array.isArray(updates)
  ) {
    throw new TypeError(
      'Report update is required.',
    );
  }

  const updateEntries =
    Object.entries(
      updates,
    );

  if (
    updateEntries.length === 0
  ) {
    throw new TypeError(
      'Report update cannot be empty.',
    );
  }

  const nestedUpdates =
    Object.fromEntries(
      updateEntries.map(
        ([
          key,
          value,
        ]) => [
          `reports.$.${key}`,
          value,
        ],
      ),
    );

  const result =
    await Report.findOneAndUpdate(
      {
        reports: {
          $elemMatch: {
            reportId:
              objectId,
          },
        },
      },

      {
        $set:
          nestedUpdates,
      },

      {
        new: true,

        runValidators:
          true,

        lean: true,
      },
    );

  if (!result) {
    return null;
  }

  const report =
    result.reports?.find(
      (item) =>
        String(
          item.reportId,
        ) ===
        String(objectId),
    );

  return attachOwnerId(
    report,
    result.ownerId,
  );
};

const markGenerating =
  async ({
    id,
  }) =>
    updateById(
      id,
      {
        status:
          'generating',

        errorCode:
          null,
      },
    );

const markCompleted =
  async ({
    id,
    storageProvider,
    publicId,
    secureUrl,
    resourceType,
  }) =>
    updateById(
      id,
      {
        status:
          'completed',

        storageProvider,

        publicId,

        secureUrl,

        resourceType,

        errorCode:
          null,
      },
    );

const markFailed =
  async ({
    id,
    errorCode,
  }) =>
    updateById(
      id,
      {
        status:
          'failed',

        errorCode:
          String(
            errorCode ||
              'REPORT_GENERATION_FAILED',
          ),
      },
    );

const reportRepository =
  Object.freeze({
    create,

    findById,

    findByOwnerId,

    findByReviewId,

    findByReviewAndFormat,

    updateById,

    markGenerating,

    markCompleted,

    markFailed,
  });

export {
  create,

  findById,

  findByOwnerId,

  findByReviewId,

  findByReviewAndFormat,

  updateById,

  markGenerating,

  markCompleted,

  markFailed,

  reportRepository,
};

export default reportRepository;