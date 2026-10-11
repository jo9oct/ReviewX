import { AppError } from '../utils/errors.js';

const SUPPORTED_TIERS = Object.freeze([
  'free',
  'pro',
  'team',
  'enterprise',
]);

const TIER_POLICIES = Object.freeze({
  free: Object.freeze({
    maxLinesPerReview: 500,
    maxLines: 500,
    maxFilesPerReview: 1,
    maxFiles: 1,
    maxConcurrentReviews: 1,
    maxConcurrency: 1,

    archiveUpload: false,
    allowArchive: false,

    aiAnalysis: false,
    aiRemediation: false,
    allowAiRemediation: false,
    advancedAnalysis: false,
    allowAdvancedAnalysis: false,

    githubIntegration: false,
    allowGitHub: false,
    companyRules: false,
    scheduledReviews: false,

    htmlReport: false,
    allowHtmlReport: false,
    pdfReport: false,
    jsonReport: true,
  }),

  pro: Object.freeze({
    maxLinesPerReview: 5000,
    maxLines: 5000,
    maxFilesPerReview: 100,
    maxFiles: 100,
    maxConcurrentReviews: 3,
    maxConcurrency: 3,

    archiveUpload: true,
    allowArchive: true,

    aiAnalysis: true,
    aiRemediation: true,
    allowAiRemediation: true,
    advancedAnalysis: true,
    allowAdvancedAnalysis: true,

    githubIntegration: false,
    allowGitHub: false,
    companyRules: false,
    scheduledReviews: false,

    htmlReport: true,
    allowHtmlReport: true,
    pdfReport: false,
    jsonReport: true,
  }),

  team: Object.freeze({
    maxLinesPerReview: 10000,
    maxLines: 10000,
    maxFilesPerReview: 200,
    maxFiles: 200,
    maxConcurrentReviews: 5,
    maxConcurrency: 5,

    archiveUpload: true,
    allowArchive: true,

    aiAnalysis: true,
    aiRemediation: true,
    allowAiRemediation: true,
    advancedAnalysis: true,
    allowAdvancedAnalysis: true,

    githubIntegration: true,
    allowGitHub: true,
    companyRules: true,
    scheduledReviews: true,

    htmlReport: true,
    allowHtmlReport: true,
    pdfReport: true,
    jsonReport: true,
  }),

  enterprise: Object.freeze({
    maxLinesPerReview: Number.POSITIVE_INFINITY,
    maxLines: 1000000,
    maxFilesPerReview: Number.POSITIVE_INFINITY,
    maxFiles: 10000,
    maxConcurrentReviews: 10,
    maxConcurrency: 10,

    archiveUpload: true,
    allowArchive: true,

    aiAnalysis: true,
    aiRemediation: true,
    allowAiRemediation: true,
    advancedAnalysis: true,
    allowAdvancedAnalysis: true,

    githubIntegration: true,
    allowGitHub: true,
    companyRules: true,
    scheduledReviews: true,

    htmlReport: true,
    allowHtmlReport: true,
    pdfReport: true,
    jsonReport: true,
  }),
});

const normalizeTier = (tier) => {
  const normalizedTier = String(tier || '')
    .trim()
    .toLowerCase();

  if (!SUPPORTED_TIERS.includes(normalizedTier)) {
    throw new AppError({
      code: 'UNSUPPORTED_USER_TIER',
      message: 'The configured user tier is not supported.',
      statusCode: 500,
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
      statusCode: 500,
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
    policy: TIER_POLICIES[normalizedTier],
  });
};

/**
 * Check if a subscription meets the plan's limits
 */
export function checkPlanLimits(subscription) {
  if (!subscription || !subscription.plan) return true;
  const policy = getTierPolicy(subscription.plan);
  return Boolean(policy);
}

/**
 * Validate subscription status transitions
 */
export function validateStatusTransition(subscription) {
  if (!subscription || !subscription.status) {
    throw new Error('Subscription must have a status');
  }

  switch (subscription.status) {
    case 'trialing':
    case 'active':
    case 'past_due':
    case 'expired':
    case 'cancelled':
      return true;
    default:
      throw new Error(`Unknown subscription status: ${subscription.status}`);
  }
}

export {
  SUPPORTED_TIERS,
  TIER_POLICIES,
  normalizeTier,
  getTierPolicy,
  hasFeatureAccess,
  getSupportedTiers,
  getTierSnapshot,
};
