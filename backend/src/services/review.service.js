import {
  processReviewInput
} from "./file.service.js";

import {
  getAnalysisAccess
} from "./analysisAccess.service.js";

import {
  detectLanguage
} from "../engine/languageDetector.js";

import {
  parseSource
} from "../parsers/parserManager.js";

import {
  createReviewContext
} from "../engine/reviewContext.js";

import {
  runReview
} from "../engine/reviewEngine.js";

import {
  reviewRepository
} from "../database/repositories/review.repository.js";

import {
  findingRepository
} from "../database/repositories/finding.repository.js";

import {
  evidenceRepository
} from "../database/repositories/evidence.repository.js";

import {
  scoreRepository
} from "../database/repositories/score.repository.js";

import {
  aiAnalysisRepository
} from "../database/repositories/aiAnalysis.repository.js";

export async function createReview({
  input,
  file = null,
  accessContext = null
}) {
  const access =
    await getAnalysisAccess(
      accessContext
    );

  const processed =
    await processReviewInput({
      input,
      file,
      maxSourceSize:
        access.limits
          .maxSourceSize
    });

  const language =
    detectLanguage({
      language:
        processed.language,
      fileName:
        processed.fileName,
      code:
        processed.code
    });

  const parsed =
    parseSource({
      code:
        processed.code,
      language,
      fileName:
        processed.fileName
    });

  const context =
    createReviewContext({
      code:
        processed.code,
      fileName:
        processed.fileName,
      fileExtension:
        processed.fileExtension,
      language,
      sourceSize:
        processed.sourceSize,
      parsed,
      companyRules:
        processed.companyRules
    });

  const review =
    await reviewRepository.create({
      source:
        processed.sourceType,

      fileName:
        processed.fileName,

      language,

      fileExtension:
        processed.fileExtension,

      sourceSize:
        processed.sourceSize,

      status: "running",

      startedAt:
        new Date()
    });

  try {
    const result =
      await runReview(
        context,
        access
      );

    await persistReviewResult({
      reviewId:
        review._id,
      result
    });

    await reviewRepository.updateById(
      review._id,
      {
        status: "completed",

        summary:
          result.summary,

        findingCount:
          result.findings.length,

        completedAt:
          new Date()
      }
    );

    return {
      reviewId:
        review._id,

      result
    };
  } catch (error) {
    await reviewRepository.updateById(
      review._id,
      {
        status: "failed",

        errorMessage:
          error instanceof Error
            ? error.message
            : "Review failed.",

        failedAt:
          new Date()
      }
    );

    throw error;
  }
}

export async function getReview(
  reviewId
) {
  const review =
    await reviewRepository.findById(
      reviewId
    );

  if (!review) {
    const error =
      new Error(
        "Review not found."
      );

    error.statusCode =
      404;

    throw error;
  }

  const findings =
    await findingRepository.findByReviewId(
      reviewId
    );

  const score =
    await scoreRepository.findByReviewId(
      reviewId
    );

  const aiAnalysis =
    await aiAnalysisRepository.findByReviewId(
      reviewId
    );

  return {
    review,
    findings,
    score,
    aiAnalysis
  };
}

async function persistReviewResult({
  reviewId,
  result
}) {
  const findings =
    Array.isArray(
      result.findings
    )
      ? result.findings
      : [];

  const findingIdsByFingerprint =
    new Map();

  for (
    const finding
    of findings
  ) {
    const savedFinding =
      await findingRepository.create({
        ...finding,
        reviewId
      });

    if (
      finding.fingerprint
    ) {
      findingIdsByFingerprint.set(
        String(
          finding.fingerprint
        ),
        savedFinding._id
      );
    }

    const evidence =
      Array.isArray(
        finding.evidence
      )
        ? finding.evidence
        : [];

    for (
      const item
      of evidence
    ) {
      await evidenceRepository.create({
        ...item,
        reviewId,
        findingId:
          savedFinding._id
      });
    }
  }

  if (
    result.score
  ) {
    await scoreRepository.upsertByReviewId(
      reviewId,
      result.score
    );
  }

  if (
    result.aiAnalysis
  ) {
    const aiFindings =
      Array.isArray(
        result.aiAnalysis.findings
      )
        ? result.aiAnalysis.findings
        : [];

    const persistedAiFindings = [];

    for (
      const aiFinding
      of aiFindings
    ) {
      const findingId =
        findingIdsByFingerprint.get(
          String(
            aiFinding.findingFingerprint
          )
        );

      if (
        !findingId
      ) {
        console.warn(
          "AI finding fingerprint does not match a persisted finding:",
          aiFinding.findingFingerprint
        );

        continue;
      }

      persistedAiFindings.push({
        findingId,

        explanation:
          aiFinding.explanation,

        impact:
          aiFinding.impact,

        fix:
          aiFinding.fix,

        improvedCode:
          aiFinding.improvedCode,

        securityExplanation:
          aiFinding.securityExplanation
      });
    }

    await aiAnalysisRepository
      .upsertByReviewId(
        reviewId,
        {
          provider:
            result.aiAnalysis.provider,

          model:
            result.aiAnalysis.model,

          status:
            result.aiAnalysis.status,

          summary:
            result.aiAnalysis.summary,

          findings:
            persistedAiFindings,

          errorMessage:
            Array.isArray(
              result.aiAnalysis.errors
            )
              ? result.aiAnalysis.errors.join(
                  "; "
                )
              : null
        }
      );
  }
}