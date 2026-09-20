import fs from "node:fs";
import path from "node:path";

import {
  reviewRepository
} from "../database/repositories/review.repository.js";

import {
  findingRepository
} from "../database/repositories/finding.repository.js";

import {
  scoreRepository
} from "../database/repositories/score.repository.js";

import {
  aiAnalysisRepository
} from "../database/repositories/aiAnalysis.repository.js";

import {
  reportRepository
} from "../database/repositories/report.repository.js";

import {
  uploadPDF
} from "../storage/cloudinary/cloudinary.upload.js";

import {
  formatReport
} from "./reportFormatter.js";

import {
  generateJSONReport
} from "./jsonReport.js";

import {
  generatePDFReport
} from "./pdfReport.js";

const REPORT_DIRECTORY =
  path.resolve(
    "storage/reports"
  );

export async function generateReport({
  reviewId,
  type,
  access
}) {
  const review =
    await reviewRepository.findById(
      reviewId
    );

  if (!review) {
    throw createError(
      "Review not found.",
      404
    );
  }

  if (
    review.status !==
    "completed"
  ) {
    throw createError(
      "Reports can only be generated for completed reviews.",
      409
    );
  }

  assertReportAccess(
    type,
    access
  );

  const findings =
    await findingRepository.findByReviewId(
      reviewId
    );

  const score =
    await scoreRepository.findByReviewId(
      reviewId
    );

  const aiAnalysis =
    await aiAnalysisRepository
      .findByReviewId(
        reviewId
      );

  const report =
    formatReport({
      review,
      findings,
      score,
      aiAnalysis
    });

  const existing =
    await reportRepository
      .findLatestByReviewIdAndType(
        reviewId,
        type
      );

  const reportRecord =
    existing ||
    await reportRepository.create({
      reviewId,
      type,
      status: "generating",
      fileName:
        buildFileName(
          reviewId,
          type
        )
    });

  try {
    if (
      type === "json"
    ) {
      const content =
        generateJSONReport(
          report
        );

      await reportRepository.updateById(
        reportRecord._id,
        {
          status: "completed",
          content,
          fileName:
            buildFileName(
              reviewId,
              "json"
            )
        }
      );

      return reportRepository.findById(
        reportRecord._id
      );
    }

    const pdf =
      await generatePDFReport({
        report,
        outputDirectory:
          REPORT_DIRECTORY,
        fileName:
          buildFileName(
            reviewId,
            "pdf"
          )
      });

    let uploaded;

    try {
      uploaded =
        await uploadPDF({
          filePath:
            pdf.filePath,

          publicId:
            `review-${reviewId}`
        });
    } finally {
      await removeTemporaryFile(
        pdf.filePath
      );
    }

    await reportRepository.updateById(
      reportRecord._id,
      {
        status: "completed",

        fileName:
          pdf.fileName,

        storageProvider:
          "cloudinary",

        storageUrl:
          uploaded.url,

        publicId:
          uploaded.publicId,

        filePath:
          null,

        error:
          null
      }
    );

    return reportRepository.findById(
      reportRecord._id
    );
  } catch (error) {
    await reportRepository.updateById(
      reportRecord._id,
      {
        status: "failed",

        error:
          error instanceof Error
            ? error.message
            : "Report generation failed."
      }
    );

    throw error;
  }
}

export async function getReport(
  reportId
) {
  const report =
    await reportRepository.findById(
      reportId
    );

  if (!report) {
    throw createError(
      "Report not found.",
      404
    );
  }

  return report;
}

export async function listReports(
  reviewId
) {
  return reportRepository.findByReviewId(
    reviewId
  );
}

function assertReportAccess(
  type,
  access
) {
  if (
    type === "pdf" &&
    access?.features?.pdf !== true
  ) {
    throw createError(
      "PDF reports are not enabled for this analysis access.",
      403
    );
  }
}

function buildFileName(
  reviewId,
  type
) {
  return `review-${reviewId}.${type}`;
}

async function removeTemporaryFile(
  filePath
) {
  if (!filePath) {
    return;
  }

  try {
    await fs.promises.unlink(
      filePath
    );
  } catch (error) {
    if (
      error?.code !==
      "ENOENT"
    ) {
      throw error;
    }
  }
}

function createError(
  message,
  statusCode
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
}