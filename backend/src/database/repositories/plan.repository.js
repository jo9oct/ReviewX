import { Plan } from '../models/plan.model.js';
import { PLAN_CONFIGS, DEFAULT_PRICES } from '../../services/subscription.service.js';

export const DEFAULT_PLAN_DEFINITIONS = [
  {
    planId: 'free',
    name: 'Free',
    description: 'For individuals testing the waters and open source projects.',
    priceMonthly: DEFAULT_PRICES.free || 0,
    priceAnnual: 0,
    currency: 'ETB',
    trialDays: 0,
    limits: {
      monthlyReviews: PLAN_CONFIGS.free?.monthlyReviews ?? 50,
      aiAssistedReviews: PLAN_CONFIGS.free?.aiAssistedReviews ?? 5,
      linesPerReview: PLAN_CONFIGS.free?.linesPerReview ?? 1000,
      filesPerReview: PLAN_CONFIGS.free?.filesPerReview ?? 50,
      historyRetentionDays: PLAN_CONFIGS.free?.historyRetentionDays ?? 30,
      seats: 0,
    },
    features: {
      advancedAnalysis: false,
      aiRemediation: false,
      gitHubIntegration: false,
      htmlReport: false,
    },
    isPublic: true,
    isActive: true,
    version: 1,
  },
  {
    planId: 'pro',
    name: 'Pro',
    description: 'For professional engineers needing deep analysis and AI assistance.',
    priceMonthly: DEFAULT_PRICES.pro || 500,
    priceAnnual: (DEFAULT_PRICES.pro || 500) * 10,
    currency: 'ETB',
    trialDays: 0,
    limits: {
      monthlyReviews: PLAN_CONFIGS.pro?.monthlyReviews ?? 500,
      aiAssistedReviews: PLAN_CONFIGS.pro?.aiAssistedReviews ?? 20,
      linesPerReview: PLAN_CONFIGS.pro?.linesPerReview ?? 5000,
      filesPerReview: PLAN_CONFIGS.pro?.filesPerReview ?? 100,
      historyRetentionDays: PLAN_CONFIGS.pro?.historyRetentionDays ?? 90,
      seats: 10,
    },
    features: {
      advancedAnalysis: true,
      aiRemediation: true,
      gitHubIntegration: true,
      htmlReport: true,
    },
    isPublic: true,
    isActive: true,
    version: 1,
  },
  {
    planId: 'team',
    name: 'Team',
    description: 'For growing development teams with shared rules and collaboration.',
    priceMonthly: DEFAULT_PRICES.team || 2000,
    priceAnnual: (DEFAULT_PRICES.team || 2000) * 10,
    currency: 'ETB',
    trialDays: 14,
    limits: {
      monthlyReviews: PLAN_CONFIGS.team?.monthlyReviews ?? 5000,
      aiAssistedReviews: PLAN_CONFIGS.team?.aiAssistedReviews ?? 100,
      linesPerReview: PLAN_CONFIGS.team?.linesPerReview ?? 10000,
      filesPerReview: PLAN_CONFIGS.team?.filesPerReview ?? 200,
      historyRetentionDays: PLAN_CONFIGS.team?.historyRetentionDays ?? 180,
      seats: 10,
    },
    features: {
      advancedAnalysis: true,
      aiRemediation: true,
      gitHubIntegration: true,
      htmlReport: true,
    },
    isPublic: true,
    isActive: true,
    version: 1,
  },
  {
    planId: 'enterprise',
    name: 'Enterprise',
    description: 'For organizations demanding massive scale, custom policies, and SLA.',
    priceMonthly: DEFAULT_PRICES.enterprise || 5000,
    priceAnnual: (DEFAULT_PRICES.enterprise || 5000) * 10,
    currency: 'ETB',
    trialDays: 30,
    limits: {
      monthlyReviews: PLAN_CONFIGS.enterprise?.monthlyReviews ?? 100000,
      aiAssistedReviews: PLAN_CONFIGS.enterprise?.aiAssistedReviews ?? 500,
      linesPerReview: PLAN_CONFIGS.enterprise?.linesPerReview ?? 50000,
      filesPerReview: PLAN_CONFIGS.enterprise?.filesPerReview ?? 500,
      historyRetentionDays: PLAN_CONFIGS.enterprise?.historyRetentionDays ?? 365,
      seats: 100,
    },
    features: {
      advancedAnalysis: true,
      aiRemediation: true,
      gitHubIntegration: true,
      htmlReport: true,
    },
    isPublic: true,
    isActive: true,
    version: 1,
  },
];

let defaultPlansInitialized = false;

export function resetDefaultPlansCache() {
  defaultPlansInitialized = false;
}

export async function ensureDefaultPlans() {
  if (defaultPlansInitialized) return;
  const count = await Plan.countDocuments();
  if (count === 0) {
    for (const def of DEFAULT_PLAN_DEFINITIONS) {
      await Plan.findOneAndUpdate(
        { planId: def.planId },
        { $setOnInsert: def },
        { upsert: true, new: true },
      );
    }
  }
  defaultPlansInitialized = true;
}

export async function listAllPlans() {
  await ensureDefaultPlans();
  return Plan.find().sort({ priceMonthly: 1 }).lean();
}

export async function findPlanById(planId) {
  await ensureDefaultPlans();
  return Plan.findOne({ planId: planId.toLowerCase() }).lean();
}

export async function updatePlanById(planId, updates) {
  await ensureDefaultPlans();
  return Plan.findOneAndUpdate(
    { planId: planId.toLowerCase() },
    { $set: updates, $inc: { version: 1 } },
    { new: true, runValidators: true },
  );
}
