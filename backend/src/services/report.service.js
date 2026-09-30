import {
  buildReport,
} from "../reports/reportBuilder.js";

import {
  reviewRepository,
} from "../database/repositories/review.repository.js";

import {
  findByReviewId as findFindingsByReviewId,
} from "../database/repositories/finding.repository.js";

import {
  findByReviewId as findScoreByReviewId,
} from "../database/repositories/score.repository.js";

import {
  findByReviewId as findAiAnalysesByReviewId,
} from "../database/repositories/aiAnalysis.repository.js";

import {
  create as createReportRecord,
  findById as findReportById,
  findByReviewAndFormat,
  markGenerating,
  markCompleted,
  markFailed,
} from "../database/repositories/report.repository.js";

import {
  uploadReport,
} from "../storage/cloudinary/cloudinary.uploader.js";

import {
  assertFeatureAccess,
} from "../access/access.service.js";

import {
  AppError,
} from "../utils/errors.js";

const getReportFeature = (
  format,
) => {
  if (format === "json") {
    return "jsonReport";
  }

  if (format === "html") {
    return "htmlReport";
  }

  if (format === "pdf") {
    return "pdfReport";
  }

  throw new AppError({
    code:
      "UNSUPPORTED_REPORT_FORMAT",

    message:
      `Unsupported report format: ${format}`,

    statusCode: 400,
  });
};

const normalizeReportFormat = (
  format,
) => {
  const normalized =
    String(
      format || "json",
    )
      .trim()
      .toLowerCase();

  getReportFeature(
    normalized,
  );

  return normalized;
};

const normalizeAiAnalysis =
  (analyses) => {
    if (
      !Array.isArray(analyses) ||
      analyses.length === 0
    ) {
      return null;
    }

    const completed =
      analyses.filter(
        (item) =>
          item?.status ===
          "completed",
      );

    if (!completed.length) {
      return null;
    }

    return {
      enabled: true,

      provider:
        completed[0]?.provider ||
        null,

      status: "completed",

      summary:
        completed.find(
          (item) =>
            item?.analysisType ===
            "summary",
        )?.result ||
        null,

      findings:
        completed.filter(
          (item) =>
            item?.analysisType ===
            "finding_analysis",
        ),

      securityReview:
        completed.find(
          (item) =>
            item?.analysisType ===
            "security_review",
        )?.result ||
        null,

      codeImprovements:
        completed.filter(
          (item) =>
            item?.analysisType ===
            "code_improvement",
        ),
    };
  };

const getProjectData = (
  review,
) => ({
  id:
    review?.projectId ||
    null,

  name:
    review?.projectId
      ? `Project ${String(
          review.projectId,
        )}`
      : null,

  sourceType:
    review?.sourceType ||
    null,
});

const normalizeReportContent =
  (content, format) => {
    if (format === "pdf") {
      if (!Buffer.isBuffer(content)) {
        throw new AppError({
          code:
            "INVALID_PDF_REPORT_CONTENT",

          message:
            "PDF report content is invalid.",

          statusCode: 500,
        });
      }

      return content;
    }

    if (
      typeof content !==
      "string"
    ) {
      throw new AppError({
        code:
          "INVALID_REPORT_CONTENT",

        message:
          "Report content is invalid.",

        statusCode: 500,
      });
    }

    return content;
  };

const createReport = async ({
  reviewId,
  format = "json",
}) => {
  if (
    typeof reviewId !== "string" ||
    !reviewId.trim()
  ) {
    throw new AppError({
      code:
        "INVALID_REVIEW_ID",

      message:
        "Review ID is required.",

      statusCode: 400,
    });
  }

  const normalizedReviewId =
    reviewId.trim();

  const normalizedFormat =
    normalizeReportFormat(
      format,
    );

  const feature =
    getReportFeature(
      normalizedFormat,
    );

  assertFeatureAccess(
    feature,
  );

  const review =
    await reviewRepository.findById(
      normalizedReviewId,
    );

  if (!review) {
    throw new AppError({
      code:
        "REVIEW_NOT_FOUND",

      message:
        "Review not found.",

      statusCode: 404,
    });
  }

  if (
    review.status !==
    "completed"
  ) {
    throw new AppError({
      code:
        "REVIEW_NOT_COMPLETED",

      message:
        "A report can only be generated for a completed review.",

      statusCode: 409,

      details: {
        reviewId:
          normalizedReviewId,

        status:
          review.status,
      },
    });
  }

  let report =
    await findByReviewAndFormat(
      normalizedReviewId,
      normalizedFormat,
    );

  if (!report) {
    report =
      await createReportRecord({
        reviewId:
          normalizedReviewId,

        format:
          normalizedFormat,

        status:
          "pending",

        storageProvider:
          null,

        publicId:
          null,

        secureUrl:
          null,

        resourceType:
          null,

        errorCode:
          null,
      });
  }

  if (
    report?.status ===
      "completed" &&
    report?.secureUrl
  ) {
    return {
      reportId:
        report._id.toString(),

      reviewId:
        normalizedReviewId,

      format:
        normalizedFormat,

      status:
        report.status,

      storageProvider:
        report.storageProvider,

      publicId:
        report.publicId,

      secureUrl:
        report.secureUrl,

      resourceType:
        report.resourceType,
    };
  }

  return generateReport({
    reportId:
      report._id.toString(),
  });
};

const generateReport =
  async ({
    reportId,
  }) => {
    if (
      typeof reportId !==
        "string" ||
      !reportId.trim()
    ) {
      throw new AppError({
        code:
          "INVALID_REPORT_ID",

        message:
          "Report ID is required.",

        statusCode: 400,
      });
    }

    const report =
      await findReportById(
        reportId.trim(),
      );

    if (!report) {
      throw new AppError({
        code:
          "REPORT_NOT_FOUND",

        message:
          "Report not found.",

        statusCode: 404,
      });
    }

    const format =
      normalizeReportFormat(
        report.format,
      );

    const feature =
      getReportFeature(
        format,
      );

    assertFeatureAccess(
      feature,
    );

    const review =
      await reviewRepository.findById(
        report.reviewId,
      );

    if (!review) {
      throw new AppError({
        code:
          "REVIEW_NOT_FOUND",

        message:
          "The review associated with the report was not found.",

        statusCode: 404,
      });
    }

    if (
      review.status !==
      "completed"
    ) {
      throw new AppError({
        code:
          "REVIEW_NOT_COMPLETED",

        message:
          "A report can only be generated for a completed review.",

        statusCode: 409,
      });
    }

    await markGenerating({
      id:
        report._id.toString(),
    });

    try {
      const findings =
        await findFindingsByReviewId(
          report.reviewId,
        );

      const score =
        await findScoreByReviewId(
          report.reviewId,
        );

      const aiAnalyses =
        await findAiAnalysesByReviewId(
          report.reviewId,
        );

      const aiAnalysis =
        normalizeAiAnalysis(
          aiAnalyses,
        );

      const project =
        getProjectData(
          review,
        );

      const builtReport =
        buildReport({
          format,

          review,

          project,

          findings,

          score,

          aiAnalysis,
        });

      const content =
        normalizeReportContent(
          builtReport.content,
          format,
        );

      const uploaded =
        await uploadReport({
          reviewId:
            report.reviewId.toString(),

          format,

          content,
        });

      const completed =
        await markCompleted({
          id:
            report._id.toString(),

          storageProvider:
            "cloudinary",

          publicId:
            uploaded.publicId,

          secureUrl:
            uploaded.secureUrl,

          resourceType:
            uploaded.resourceType,
        });

      return {
        reportId:
          report._id.toString(),

        reviewId:
          report.reviewId.toString(),

        format,

        status:
          completed?.status ||
          "completed",

        storageProvider:
          completed?.storageProvider ||
          "cloudinary",

        publicId:
          completed?.publicId ||
          uploaded.publicId,

        secureUrl:
          completed?.secureUrl ||
          uploaded.secureUrl,

        resourceType:
          completed?.resourceType ||
          uploaded.resourceType,
      };
    } catch (error) {
      await markFailed({
        id:
          report._id.toString(),

        errorCode:
          error?.code ||
          "REPORT_GENERATION_FAILED",
      });

      throw error;
    }
  };

export {
  createReport,
  generateReport,
};

export default Object.freeze({
  createReport,
  generateReport,
});