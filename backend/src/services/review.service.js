import { logger } from "../utils/logger.js";
﻿import {
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
  accessContext = null,
  user = null,
  company = null
}) {
  const access = await getAnalysisAccess(accessContext);

  const processed = await processReviewInput({
    input,
    file,
    maxSourceSize: access.limits.maxSourceSize
  });

  const language = detectLanguage({
    language: processed.language,
    fileName: processed.fileName,
    code: processed.code
  });

  const review = await reviewRepository.create({
    user: user || null,
    company: company || null,
    source: processed.sourceType,
    fileName: processed.fileName,
    language,
    fileExtension: processed.fileExtension,
    sourceSize: processed.sourceSize,
    status: "pending",
    progress: 0,
    startedAt: new Date()
  });

  return {
    reviewId: review._id.toString(),
    status: "pending",
    processed,
    access,
    language
  };
}

/**
 * Executes the review analysis pipeline asynchronously in the background.
 */
export async function executeReviewPipeline(
  reviewId,
  { processed, access, language }
) {
  try {
    // Stage 1: Parsing
    await updateReviewProgress(reviewId, "parsing", 15);
    const parsed = parseSource({
      code: processed.code,
      language,
      fileName: processed.fileName
    });

    // Review context
    const context = createReviewContext({
      code: processed.code,
      fileName: processed.fileName,
      fileExtension: processed.fileExtension,
      language,
      sourceSize: processed.sourceSize,
      parsed,
      companyRules: processed.companyRules
    });

    // Stage 2..5: Analyzers -> Rules -> AI -> Score
    const result = await runReview(context, access, async (stage, progress) => {
      await updateReviewProgress(reviewId, stage, progress);
    });

    // Stage 6: Atomic persistence
    await withDatabaseTransaction(async (session) => {
      await persistReviewResult({
        reviewId,
        result,
        session
      });

      await reviewRepository.updateById(
        reviewId,
        {
          status: "completed",
          progress: 100,
          summary: result.summary,
          findingCount: Array.isArray(result.findings)
            ? result.findings.length
            : 0,
          completedAt: new Date(),
          failedAt: null,
          errorMessage: null
        },
        { session }
      );
    });

    logger.info("Review pipeline completed successfully", { reviewId });
    return result;
  } catch (error) {
    logger.error("Review pipeline execution failed", {
      reviewId,
      error: error.message,
      stack: error.stack
    });

    await markReviewFailed(reviewId, error);
  }
}

async function updateReviewProgress(reviewId, status, progress) {
  try {
    await reviewRepository.updateById(reviewId, {
      status,
      progress
    });
  } catch (err) {
    logger.warn("Failed to update review progress state", {
      reviewId,
      status,
      error: err.message
    });
  }
}

export async function getReview(
  reviewId,
  { user = null } = {}
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

  // Cross-tenant access isolation
  if (user && user.role !== "platform_admin") {
    if (user.role === "company_admin" && user.company) {
      if (review.company && review.company.toString() !== user.company.toString()) {
        const error = new Error("Review not found.");
        error.statusCode = 404;
        throw error;
      }
    } else {
      const uid = (user._id || user.id || user.userId).toString();
      if (review.user && review.user.toString() !== uid) {
        const error = new Error("Review not found.");
        error.statusCode = 404;
        throw error;
      }
    }
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
    reviewId: review._id.toString(),
    status: review.status,
    progress: review.progress ?? (review.status === "completed" ? 100 : 0),
    review,
    summary: review.summary || null,
    findings,
    score,
    aiAnalysis,
    errorMessage: review.errorMessage || null
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

function getLangBadge(lang) {
  if (!lang) return "CODE";
  const l = lang.toLowerCase();
  if (l.includes("typescript")) return "TS";
  if (l.includes("javascript")) return "JS";
  if (l.includes("python")) return "PY";
  if (l.includes("java")) return "JV";
  if (l.includes("php")) return "PHP";
  if (l.includes("go")) return "GO";
  if (l.includes("rust")) return "RS";
  if (l.includes("c++") || l.includes("cpp")) return "C++";
  if (l.includes("c#") || l.includes("csharp")) return "C#";
  return lang.slice(0, 3).toUpperCase();
}

function getRelativeDate(d) {
  if (!d) return "Recently";
  const now = Date.now();
  const diffMs = now - new Date(d).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (diffDay === 1) return "Yesterday";
  if (diffDay > 1) return `${diffDay} days ago`;
  if (diffHour === 1) return "1 hour ago";
  if (diffHour > 1) return `${diffHour} hours ago`;
  if (diffMin === 1) return "1 minute ago";
  if (diffMin > 1) return `${diffMin} minutes ago`;
  return "Just now";
}

function formatDate(d) {
  if (!d) return "Today";
  const date = new Date(d);
  const isToday = new Date().toDateString() === date.toDateString();
  const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (isToday) return `Today, ${time}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildReviewFilter(user) {
  if (!user) return {};
  if (user.role === "platform_admin") return {};
  if (user.role === "company_admin" && user.company) {
    return { company: user.company };
  }
  const uid = user._id || user.id || user.userId;
  return { user: uid };
}

export async function listReviews({ limit = 20, user = null } = {}) {
  const filter = buildReviewFilter(user);
  const reviews = await reviewRepository.findRecent(limit, filter);
  if (!reviews || reviews.length === 0) return [];

  const reviewIds = reviews.map((r) => r._id);
  const scores = await scoreRepository.findByReviewIds(reviewIds);
  const scoreMap = new Map(scores.map((s) => [s.reviewId.toString(), s]));

  return reviews.map((r) => {
    const s = scoreMap.get(r._id.toString());
    const scoreVal = s ? s.overall : (r.score?.overall ?? (r.status === "completed" ? 85 : 0));
    const totalFindings = r.summary?.totalFindings ?? 0;
    const severityCounts = {
      critical: r.summary?.critical ?? 0,
      high: r.summary?.high ?? 0,
      medium: r.summary?.medium ?? 0,
      low: r.summary?.low ?? 0,
    };

    return {
      id: r._id.toString(),
      reviewId: r._id.toString(),
      name: r.fileName || `source.${r.fileExtension || "txt"}`,
      lang: r.language ? r.language.charAt(0).toUpperCase() + r.language.slice(1) : "Unknown",
      langBadge: getLangBadge(r.language),
      score: scoreVal,
      date: formatDate(r.createdAt),
      relativeDate: getRelativeDate(r.createdAt),
      status: r.status === "completed" ? (scoreVal < 70 ? "Needs attention" : "Completed") : r.status,
      findings: totalFindings,
      severityCounts,
      createdAt: r.createdAt
    };
  });
}

export async function getDashboardMetrics({ user = null } = {}) {
  const filter = buildReviewFilter(user);
  const totalReviewsCount = await reviewRepository.countAll(filter);

  // If a scoped user has 0 reviews, return an isolated empty dashboard
  if (user && totalReviewsCount === 0) {
    return {
      totalReviews: 0,
      totalFindings: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      resolvedPercentage: 100,
      averageScore: 0,
      categoryHealth: {
        security: 100,
        bugs: 100,
        quality: 100,
        performance: 100
      },
      scoreTrend: [],
      recentReviews: [],
      openFindings: []
    };
  }

  const userReviewIds = user ? await reviewRepository.findIds(filter) : null;
  const recentReviewsList = await listReviews({ limit: 10, user });
  const openFindingsList = await findingRepository.findOpenFindings(20, userReviewIds);
  const { total: totalFindingsCount, resolved: resolvedFindingsCount } = await findingRepository.countFindings(userReviewIds);

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const f of openFindingsList) {
    const sev = (f.severity || "").toLowerCase();
    if (sev === "critical") criticalCount++;
    else if (sev === "high") highCount++;
    else if (sev === "medium") mediumCount++;
    else if (sev === "low") lowCount++;
  }

  const recentScores = await scoreRepository.findRecent(20, userReviewIds);
  let avgScore = 0;
  let catHealth = {
    security: 100,
    bugs: 100,
    quality: 100,
    performance: 100
  };

  if (recentScores.length > 0) {
    const totalScore = recentScores.reduce((acc, s) => acc + (s.overall || 0), 0);
    avgScore = Math.round(totalScore / recentScores.length);

    catHealth = {
      security: Math.round(recentScores.reduce((acc, s) => acc + (s.security ?? 0), 0) / recentScores.length),
      bugs: Math.round(recentScores.reduce((acc, s) => acc + (s.bugs ?? 0), 0) / recentScores.length),
      quality: Math.round(recentScores.reduce((acc, s) => acc + (s.quality ?? 0), 0) / recentScores.length),
      performance: Math.round(recentScores.reduce((acc, s) => acc + (s.performance ?? 0), 0) / recentScores.length),
    };
  }

  const trendScores = [...recentScores].reverse().slice(-5);
  const scoreTrend = trendScores.map((s) => ({
    label: new Date(s.createdAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: s.overall
  }));

  const totalOpen = criticalCount + highCount + mediumCount + lowCount;
  const resolvedPct = totalFindingsCount > 0 
    ? Math.round((resolvedFindingsCount / totalFindingsCount) * 100)
    : 100;

  const formattedOpenFindings = openFindingsList.map((f) => ({
    id: f._id.toString(),
    title: f.title,
    severity: (f.severity || "info").toUpperCase(),
    file: f.location?.filePath || f.file || "src/code",
    category: f.category ? f.category.charAt(0).toUpperCase() + f.category.slice(1) : "General",
    reviewId: f.reviewId ? f.reviewId.toString() : null
  }));

  return {
    totalReviews: totalReviewsCount,
    totalFindings: totalOpen,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    resolvedPercentage: resolvedPct,
    averageScore: avgScore,
    categoryHealth: catHealth,
    scoreTrend,
    recentReviews: recentReviewsList,
    openFindings: formattedOpenFindings
  };
}
