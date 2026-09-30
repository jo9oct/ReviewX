import {
  createProjectIdentity,
} from '../input/projectNormalizer.js';

import {
  normalizeSourceInput,
} from '../input/sourceNormalizer.js';

import {
  validateNormalizedSource,
} from '../input/sourceValidator.js';

import {
  reviewEngine,
} from '../engine/reviewEngine.js';

import {
  enqueueReviewJob,
} from '../jobs/review.job.js';

import {
  reviewRepository,
} from '../database/repositories/review.repository.js';

import {
  projectRepository,
} from '../database/repositories/project.repository.js';

import {
  findingRepository,
} from '../database/repositories/finding.repository.js';

import {
  evidenceRepository,
} from '../database/repositories/evidence.repository.js';

import {
  scoreRepository,
} from '../database/repositories/score.repository.js';

import {
  aiAnalysisRepository,
} from '../database/repositories/aiAnalysis.repository.js';

import {
  assertFeatureAccess,
  assertReviewLimits,
  getAccessContext,
} from '../access/access.service.js';

import {
  getRepository,
} from './github.service.js';

import aiConfig from '../config/ai.config.js';

import {
  AppError,
} from '../utils/errors.js';

const getReviewId = (
  review,
) =>
  review?.id ||
  review?._id?.toString?.() ||
  review?._id ||
  null;

const normalizeReviewOptions = (
  options = {},
) => {
  if (
    !options ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new AppError({
      code: 'INVALID_REVIEW_OPTIONS',
      message:
        'Review options are invalid.',
      statusCode: 400,
    });
  }

  return {
    aiAnalysis:
      options.aiAnalysis === true,

    aiRemediation:
      options.aiRemediation === true,

    advancedAnalysis:
      options.advancedAnalysis === true,
  };
};

const assertSourceFeatureAccess = (
  source,
) => {
  if (
    !source ||
    typeof source !== 'object'
  ) {
    throw new AppError({
      code: 'INVALID_SOURCE',
      message:
        'The review source is invalid.',
      statusCode: 400,
    });
  }

  if (
    source.type === 'archive'
  ) {
    assertFeatureAccess(
      'archiveUpload',
    );
  }

  if (
    source.type === 'github'
  ) {
    assertFeatureAccess(
      'githubIntegration',
    );
  }
};

const assertRequestedFeatures = (
  options,
) => {
  if (options.aiAnalysis) {
    assertFeatureAccess(
      'aiAnalysis',
    );
  }

  if (options.aiRemediation) {
    assertFeatureAccess(
      'aiRemediation',
    );

    if (!options.aiAnalysis) {
      throw new AppError({
        code:
          'AI_REMEDIATION_REQUIRES_AI_ANALYSIS',

        message:
          'AI remediation requires AI analysis to be enabled.',

        statusCode: 400,
      });
    }
  }

  if (options.advancedAnalysis) {
    assertFeatureAccess(
      'advancedAnalysis',
    );
  }
};

const calculateSourceStats = (
  source,
) => {
  const files =
    Array.isArray(source?.files)
      ? source.files
      : [];

  const totalFiles =
    files.length;

  const totalLines =
    files.reduce(
      (
        total,
        file,
      ) => {
        const content =
          typeof file?.content ===
          'string'
            ? file.content
            : '';

        if (!content) {
          return total;
        }

        return (
          total +
          content.split(
            /\r\n|\r|\n/,
          ).length
        );
      },
      0,
    );

  return {
    totalFiles,
    totalLines,
  };
};

/*
 * Finding location normalization
 *
 * The finding pipeline may expose line information through
 * slightly different normalized location representations.
 *
 * These helpers only read values that already exist on the
 * finding. They never invent source locations.
 */
const getFindingLineStart = (
  finding,
) => {
  const location =
    finding?.location || {};

  const evidence =
    finding?.evidence || {};

  const evidenceLocation =
    evidence?.location || {};

  return (
    location.lineStart ??
    location.startLine ??
    location.line ??
    location.start?.line ??
    evidence.lineStart ??
    evidence.startLine ??
    evidence.line ??
    evidence.start?.line ??
    evidenceLocation.lineStart ??
    evidenceLocation.startLine ??
    evidenceLocation.line ??
    evidenceLocation.start?.line ??
    null
  );
};

const getFindingLineEnd = (
  finding,
) => {
  const location =
    finding?.location || {};

  const evidence =
    finding?.evidence || {};

  const evidenceLocation =
    evidence?.location || {};

  const lineStart =
    getFindingLineStart(
      finding,
    );

  return (
    location.lineEnd ??
    location.endLine ??
    location.line ??
    location.end?.line ??
    evidence.lineEnd ??
    evidence.endLine ??
    evidence.line ??
    evidence.end?.line ??
    evidenceLocation.lineEnd ??
    evidenceLocation.endLine ??
    evidenceLocation.line ??
    evidenceLocation.end?.line ??
    lineStart ??
    null
  );
};

const getFindingSnippet = (
  finding,
) => {
  const evidence =
    finding?.evidence || {};

  if (
    typeof evidence?.snippet ===
    'string' &&
    evidence.snippet.length > 0
  ) {
    return evidence.snippet;
  }

  if (
    typeof evidence?.code ===
    'string' &&
    evidence.code.length > 0
  ) {
    return evidence.code;
  }

  if (
    typeof evidence?.text ===
    'string' &&
    evidence.text.length > 0
  ) {
    return evidence.text;
  }

  if (
    typeof evidence?.content ===
    'string' &&
    evidence.content.length > 0
  ) {
    return evidence.content;
  }

  return null;
};

const getFindingSourceHash = (
  finding,
) => {
  const evidence =
    finding?.evidence || {};

  return (
    evidence?.sourceHash ??
    evidence?.hash ??
    null
  );
};

const validateFindingEvidence = (
  finding,
) => {
  const lineStart =
    getFindingLineStart(
      finding,
    );

  const lineEnd =
    getFindingLineEnd(
      finding,
    );

  const snippet =
    getFindingSnippet(
      finding,
    );

  if (
    !Number.isInteger(
      lineStart,
    ) ||
    lineStart < 1
  ) {
    throw new AppError({
      code:
        'INVALID_FINDING_EVIDENCE',

      message:
        'A finding contains an invalid source start line and cannot be persisted.',

      statusCode: 500,
    });
  }

  if (
    !Number.isInteger(
      lineEnd,
    ) ||
    lineEnd < lineStart
  ) {
    throw new AppError({
      code:
        'INVALID_FINDING_EVIDENCE',

      message:
        'A finding contains an invalid source end line and cannot be persisted.',

      statusCode: 500,
    });
  }

  if (
    typeof snippet !== 'string' ||
    snippet.length === 0
  ) {
    throw new AppError({
      code:
        'INVALID_FINDING_EVIDENCE',

      message:
        'A finding does not contain source evidence and cannot be persisted.',

      statusCode: 500,
    });
  }

  return {
    lineStart,
    lineEnd,
    snippet,
    sourceHash:
      getFindingSourceHash(
        finding,
      ),
  };
};

const buildFindingDocuments = ({
  reviewId,
  projectId,
  findings,
}) =>
  findings.map(
    (finding) => {
      const evidence =
        validateFindingEvidence(
          finding,
        );

      return {
        reviewId,

        projectId:
          projectId || null,

        category:
          finding.category,

        ruleId:
          finding.ruleId,

        title:
          finding.title,

        description:
          finding.description,

        severity:
          finding.severity,

        confidence:
          finding.confidence,

        status:
          finding.status,

        filePath:
          finding.filePath,

        lineStart:
          evidence.lineStart,

        lineEnd:
          evidence.lineEnd,

        remediation:
          finding.remediation ||
          null,

        evidenceId:
          null,
      };
    },
  );

const buildEvidenceDocuments = ({
  reviewId,
  findingDocuments,
  findings,
}) =>
  findings.map(
    (
      finding,
      index,
    ) => {
      const findingDocument =
        findingDocuments[index];

      if (
        !findingDocument
      ) {
        throw new AppError({
          code:
            'FINDING_PERSISTENCE_MISMATCH',

          message:
            'Finding and evidence persistence records do not match.',

          statusCode: 500,
        });
      }

      const evidence =
        validateFindingEvidence(
          finding,
        );

      return {
        reviewId,

        findingId:
          findingDocument._id,

        filePath:
          finding.filePath,

        lineStart:
          evidence.lineStart,

        lineEnd:
          evidence.lineEnd,

        snippet:
          evidence.snippet,

        sourceHash:
          evidence.sourceHash,
      };
    },
  );

const persistFindings = async ({
  reviewId,
  projectId,
  findings,
}) => {
  if (
    !Array.isArray(findings) ||
    findings.length === 0
  ) {
    return [];
  }

  const findingDocuments =
    buildFindingDocuments({
      reviewId,
      projectId,
      findings,
    });

  const createdFindings =
    await findingRepository.createMany(
      findingDocuments,
    );

  if (
    createdFindings.length !==
    findings.length
  ) {
    throw new AppError({
      code:
        'FINDING_PERSISTENCE_MISMATCH',

      message:
        'The number of persisted findings does not match the analysis result.',

      statusCode: 500,
    });
  }

  const evidenceDocuments =
    buildEvidenceDocuments({
      reviewId,
      findingDocuments:
        createdFindings,
      findings,
    });

  const createdEvidence =
    await evidenceRepository.createMany(
      evidenceDocuments,
    );

  if (
    createdEvidence.length !==
    createdFindings.length
  ) {
    throw new AppError({
      code:
        'EVIDENCE_PERSISTENCE_MISMATCH',

      message:
        'The number of persisted evidence records does not match the findings.',

      statusCode: 500,
    });
  }

  for (
    let index = 0;
    index < createdFindings.length;
    index += 1
  ) {
    const finding =
      createdFindings[index];

    const evidence =
      createdEvidence[index];

    await findingRepository.updateById(
      finding._id,
      {
        evidenceId:
          evidence._id,
      },
    );
  }

  return createdFindings;
};

const persistScore = async ({
  reviewId,
  score,
}) => {
  if (
    !score ||
    typeof score !== 'object'
  ) {
    return null;
  }

  const categories =
    score.categories || {};

  return scoreRepository.upsertByReviewId(
    reviewId,
    {
      overall:
        score.overall,

      security:
        categories.security,

      bugs:
        categories.bug,

      quality:
        categories.quality,

      performance:
        categories.performance,
    },
  );
};

const normalizeAiProvider = (
  provider,
) => {
  const normalized =
    String(
      provider || '',
    )
      .trim()
      .toLowerCase();

  if (
    normalized === 'groq' ||
    normalized === 'openai'
  ) {
    return normalized;
  }

  return null;
};

const getAiModel = (
  provider,
) => {
  if (
    provider === 'groq'
  ) {
    return (
      aiConfig.groq.model ||
      'unknown'
    );
  }

  if (
    provider === 'openai'
  ) {
    return (
      aiConfig.openai.model ||
      'unknown'
    );
  }

  return 'unknown';
};

const persistAiAnalysis = async ({
  reviewId,
  aiAnalysis,
}) => {
  if (
    !aiAnalysis ||
    typeof aiAnalysis !== 'object'
  ) {
    return null;
  }

  const provider =
    normalizeAiProvider(
      aiAnalysis.provider,
    );

  if (!provider) {
    return null;
  }

  const status =
    [
      'pending',
      'running',
      'completed',
      'failed',
      'skipped',
    ].includes(
      aiAnalysis.status,
    )
      ? aiAnalysis.status
      : 'failed';

  return aiAnalysisRepository.create({
    reviewId,

    provider,

    model:
      getAiModel(
        provider,
      ),

    status,

    analysisType:
      'summary',

    result:
      aiAnalysis,

    errorCode:
      Array.isArray(
        aiAnalysis.errors,
      ) &&
      aiAnalysis.errors.length > 0
        ? String(
            aiAnalysis.errors[0],
          )
        : null,
  });
};

const buildFindingCounts = (
  findings,
) => {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (
    const finding of findings
  ) {
    if (
      Object.hasOwn(
        counts,
        finding.severity,
      )
    ) {
      counts[finding.severity] +=
        1;
    }
  }

  return counts;
};

const buildReviewUpdate = ({
  result,
  source,
  startedAt,
}) => {
  const findings =
    Array.isArray(
      result?.findings,
    )
      ? result.findings
      : [];

  const languages =
    Array.isArray(
      result?.files,
    )
      ? [
          ...new Set(
            result.files
              .map(
                (file) =>
                  file?.language,
              )
              .filter(Boolean),
          ),
        ]
      : [];

  const completedAt =
    new Date();

  return {
    status:
      'completed',

    languages,

    totalFiles:
      Array.isArray(
        source?.files,
      )
        ? source.files.length
        : 0,

    totalLines:
      calculateSourceStats(
        source,
      ).totalLines,

    findingCounts:
      buildFindingCounts(
        findings,
      ),

    score:
      typeof result?.score
        ?.overall === 'number'
        ? result.score.overall
        : null,

    startedAt:
      startedAt || null,

    completedAt,

    errorCode:
      null,
  };
};

const getReviewIdFromDocument = (
  review,
) => {
  const id =
    getReviewId(review);

  if (!id) {
    throw new AppError({
      code:
        'INVALID_REVIEW_IDENTIFIER',

      message:
        'Review does not contain a valid identifier.',

      statusCode: 500,
    });
  }

  return id;
};

const createProjectForReview = async ({
  project,
  source,
}) => {
  const existing =
    await projectRepository.findByNormalizedName(
      project.normalizedName,
      source.type,
    );

  if (existing) {
    return existing;
  }

  return projectRepository.create({
    name:
      project.name,

    normalizedName:
      project.normalizedName,

    sourceType:
      source.type,

    repository:
      source.type === 'github'
        ? {
            provider:
              'github',

            owner:
              source.owner ||
              source.repository
                ?.owner ||
              null,

            name:
              source.name ||
              source.repository
                ?.name ||
              null,

            defaultBranch:
              source.defaultBranch ||
              source.repository
                ?.defaultBranch ||
              null,
          }
        : undefined,
  });
};

const createReviewRecord = async ({
  projectId,
  source,
}) => {
  return reviewRepository.create({
    projectId,

    sourceType:
      source.type,

    status:
      'pending',

    languages: [],

    totalFiles:
      Array.isArray(
        source.files,
      )
        ? source.files.length
        : 0,

    totalLines:
      calculateSourceStats(
        source,
      ).totalLines,

    findingCounts: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    },

    score: null,

    startedAt: null,

    completedAt: null,

    errorCode: null,
  });
};

const resolveReviewSource = async (
  source,
) => {
  if (
    source?.type !== 'github'
  ) {
    return {
      source,
      context: {},
    };
  }

  const connectionId =
    typeof source.connectionId ===
    'string'
      ? source.connectionId.trim()
      : '';

  if (!connectionId) {
    throw new AppError({
      code:
        'GITHUB_CONNECTION_REQUIRED',

      message:
        'A GitHub connection is required for repository reviews.',

      statusCode: 400,
    });
  }

  if (
    !source.repository ||
    typeof source.repository !==
      'object' ||
    Array.isArray(
      source.repository,
    )
  ) {
    throw new AppError({
      code:
        'GITHUB_REPOSITORY_REQUIRED',

      message:
        'A GitHub repository is required for repository reviews.',

      statusCode: 400,
    });
  }

  const githubRepository =
    await getRepository({
      connectionId,

      owner:
        source.repository.owner,

      name:
        source.repository.name,

      ref:
        source.repository.ref,
    });

  return {
    source,

    context: {
      githubRepository,
    },
  };
};

const executeReview = async ({
  reviewId,
}) => {
  if (
    typeof reviewId !== 'string' ||
    !reviewId.trim()
  ) {
    throw new AppError({
      code:
        'INVALID_REVIEW_IDENTIFIER',

      message:
        'Review ID is required.',

      statusCode: 400,
    });
  }

  /*
   * The current architecture intentionally
   * does not persist submitted source code.
   *
   * Therefore a queued worker cannot
   * reconstruct a review from reviewId alone.
   *
   * This method is reserved for a future
   * worker-compatible source retrieval
   * mechanism.
   */
  throw new AppError({
    code:
      'REVIEW_EXECUTION_SOURCE_UNAVAILABLE',

    message:
      'Queued review execution requires a source retrieval mechanism that is not configured.',

    statusCode: 503,
  });
};

const queueReviewExecution = async ({
  reviewId,
}) => {
  const review =
    await reviewRepository.findById(
      reviewId,
    );

  if (!review) {
    throw new AppError({
      code: 'REVIEW_NOT_FOUND',
      message: 'Review not found.',
      statusCode: 404,
    });
  }

  const id =
    getReviewIdFromDocument(
      review,
    );

  const job =
    await enqueueReviewJob({
      reviewId:
        id.toString(),
    });

  return {
    reviewId:
      id.toString(),

    jobId:
      job.id,

    status:
      'queued',
  };
};

const createReviewResponse =
  async (
    payload,
  ) => {
    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw new AppError({
        code:
          'INVALID_REVIEW_REQUEST',

        message:
          'The review request is invalid.',

        statusCode: 400,
      });
    }

    const options =
      normalizeReviewOptions(
        payload.options,
      );

    assertRequestedFeatures(
      options,
    );

    assertSourceFeatureAccess(
      payload.source,
    );

    const projectIdentity =
      createProjectIdentity(
        payload.projectName,
      );

    const {
      source: reviewSource,
      context: sourceContext,
    } =
      await resolveReviewSource(
        payload.source,
      );

    const source =
      await normalizeSourceInput(
        reviewSource,
        sourceContext,
      );

    validateNormalizedSource(
      source,
    );

    const {
      totalFiles,
      totalLines,
    } =
      calculateSourceStats(
        source,
      );

    assertReviewLimits({
      totalLines,
      totalFiles,
    });

    const access =
      getAccessContext();

    const project =
      await createProjectForReview({
        project:
          projectIdentity,

        source,
      });

    const projectId =
      project?._id ||
      project?.id ||
      null;

    if (!projectId) {
      throw new AppError({
        code:
          'PROJECT_IDENTIFIER_MISSING',

        message:
          'The project could not be assigned a valid identifier.',

        statusCode: 500,
      });
    }

    const review =
      await createReviewRecord({
        projectId,

        source,
      });

    const reviewId =
      getReviewIdFromDocument(
        review,
      );

    const startedAt =
      new Date();

    try {
      await reviewRepository.updateById(
        reviewId,
        {
          status: 'running',
          startedAt,
          errorCode: null,
        },
      );

      const result =
        await reviewEngine.run({
          source,

          reviewId,

          projectId,

          options,

          access,
        });

      await persistFindings({
        reviewId,
        projectId,
        findings:
          result.findings || [],
      });

      await persistScore({
        reviewId,
        score:
          result.score,
      });

      if (
        options.aiAnalysis
      ) {
        await persistAiAnalysis({
          reviewId,

          aiAnalysis:
            result.aiAnalysis,
        });
      }

      const reviewUpdate =
        buildReviewUpdate({
          result,
          source,
          startedAt,
        });

      const updatedReview =
        await reviewRepository.updateById(
          reviewId,
          reviewUpdate,
        );

      return {
        project: {
          id:
            projectId.toString(),

          name:
            project.name,

          normalizedName:
            project.normalizedName,

          sourceType:
            project.sourceType,
        },

        review: {
          id:
            reviewId.toString(),

          status:
            updatedReview?.status ||
            'completed',
        },

        analysis:
          result,
      };
    } catch (error) {
      try {
        await reviewRepository.updateById(
          reviewId,
          {
            status: 'failed',

            startedAt,

            completedAt:
              new Date(),

            errorCode:
              error?.code ||
              'REVIEW_EXECUTION_FAILED',
          },
        );
      } catch {
        /*
         * Preserve the original review
         * execution error.
         */
      }

      throw error;
    }
  };

export {
  createReviewResponse,
  executeReview,
  queueReviewExecution,
};