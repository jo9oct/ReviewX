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
  withDatabaseTransaction
} from "../database/connection.js";


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
  /*
   * ----------------------------------------------------------
   * Analysis access
   * ----------------------------------------------------------
   */
  const access =
    await getAnalysisAccess(
      accessContext
    );


  /*
   * ----------------------------------------------------------
   * Input processing
   * ----------------------------------------------------------
   *
   * Validation and source processing happen before the Review
   * document is created.
   */
  const processed =
    await processReviewInput({
      input,
      file,

      maxSourceSize:
        access
          .limits
          .maxSourceSize
    });


  /*
   * ----------------------------------------------------------
   * Language detection
   * ----------------------------------------------------------
   */
  const language =
    detectLanguage({
      language:
        processed.language,

      fileName:
        processed.fileName,

      code:
        processed.code
    });


  /*
   * ----------------------------------------------------------
   * Create Review execution record
   * ----------------------------------------------------------
   *
   * This record intentionally exists outside the result
   * transaction.
   *
   * It represents the execution itself.
   */
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

      status:
        "running",

      startedAt:
        new Date()
    });


  try {
    /*
     * --------------------------------------------------------
     * Parsing
     * --------------------------------------------------------
     */
    const parsed =
      parseSource({
        code:
          processed.code,

        language,

        fileName:
          processed.fileName
      });


    /*
     * --------------------------------------------------------
     * Review context
     * --------------------------------------------------------
     */
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


    /*
     * --------------------------------------------------------
     * Review engine
     * --------------------------------------------------------
     *
     * Runs:
     *
     * - analyzers
     * - company rules
     * - normalization
     * - merging
     * - deduplication
     * - evidence collection
     * - AI analysis
     * - scoring
     */
    const result =
      await runReview(
        context,
        access
      );


    /*
     * --------------------------------------------------------
     * Atomic result persistence
     * --------------------------------------------------------
     *
     * Every result write and the Review -> completed update
     * happen inside ONE MongoDB transaction.
     *
     * If any operation throws:
     *
     *     findings
     *     evidence
     *     score
     *     AI analysis
     *     completed state
     *
     * are all rolled back.
     */
    await withDatabaseTransaction(
      async (session) => {
        await persistReviewResult({
          reviewId:
            review._id,

          result,

          session
        });


        /*
         * ----------------------------------------------------
         * Mark Review completed INSIDE the transaction.
         * ----------------------------------------------------
         *
         * This guarantees that a Review cannot become
         * "completed" unless all result data was successfully
         * persisted.
         */
        await reviewRepository.updateById(
          review._id,

          {
            status:
              "completed",

            summary:
              result.summary,

            findingCount:
              Array.isArray(
                result.findings
              )
                ? result.findings.length
                : 0,

            completedAt:
              new Date(),

            failedAt:
              null,

            errorMessage:
              null
          },

          {
            session
          }
        );
      }
    );


    /*
     * --------------------------------------------------------
     * Success
     * --------------------------------------------------------
     */
    return {
      reviewId:
        review._id,

      result
    };
  } catch (error) {
    /*
     * --------------------------------------------------------
     * Failure recovery
     * --------------------------------------------------------
     *
     * If the transaction failed, MongoDB has already rolled
     * back all transactional writes.
     *
     * The failure state is deliberately saved OUTSIDE the
     * transaction so that the Review remains available as a
     * failed execution record.
     */
    await markReviewFailed(
      review._id,
      error
    );


    /*
     * Preserve the original error.
     */
    throw error;
  }
}



/*
 * ============================================================
 * Get Review
 * ============================================================
 */

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



/*
 * ============================================================
 * Failure State
 * ============================================================
 */

async function markReviewFailed(
  reviewId,
  error
) {
  const errorMessage =
    getSafeFailureMessage(
      error
    );


  try {
    await reviewRepository.updateById(
      reviewId,

      {
        status:
          "failed",

        errorMessage,

        failedAt:
          new Date()
      }
    );
  } catch (stateError) {
    /*
     * Do not replace the original error
     * with a failure-state persistence error.
     */
    console.error(
      "Failed to persist review failure state:",
      stateError
    );
  }
}



/*
 * ============================================================
 * Safe Failure Message
 * ============================================================
 */

function getSafeFailureMessage(
  error
) {
  if (
    !error ||
    typeof error !==
      "object"
  ) {
    return "Review failed.";
  }


  const statusCode =
    Number(
      error.statusCode
    );


  /*
   * Client/application errors may expose their
   * safe message.
   */
  if (
    Number.isInteger(
      statusCode
    ) &&

    statusCode >= 400 &&

    statusCode < 500 &&

    typeof error.message ===
      "string" &&

    error.message.trim()
  ) {
    return error.message.trim();
  }


  /*
   * Internal implementation details must not be
   * stored as the user-facing failure message.
   */
  return (
    "Review failed due to an internal processing error."
  );
}



/*
 * ============================================================
 * Transactional Result Persistence
 * ============================================================
 */

async function persistReviewResult({
  reviewId,
  result,
  session
}) {
  const findings =
    Array.isArray(
      result.findings
    )
      ? result.findings
      : [];


  /*
   * Maps analyzer fingerprints to the actual MongoDB
   * Finding _id generated during persistence.
   *
   * This is required because AI analysis references
   * findings through findingId.
   */
  const findingIdsByFingerprint =
    new Map();


  /*
   * ----------------------------------------------------------
   * Findings + Evidence
   * ----------------------------------------------------------
   */
  for (
    const finding
    of findings
  ) {
    const savedFinding =
      await findingRepository.create(
        {
          ...finding,

          reviewId
        },

        {
          session
        }
      );


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


    /*
     * Evidence is saved only after the Finding
     * has received its MongoDB _id.
     */
    for (
      const item
      of evidence
    ) {
      await evidenceRepository.create(
        {
          ...item,

          reviewId,

          findingId:
            savedFinding._id
        },

        {
          session
        }
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * Score
   * ----------------------------------------------------------
   */
  if (
    result.score
  ) {
    await scoreRepository.upsertByReviewId(
      reviewId,

      result.score,

      {
        session
      }
    );
  }


  /*
   * ----------------------------------------------------------
   * AI Analysis
   * ----------------------------------------------------------
   */
  if (
    result.aiAnalysis
  ) {
    const aiFindings =
      Array.isArray(
        result
          .aiAnalysis
          .findings
      )
        ? result
            .aiAnalysis
            .findings
        : [];


    const persistedAiFindings =
      [];


    /*
     * Convert AI fingerprints into actual
     * persisted Finding IDs.
     */
    for (
      const aiFinding
      of aiFindings
    ) {
      const findingId =
        findingIdsByFingerprint.get(
          String(
            aiFinding
              .findingFingerprint
          )
        );


      /*
       * AI must never create an orphan AI finding.
       */
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
            result
              .aiAnalysis
              .provider,

          model:
            result
              .aiAnalysis
              .model,

          status:
            result
              .aiAnalysis
              .status,

          summary:
            result
              .aiAnalysis
              .summary,

          findings:
            persistedAiFindings,

          errorMessage:
            Array.isArray(
              result
                .aiAnalysis
                .errors
            )
              ? result
                  .aiAnalysis
                  .errors
                  .join("; ")
              : null
        },

        {
          session
        }
      );
  }
}