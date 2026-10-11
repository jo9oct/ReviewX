import environment from '../config/environment.js';
import {
  getTierPolicy,
  normalizeTier
} from './subscription.service.js';
import { AppError } from '../utils/errors.js';

const getCurrentTier = () => {
  return normalizeTier(environment.access.userTier);
};

const getCurrentPolicy = () => {
  return getTierPolicy(getCurrentTier());
};

const assertFeatureAccess = (feature) => {
  const tier = getCurrentTier();
  const policy = getTierPolicy(tier);

  if (!Object.hasOwn(policy, feature)) {
    throw new AppError({
      code: 'UNKNOWN_ACCESS_FEATURE',
      message: 'The requested access feature is not defined.',
      statusCode: 500
    });
  }

  if (policy[feature] !== true) {
    throw new AppError({
      code: 'FEATURE_NOT_AVAILABLE',
      message: 'The requested feature is not available for the current subscription tier.',
      statusCode: 403,
      details: {
        feature,
        tier
      }
    });
  }

  return true;
};

const assertReviewLimits = ({
  subscription,
  usage,
  totalLines = 0,
  totalFiles = 0,
} = {}) => {
  // ── Per-review size limits ────────────────────────────────────────────
  const isEnterprise =
    subscription?.plan === 'enterprise' ||
    subscription?.tier === 'enterprise';

  const lineLimit = isEnterprise
    ? Math.max(subscription?.linesPerReview ?? 0, 1000000)
    : (subscription?.linesPerReview ?? getCurrentPolicy().maxLinesPerReview);

  const fileLimit = isEnterprise
    ? Math.max(subscription?.filesPerReview ?? 0, 10000)
    : (subscription?.filesPerReview ?? getCurrentPolicy().maxFilesPerReview);

  if (
    !Number.isInteger(totalLines) ||
    totalLines < 0
  ) {
    throw new AppError({
      code: 'INVALID_LINE_COUNT',
      message: 'The review line count is invalid.',
      statusCode: 400
    });
  }

  if (
    !Number.isInteger(totalFiles) ||
    totalFiles < 0
  ) {
    throw new AppError({
      code: 'INVALID_FILE_COUNT',
      message: 'The review file count is invalid.',
      statusCode: 400
    });
  }

  if (totalLines > lineLimit) {
    throw new AppError({
      code: 'REVIEW_LINE_LIMIT_EXCEEDED',
      message: `Review exceeds the line limit for your plan (${lineLimit} lines).`,
      statusCode: 403,
      details: {
        limit: lineLimit,
        requested: totalLines
      }
    });
  }

  if (totalFiles > fileLimit) {
    throw new AppError({
      code: 'REVIEW_FILE_LIMIT_EXCEEDED',
      message: `Review exceeds the file limit for your plan (${fileLimit} files).`,
      statusCode: 403,
      details: {
        limit: fileLimit,
        requested: totalFiles
      }
    });
  }

  // ── AI quota ─────────────────────────────────────────────────────────
  // AI exhaustion does NOT throw — it returns canUseAi: false so the
  // review proceeds without AI analysis rather than being blocked.
  const aiLimit = subscription?.aiAssistedReviews ?? 5;
  const aiUsed  = usage?.aiReviews?.used ?? 0;
  const canUseAi = aiUsed < aiLimit;

  return { canUseAi };
};

const getAccessContext = () => {
  const tier = getCurrentTier();
  const policy = getCurrentPolicy();

  return Object.freeze({
    tier,
    policy
  });
};

export {
  getCurrentTier,
  getCurrentPolicy,
  assertFeatureAccess,
  assertReviewLimits,
  getAccessContext
};