import { AppError } from '../utils/errors.js';

const SUPPORTED_TIERS = Object.freeze([
  'free',
  'pro',
  'enterprise'
]);

const TIER_POLICIES = Object.freeze({

  free: Object.freeze({
    maxLinesPerReview: 500,
    maxFilesPerReview: 1,

    archiveUpload: false,

    aiAnalysis: false,
    aiRemediation: false,
    advancedAnalysis: false,

    githubIntegration: false,
    companyRules: false,
    scheduledReviews: false,

    htmlReport: false,
    pdfReport: false,
    jsonReport: true,

    maxConcurrentReviews: 1
  }),

  pro: Object.freeze({
    maxLinesPerReview: 5000,
    maxFilesPerReview: 100,

    archiveUpload: true,

    aiAnalysis: true,
    aiRemediation: true,
    advancedAnalysis: true,

    githubIntegration: true,
    companyRules: true,
    scheduledReviews: false,

    htmlReport: true,
    pdfReport: false,
    jsonReport: true,

    maxConcurrentReviews: 3
  }),

  enterprise: Object.freeze({
    maxLinesPerReview: Number.POSITIVE_INFINITY,
    maxFilesPerReview: Number.POSITIVE_INFINITY,

    archiveUpload: true,

    aiAnalysis: true,
    aiRemediation: true,
    advancedAnalysis: true,

    githubIntegration: true,
    companyRules: true,
    scheduledReviews: true,

    htmlReport: true,
    pdfReport: true,
    jsonReport: true,

    maxConcurrentReviews: 10
  })

});

const normalizeTier = (tier) => {

  const normalizedTier = String(tier || '')
    .trim()
    .toLowerCase();

  if (!SUPPORTED_TIERS.includes(normalizedTier)) {
    throw new AppError({
      code: 'UNSUPPORTED_USER_TIER',
      message: 'The configured user tier is not supported.',
      statusCode: 500
    });
  }

  return normalizedTier;
};

const getTierPolicy = (tier) => {

  const normalizedTier = normalizeTier(tier);

  return TIER_POLICIES[normalizedTier];
};

const hasFeatureAccess = (tier, feature) => {

  const policy = getTierPolicy(tier);

  if (!Object.hasOwn(policy, feature)) {
    throw new AppError({
      code: 'UNKNOWN_ACCESS_FEATURE',
      message: 'The requested access feature is not defined.',
      statusCode: 500
    });
  }

  return policy[feature] === true;
};

const getSupportedTiers = () => {
  return [...SUPPORTED_TIERS];
};

const getTierSnapshot = (tier) => {

  const normalizedTier = normalizeTier(tier);

  return Object.freeze({
    tier: normalizedTier,
    policy: TIER_POLICIES[normalizedTier]
  });
};

export {
  SUPPORTED_TIERS,
  TIER_POLICIES,
  normalizeTier,
  getTierPolicy,
  hasFeatureAccess,
  getSupportedTiers,
  getTierSnapshot
};