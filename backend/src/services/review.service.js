import mongoose from 'mongoose';

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
  storeReviewSource,
  getReviewSource,
  deleteReviewSource,
} from '../queue/reviewSource.store.js';

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

import {
  logger,
} from '../utils/logger.js';

const DEFAULT_OWNER_ID = 'user-test-001';

const getReviewId = (review) =>
  review?.reviewId ||
  review?.id ||
  review?._id?.toString?.() ||
  review?._id ||
  null;

const normalizeReviewId = (reviewId) => {
  if (reviewId === null || reviewId === undefined) {
    throw new AppError({
      code: 'INVALID_REVIEW_IDENTIFIER',
      message: 'Review ID is required.',
      statusCode: 400,
    });
  }

  const normalized = String(reviewId).trim();
  if (!normalized) {
    throw new AppError({
      code: 'INVALID_REVIEW_IDENTIFIER',
      message: 'Review ID is required.',
      statusCode: 400,
    });
  }

  return normalized;
};

const normalizeReviewOptions = (options = {}) => {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new AppError({
      code: 'INVALID_REVIEW_OPTIONS',
      message: 'Review options are invalid.',
      statusCode: 400,
    });
  }

  return {
    aiAnalysis: options.aiAnalysis === true,
    aiRemediation: options.aiRemediation === true,
    advancedAnalysis: options.advancedAnalysis === true,
  };
};

const assertSourceFeatureAccess = (source) => {
  if (!source || typeof source !== 'object') {
    throw new AppError({
      code: 'INVALID_SOURCE',
      message: 'The review source is invalid.',
      statusCode: 400,
    });
  }

  if (source.type === 'archive') {
    assertFeatureAccess('archiveUpload');
  }

  if (source.type === 'github') {
    assertFeatureAccess('githubIntegration');
  }
};

const assertRequestedFeatures = (options) => {
  if (options.aiAnalysis) {
    assertFeatureAccess('aiAnalysis');
  }

  if (options.aiRemediation) {
    assertFeatureAccess('aiRemediation');

    if (!options.aiAnalysis) {
      throw new AppError({
        code: 'AI_REMEDIATION_REQUIRES_AI_ANALYSIS',
        message: 'AI remediation requires AI analysis to be enabled.',
        statusCode: 400,
      });
    }
  }

  if (options.advancedAnalysis) {
    assertFeatureAccess('advancedAnalysis');
  }
};

const calculateSourceStats = (source) => {
  const files = Array.isArray(source?.files) ? source.files : [];
  const totalFiles = files.length;

  const totalLines = files.reduce((total, file) => {
    const content = typeof file?.content === 'string' ? file.content : '';
    if (!content) return total;
    return total + content.split(/\r\n|\r|\n/).length;
  }, 0);

  return {
    totalFiles,
    totalLines,
  };
};

const getFindingLineStart = (finding) => {
  const location = finding?.location || {};
  const evidence = finding?.evidence || {};
  const evidenceLocation = evidence?.location || {};

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
    1
  );
};

const getFindingLineEnd = (finding) => {
  const location = finding?.location || {};
  const evidence = finding?.evidence || {};
  const evidenceLocation = evidence?.location || {};
  const lineStart = getFindingLineStart(finding);

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
    1
  );
};

const getFindingSnippet = (finding) => {
  const evidence = finding?.evidence || {};
  if (typeof evidence?.snippet === 'string' && evidence.snippet.length > 0) {
    return evidence.snippet;
  }
  if (typeof evidence?.code === 'string' && evidence.code.length > 0) {
    return evidence.code;
  }
  if (typeof evidence?.text === 'string' && evidence.text.length > 0) {
    return evidence.text;
  }
  if (typeof evidence?.content === 'string' && evidence.content.length > 0) {
    return evidence.content;
  }
  return finding?.description || finding?.title || 'Snippet unavailable';
};

const getFindingSourceHash = (finding) => {
  const evidence = finding?.evidence || {};
  return evidence?.sourceHash ?? evidence?.hash ?? null;
};

const validateFindingEvidence = (finding) => {
  const lineStart = getFindingLineStart(finding);
  const lineEnd = getFindingLineEnd(finding);
  const snippet = getFindingSnippet(finding);

  return {
    lineStart: Number.isInteger(lineStart) && lineStart >= 1 ? lineStart : 1,
    lineEnd: Number.isInteger(lineEnd) && lineEnd >= lineStart ? lineEnd : lineStart,
    snippet,
    sourceHash: getFindingSourceHash(finding),
  };
};

const buildFindingDocuments = ({ reviewId, projectId, findings }) =>
  findings.map((finding) => {
    const evidence = validateFindingEvidence(finding);

    return {
      reviewId,
      projectId: projectId || null,
      category: finding.category,
      ruleId: finding.ruleId,
      title: finding.title || finding.ruleName || 'Review finding',
      description: finding.description || finding.message || '',
      severity: finding.severity || 'medium',
      confidence: finding.confidence || 'medium',
      status: finding.status || 'detected',
      filePath: finding.filePath || finding.file || 'source.ts',
      lineStart: evidence.lineStart,
      lineEnd: evidence.lineEnd,
      remediation: finding.remediation || null,
      evidenceId: null,
    };
  });

const buildEvidenceDocuments = ({ reviewId, findingDocuments, findings }) =>
  findings.map((finding, index) => {
    const findingDocument = findingDocuments[index];
    const evidence = validateFindingEvidence(finding);

    return {
      reviewId,
      findingId: findingDocument?._id || null,
      filePath: finding.filePath || finding.file || 'source.ts',
      lineStart: evidence.lineStart,
      lineEnd: evidence.lineEnd,
      snippet: evidence.snippet,
      sourceHash: evidence.sourceHash,
    };
  });

const persistFindings = async ({ reviewId, projectId, findings }) => {
  if (!Array.isArray(findings) || findings.length === 0) {
    return [];
  }

  const findingDocuments = buildFindingDocuments({
    reviewId,
    projectId,
    findings,
  });

  const createdFindings = await findingRepository.createMany(findingDocuments);

  const evidenceDocuments = buildEvidenceDocuments({
    reviewId,
    findingDocuments: createdFindings,
    findings,
  });

  const createdEvidence = await evidenceRepository.createMany(evidenceDocuments);

  for (let index = 0; index < createdFindings.length; index += 1) {
    const finding = createdFindings[index];
    const evidence = createdEvidence[index];
    if (finding?._id && evidence?._id) {
      await findingRepository.updateById(finding._id, {
        evidenceId: evidence._id,
      });
    }
  }

  return createdFindings;
};

const persistScore = async ({ reviewId, score }) => {
  if (!score || typeof score !== 'object') {
    return null;
  }

  const categories = score.categories || {};

  return scoreRepository.upsertByReviewId(reviewId, {
    overall: score.overall,
    security: categories.security,
    bugs: categories.bug || categories.bugs,
    quality: categories.quality,
    performance: categories.performance,
  });
};

const normalizeAiProvider = (provider) => {
  const normalized = String(provider || '').trim().toLowerCase();
  if (normalized === 'groq' || normalized === 'openai') {
    return normalized;
  }
  return null;
};

const getAiModel = (provider) => {
  if (provider === 'groq') {
    return aiConfig.groq.model || 'unknown';
  }
  if (provider === 'openai') {
    return aiConfig.openai.model || 'unknown';
  }
  return 'unknown';
};

const persistAiAnalysis = async ({ reviewId, aiAnalysis }) => {
  if (!aiAnalysis || typeof aiAnalysis !== 'object') {
    return null;
  }

  const provider = normalizeAiProvider(aiAnalysis.provider);
  if (!provider) {
    return null;
  }

  const status = ['pending', 'running', 'completed', 'failed', 'skipped'].includes(aiAnalysis.status)
    ? aiAnalysis.status
    : 'failed';

  return aiAnalysisRepository.create({
    reviewId,
    provider,
    model: getAiModel(provider),
    status,
    analysisType: 'summary',
    result: aiAnalysis,
    errorCode: Array.isArray(aiAnalysis.errors) && aiAnalysis.errors.length > 0
      ? String(aiAnalysis.errors[0])
      : null,
  });
};

const buildFindingCounts = (findings) => {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const finding of findings) {
    const sev = (finding.severity || '').toLowerCase();
    if (Object.hasOwn(counts, sev)) {
      counts[sev] += 1;
    }
  }

  return counts;
};

const buildReviewUpdate = ({ result, source, startedAt }) => {
  const findings = Array.isArray(result?.findings) ? result.findings : [];
  const languages = Array.isArray(result?.files)
    ? [...new Set(result.files.map((file) => file?.language).filter(Boolean))]
    : [];

  const completedAt = new Date();
  const findingCounts = buildFindingCounts(findings);

  return {
    status: 'completed',
    languages,
    totalFiles: Array.isArray(source?.files) ? source.files.length : 0,
    totalLines: calculateSourceStats(source).totalLines,
    findingCounts,
    summary: {
      totalFindings: findings.length,
      ...findingCounts,
    },
    findingCount: findings.length,
    score: typeof result?.score?.overall === 'number' ? result.score.overall : null,
    startedAt: startedAt || null,
    completedAt,
    errorCode: null,
  };
};

const getReviewIdFromDocument = (review) => {
  const id = getReviewId(review);
  if (id === null || id === undefined) {
    throw new AppError({
      code: 'INVALID_REVIEW_IDENTIFIER',
      message: 'Review does not contain a valid identifier.',
      statusCode: 500,
    });
  }
  return normalizeReviewId(id);
};

const createProjectForReview = async ({ project, source }) => {
  const existing = await projectRepository.findByNormalizedName(
    project.normalizedName,
    source.type
  );

  if (existing) {
    return existing;
  }

  return projectRepository.create({
    name: project.name,
    normalizedName: project.normalizedName,
    sourceType: source.type,
    repository: source.type === 'github'
      ? {
          provider: 'github',
          owner: source.owner || source.repository?.owner || null,
          name: source.name || source.repository?.name || null,
          defaultBranch: source.defaultBranch || source.repository?.defaultBranch || null,
        }
      : undefined,
  });
};

const createReviewRecord = async ({ ownerId, projectId, source, user, company }) => {
  const reviewId = new mongoose.Types.ObjectId();
  const firstFile = Array.isArray(source?.files) && source.files.length > 0 ? source.files[0] : null;

  return reviewRepository.create({
    _id: reviewId,
    reviewId,
    user: user || null,
    company: company || null,
    ownerId: ownerId || (user ? String(user) : DEFAULT_OWNER_ID),
    projectId,
    sourceType: source.type,
    source: source.type,
    fileName: firstFile?.path || firstFile?.filename || 'source.ts',
    language: firstFile?.language || 'unknown',
    status: 'pending',
    languages: [],
    totalFiles: Array.isArray(source.files) ? source.files.length : 0,
    totalLines: calculateSourceStats(source).totalLines,
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

const resolveReviewSource = async (source) => {
  if (source?.type !== 'github') {
    return {
      source,
      context: {},
    };
  }

  const connectionId = typeof source.connectionId === 'string' ? source.connectionId.trim() : '';
  if (!connectionId) {
    throw new AppError({
      code: 'GITHUB_CONNECTION_REQUIRED',
      message: 'A GitHub connection is required for repository reviews.',
      statusCode: 400,
    });
  }

  if (!source.repository || typeof source.repository !== 'object' || Array.isArray(source.repository)) {
    throw new AppError({
      code: 'GITHUB_REPOSITORY_REQUIRED',
      message: 'A GitHub repository is required for repository reviews.',
      statusCode: 400,
    });
  }

  const repository = await getRepository({
    connectionId,
    owner: source.repository.owner,
    name: source.repository.name,
    ref: source.repository.ref || null,
  });

  return {
    source,
    context: {
      githubRepository: repository,
    },
  };
};

const createExecutionError = ({ code, message, statusCode = 500, details = {} }) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
};

// ── Execute Review (Worker Processor) ───────────────────────────────────────

export const executeReview = async ({
  reviewId,
  attemptNumber = 1,
  maxAttempts = 1,
}) => {
  const normalizedReviewId = normalizeReviewId(reviewId);
  const review = await reviewRepository.findById(normalizedReviewId);

  if (!review) {
    throw createExecutionError({
      code: 'REVIEW_NOT_FOUND',
      message: 'The requested review was not found.',
      statusCode: 404,
    });
  }

  const reviewDocumentId = getReviewIdFromDocument(review);

  if (review.status === 'completed' || review.status === 'cancelled') {
    return {
      reviewId: reviewDocumentId,
      status: review.status,
      skipped: true,
    };
  }

  const isFinalAttempt = Number(attemptNumber) >= Number(maxAttempts);
  const startedAt = new Date();

  const runningReview = await reviewRepository.updateByIdAndStatus(
    reviewDocumentId,
    'queued',
    {
      status: 'running',
      startedAt,
      completedAt: null,
      errorCode: null,
    }
  );

  if (!runningReview) {
    const currentReview = await reviewRepository.findById(normalizedReviewId);

    if (currentReview?.status === 'completed' || currentReview?.status === 'cancelled') {
      return {
        reviewId: reviewDocumentId,
        status: currentReview.status,
        skipped: true,
      };
    }

    if (currentReview?.status === 'running') {
      return {
        reviewId: reviewDocumentId,
        status: 'running',
        skipped: true,
      };
    }

    throw createExecutionError({
      code: 'INVALID_REVIEW_STATE_TRANSITION',
      message: 'The review could not transition from its current state to running.',
      statusCode: 409,
    });
  }

  let executionData;
  let completedSuccessfully = false;

  try {
    executionData = await getReviewSource(normalizedReviewId);

    if (!executionData) {
      throw createExecutionError({
        code: 'REVIEW_EXECUTION_SOURCE_EXPIRED',
        message: 'The temporary review source is no longer available.',
        statusCode: 410,
      });
    }

    const { source, options } = executionData;

    validateNormalizedSource(source);

    const { totalFiles, totalLines } = calculateSourceStats(source);

    assertReviewLimits({
      totalLines,
      totalFiles,
    });

    const access = getAccessContext();

    const result = await reviewEngine.run({
      source,
      reviewId: reviewDocumentId,
      projectId: review.projectId,
      options,
      access,
    });

    await persistFindings({
      reviewId: reviewDocumentId,
      projectId: review.projectId,
      findings: result.findings || [],
    });

    await persistScore({
      reviewId: reviewDocumentId,
      score: result.score,
    });

    if (options.aiAnalysis) {
      await persistAiAnalysis({
        reviewId: reviewDocumentId,
        aiAnalysis: result.aiAnalysis,
      });
    }

    const reviewUpdate = buildReviewUpdate({
      result,
      source,
      startedAt,
    });

    const updatedReview = await reviewRepository.updateByIdAndStatus(
      reviewDocumentId,
      'running',
      reviewUpdate
    );

    if (!updatedReview) {
      throw createExecutionError({
        code: 'REVIEW_COMPLETION_STATE_CONFLICT',
        message: 'The review could not be marked as completed because its state changed during execution.',
        statusCode: 409,
      });
    }

    completedSuccessfully = true;

    return {
      reviewId: reviewDocumentId,
      status: updatedReview.status,
      analysis: result,
    };
  } catch (error) {
    try {
      await reviewRepository.updateByIdAndStatus(
        reviewDocumentId,
        'running',
        {
          status: isFinalAttempt ? 'failed' : 'queued',
          startedAt,
          completedAt: isFinalAttempt ? new Date() : null,
          errorCode: error?.code || 'REVIEW_EXECUTION_FAILED',
        }
      );
    } catch {
      // Preserve original error
    }

    throw error;
  } finally {
    if (isFinalAttempt || completedSuccessfully) {
      try {
        await deleteReviewSource(normalizedReviewId);
      } catch {
        // Redis TTL handles cleanup
      }
    }
  }
};

export const queueReviewExecution = async ({ reviewId }) => {
  const normalizedReviewId = normalizeReviewId(reviewId);
  const review = await reviewRepository.findById(normalizedReviewId);

  if (!review) {
    throw new AppError({
      code: 'REVIEW_NOT_FOUND',
      message: 'Review not found.',
      statusCode: 404,
    });
  }

  const id = getReviewIdFromDocument(review);

  if (review.status === 'completed' || review.status === 'cancelled') {
    throw new AppError({
      code: 'REVIEW_ALREADY_FINALIZED',
      message: 'The review has already reached a final state.',
      statusCode: 409,
    });
  }

  if (review.status !== 'pending') {
    throw new AppError({
      code: 'REVIEW_ALREADY_QUEUED',
      message: 'The review has already been queued or is being processed.',
      statusCode: 409,
    });
  }

  const queuedReview = await reviewRepository.updateByIdAndStatus(
    id,
    'pending',
    {
      status: 'queued',
      errorCode: null,
    }
  );

  if (!queuedReview) {
    throw new AppError({
      code: 'REVIEW_QUEUE_STATE_CONFLICT',
      message: 'The review could not be moved to the queued state.',
      statusCode: 409,
    });
  }

  let job;
  try {
    job = await enqueueReviewJob({
      reviewId: id,
    });
  } catch (error) {
    try {
      await reviewRepository.updateByIdAndStatus(
        id,
        'queued',
        {
          status: 'failed',
          completedAt: new Date(),
          errorCode: error?.code || 'REVIEW_QUEUE_FAILED',
        }
      );
    } catch {
      // Preserve error
    }
    throw error;
  }

  return {
    reviewId: id,
    jobId: job.id,
    status: 'queued',
  };
};

export const createReviewResponse = async (payload, user = null) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError({
      code: 'INVALID_REVIEW_REQUEST',
      message: 'The review request is invalid.',
      statusCode: 400,
    });
  }

  const options = normalizeReviewOptions(payload.options);
  assertRequestedFeatures(options);

  // Normalize source payload if sent directly as { code, fileName, language }
  let sourcePayload = payload.source;
  if (!sourcePayload && payload.code) {
    sourcePayload = {
      type: 'paste',
      content: payload.code,
      fileName: payload.fileName || 'source.ts',
      language: payload.language || 'typescript',
    };
  }

  assertSourceFeatureAccess(sourcePayload);

  const projectIdentity = createProjectIdentity(
    payload.projectName || payload.fileName || 'Default Project'
  );

  const { source: reviewSource, context: sourceContext } =
    await resolveReviewSource(sourcePayload);

  const source = await normalizeSourceInput(reviewSource, sourceContext);
  validateNormalizedSource(source);

  const { totalFiles, totalLines } = calculateSourceStats(source);

  assertReviewLimits({
    totalLines,
    totalFiles,
  });

  const project = await createProjectForReview({
    project: projectIdentity,
    source,
  });

  const projectId = project?._id || project?.id || null;

  const ownerId = user?.id || user?._id?.toString() || DEFAULT_OWNER_ID;
  const userId = user?._id || user?.id || null;
  const companyId = user?.company || null;

  const review = await createReviewRecord({
    ownerId,
    projectId,
    source,
    user: userId,
    company: companyId,
  });

  const reviewId = getReviewIdFromDocument(review);

  try {
    await storeReviewSource({
      reviewId,
      source,
      options,
    });

    const queuedReview = await queueReviewExecution({
      reviewId,
    });

    return {
      reviewId,
      ownerId,
      project: {
        id: projectId ? projectId.toString() : null,
        name: project?.name,
        normalizedName: project?.normalizedName,
        sourceType: project?.sourceType,
      },
      review: {
        id: reviewId,
        status: queuedReview.status,
        jobId: queuedReview.jobId,
      },
      status: 'queued',
      message: 'Review analysis queued.',
    };
  } catch (error) {
    try {
      await deleteReviewSource(reviewId);
    } catch {
      // Redis TTL fallback
    }

    try {
      await reviewRepository.updateById(reviewId, {
        status: 'failed',
        completedAt: new Date(),
        errorCode: error?.code || 'REVIEW_QUEUE_FAILED',
      });
    } catch {
      // Preserve error
    }

    throw error;
  }
};

export const getReviewResponse = async (reviewId, user = null) => {
  const normalizedReviewId = normalizeReviewId(reviewId);
  const review = await reviewRepository.findById(normalizedReviewId);

  if (!review) {
    throw new AppError({
      code: 'REVIEW_NOT_FOUND',
      message: 'Review not found.',
      statusCode: 404,
    });
  }

  // Tenant / Scoped user check
  if (user && user.role !== 'platform_admin') {
    if (user.role === 'company_admin' && user.company) {
      if (review.company && review.company.toString() !== user.company.toString()) {
        throw new AppError({
          code: 'REVIEW_NOT_FOUND',
          message: 'Review not found.',
          statusCode: 404,
        });
      }
    } else {
      const uid = (user._id || user.id || user.userId)?.toString();
      if (review.user && review.user.toString() !== uid) {
        throw new AppError({
          code: 'REVIEW_NOT_FOUND',
          message: 'Review not found.',
          statusCode: 404,
        });
      }
    }
  }

  const reviewDocumentId = getReviewIdFromDocument(review);

  const [findings, score, aiAnalysis] = await Promise.all([
    findingRepository.findByReviewId(reviewDocumentId),
    scoreRepository.findByReviewId(reviewDocumentId),
    aiAnalysisRepository.findByReviewId(reviewDocumentId),
  ]);

  const rawFindings = Array.isArray(findings) ? findings : [];
  const findingCounts = review.findingCounts || buildFindingCounts(rawFindings);

  const formattedFindings = rawFindings.map((f) => ({
    _id: f._id ? f._id.toString() : undefined,
    id: f._id ? f._id.toString() : f.id,
    ruleId: f.ruleId,
    category: f.category,
    type: f.category,
    title: f.title,
    description: f.description,
    severity: (f.severity || 'medium').toLowerCase(),
    confidence: (f.confidence || 'medium').toLowerCase(),
    status: f.status || 'detected',
    file: f.filePath || f.file || 'source.ts',
    line: f.lineStart || f.line || 1,
    code: f.evidence?.snippet || f.snippet || null,
    recommendation: f.remediation || null,
    analyzer: 'AST Static Analyzer',
    fingerprint: f._id ? f._id.toString() : '',
  }));

  const scoreVal = score?.overall ?? (review.status === 'completed' ? 85 : 0);
  const scoreBreakdown = score
    ? {
        security: score.security ?? 100,
        bugs: score.bugs ?? 100,
        quality: score.quality ?? 100,
        performance: score.performance ?? 100,
      }
    : undefined;

  return {
    reviewId: reviewDocumentId,
    id: reviewDocumentId,
    status: review.status,
    progress: review.status === 'completed' ? 100 : (review.progress ?? 0),
    review: {
      id: reviewDocumentId,
      ownerId: review.ownerId || DEFAULT_OWNER_ID,
      projectId: review.projectId ? review.projectId.toString() : null,
      sourceType: review.sourceType,
      status: review.status,
      languages: review.languages || [],
      totalFiles: review.totalFiles || 0,
      totalLines: review.totalLines || 0,
      findingCounts,
      score: scoreVal,
      startedAt: review.startedAt || null,
      completedAt: review.completedAt || null,
      errorCode: review.errorCode || null,
      createdAt: review.createdAt || null,
      updatedAt: review.updatedAt || null,
    },
    summary: review.summary || {
      totalFindings: rawFindings.length,
      ...findingCounts,
    },
    score: {
      score: scoreVal,
      overall: scoreVal,
      grade: scoreVal >= 90 ? 'A' : scoreVal >= 75 ? 'B' : scoreVal >= 60 ? 'C' : 'D',
      breakdown: scoreBreakdown,
      categories: scoreBreakdown,
    },
    findings: formattedFindings,
    aiAnalysis: Array.isArray(aiAnalysis) && aiAnalysis.length > 0
      ? aiAnalysis[0]?.result || aiAnalysis[0]
      : (aiAnalysis || null),
  };
};

export const getReview = getReviewResponse;

// ── Multi-Tenant Dashboard & Review List ────────────────────────────────────

function getLangBadge(lang) {
  if (!lang) return 'CODE';
  const l = lang.toLowerCase();
  if (l.includes('typescript')) return 'TS';
  if (l.includes('javascript')) return 'JS';
  if (l.includes('python')) return 'PY';
  if (l.includes('java')) return 'JV';
  if (l.includes('php')) return 'PHP';
  if (l.includes('go')) return 'GO';
  if (l.includes('rust')) return 'RS';
  if (l.includes('c++') || l.includes('cpp')) return 'C++';
  if (l.includes('c#') || l.includes('csharp')) return 'C#';
  return lang.slice(0, 3).toUpperCase();
}

function getRelativeDate(d) {
  if (!d) return 'Recently';
  const now = Date.now();
  const diffMs = now - new Date(d).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (diffDay === 1) return 'Yesterday';
  if (diffDay > 1) return `${diffDay} days ago`;
  if (diffHour === 1) return '1 hour ago';
  if (diffHour > 1) return `${diffHour} hours ago`;
  if (diffMin === 1) return '1 minute ago';
  if (diffMin > 1) return `${diffMin} minutes ago`;
  return 'Just now';
}

function formatDate(d) {
  if (!d) return 'Today';
  const date = new Date(d);
  const isToday = new Date().toDateString() === date.toDateString();
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (isToday) return `Today, ${time}`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildReviewFilter(user) {
  if (!user) return {};
  if (user.role === 'platform_admin') return {};
  if (user.role === 'company_admin' && user.company) {
    return { company: user.company };
  }
  const uid = user._id || user.id || user.userId;
  return { user: uid };
}

export async function listReviews({ limit = 20, user = null } = {}) {
  const filter = buildReviewFilter(user);
  const reviews = await reviewRepository.findRecent(limit, filter);
  if (!reviews || reviews.length === 0) return [];

  const reviewIds = reviews.map((r) => r._id || r.reviewId);
  const scores = await scoreRepository.findByReviewIds(reviewIds);
  const scoreMap = new Map(scores.map((s) => [s.reviewId?.toString(), s]));

  return reviews.map((r) => {
    const rId = (r._id || r.reviewId).toString();
    const s = scoreMap.get(rId);
    const scoreVal = s ? s.overall : (r.score ?? (r.status === 'completed' ? 85 : 0));
    const totalFindings = r.summary?.totalFindings ?? r.findingCount ?? 0;
    const severityCounts = {
      critical: r.summary?.critical ?? r.findingCounts?.critical ?? 0,
      high: r.summary?.high ?? r.findingCounts?.high ?? 0,
      medium: r.summary?.medium ?? r.findingCounts?.medium ?? 0,
      low: r.summary?.low ?? r.findingCounts?.low ?? 0,
    };

    return {
      id: rId,
      reviewId: rId,
      name: r.fileName || `source.${r.fileExtension || 'txt'}`,
      lang: r.language ? r.language.charAt(0).toUpperCase() + r.language.slice(1) : 'Unknown',
      langBadge: getLangBadge(r.language),
      score: scoreVal,
      date: formatDate(r.createdAt),
      relativeDate: getRelativeDate(r.createdAt),
      status: r.status === 'completed' ? (scoreVal < 70 ? 'Needs attention' : 'Completed') : r.status,
      findings: totalFindings,
      severityCounts,
      createdAt: r.createdAt,
    };
  });
}

export async function getDashboardMetrics({ user = null } = {}) {
  const filter = buildReviewFilter(user);
  const totalReviewsCount = await reviewRepository.countAll(filter);

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
        performance: 100,
      },
      scoreTrend: [],
      recentReviews: [],
      openFindings: [],
    };
  }

  const userReviewIds = user ? await reviewRepository.findIds(filter) : null;
  const recentReviewsList = await listReviews({ limit: 10, user });
  const openFindingsList = await findingRepository.findOpenFindings(20, userReviewIds);
  const { total: totalFindingsCount, resolved: resolvedFindingsCount } =
    await findingRepository.countFindings(userReviewIds);

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const f of openFindingsList) {
    const sev = (f.severity || '').toLowerCase();
    if (sev === 'critical') criticalCount++;
    else if (sev === 'high') highCount++;
    else if (sev === 'medium') mediumCount++;
    else if (sev === 'low') lowCount++;
  }

  const recentScores = await scoreRepository.findRecent(20, userReviewIds);
  let avgScore = 0;
  let catHealth = {
    security: 100,
    bugs: 100,
    quality: 100,
    performance: 100,
  };

  if (recentScores.length > 0) {
    const totalScore = recentScores.reduce((acc, s) => acc + (s.overall || 0), 0);
    avgScore = Math.round(totalScore / recentScores.length);

    catHealth = {
      security: Math.round(
        recentScores.reduce((acc, s) => acc + (s.security ?? 0), 0) / recentScores.length
      ),
      bugs: Math.round(
        recentScores.reduce((acc, s) => acc + (s.bugs ?? 0), 0) / recentScores.length
      ),
      quality: Math.round(
        recentScores.reduce((acc, s) => acc + (s.quality ?? 0), 0) / recentScores.length
      ),
      performance: Math.round(
        recentScores.reduce((acc, s) => acc + (s.performance ?? 0), 0) / recentScores.length
      ),
    };
  }

  const trendScores = [...recentScores].reverse().slice(-5);
  const scoreTrend = trendScores.map((s) => ({
    label: new Date(s.createdAt || Date.now()).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    score: s.overall,
  }));

  const totalOpen = criticalCount + highCount + mediumCount + lowCount;
  const resolvedPct =
    totalFindingsCount > 0
      ? Math.round((resolvedFindingsCount / totalFindingsCount) * 100)
      : 100;

  const formattedOpenFindings = openFindingsList.map((f) => ({
    id: f._id ? f._id.toString() : f.id,
    title: f.title,
    severity: (f.severity || 'info').toUpperCase(),
    file: f.filePath || f.file || 'source.ts',
    category: f.category ? f.category.charAt(0).toUpperCase() + f.category.slice(1) : 'General',
    reviewId: f.reviewId ? f.reviewId.toString() : null,
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
    openFindings: formattedOpenFindings,
  };
}

export const createReview = createReviewResponse;

export default {
  createReviewResponse,
  createReview,
  executeReview,
  queueReviewExecution,
  getReviewResponse,
  getReview,
  listReviews,
  getDashboardMetrics,
};
