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
  totalLines = 0,
  totalFiles = 0
} = {}) => {
  const tier = getCurrentTier();
  const policy = getCurrentPolicy();

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

  if (totalLines > policy.maxLinesPerReview) {
    throw new AppError({
      code: 'REVIEW_LINE_LIMIT_EXCEEDED',
      message: 'The review exceeds the line limit for the current subscription tier.',
      statusCode: 403,
      details: {
        tier,
        limit: policy.maxLinesPerReview,
        requested: totalLines
      }
    });
  }

  if (totalFiles > policy.maxFilesPerReview) {
    throw new AppError({
      code: 'REVIEW_FILE_LIMIT_EXCEEDED',
      message: 'The review exceeds the file limit for the current subscription tier.',
      statusCode: 403,
      details: {
        tier,
        limit: policy.maxFilesPerReview,
        requested: totalFiles
      }
    });
  }

  return true;
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