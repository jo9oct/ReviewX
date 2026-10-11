import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLANS,
  STATUSES,
  PLAN_CONFIGS,
  DEFAULT_PRICES,
  getTierPolicy as getServiceTierPolicy,
  checkPlanLimits as checkServicePlanLimits,
  validateStatusTransition as validateServiceStatusTransition,
} from '../../services/subscription.service.js';

import {
  SUPPORTED_TIERS,
  TIER_POLICIES,
  normalizeTier,
  getTierPolicy as getAccessTierPolicy,
  hasFeatureAccess,
  getSupportedTiers,
  getTierSnapshot,
  checkPlanLimits as checkAccessPlanLimits,
  validateStatusTransition as validateAccessStatusTransition,
} from '../../access/subscription.service.js';

import {
  getRemainingAiQuota,
  reviewEngine,
} from '../../engine/reviewEngine.js';

test('Subscription Plans & Configurations', async (t) => {
  await t.test('Defines all 4 plan identifiers and 5 statuses', () => {
    assert.deepEqual(PLANS, {
      FREE: 'free',
      PRO: 'pro',
      TEAM: 'team',
      ENTERPRISE: 'enterprise',
    });

    assert.deepEqual(STATUSES, {
      ACTIVE: 'active',
      EXPIRED: 'expired',
      CANCELLED: 'cancelled',
      TRIALING: 'trialing',
      PAST_DUE: 'past_due',
    });
  });

  await t.test('Plan configurations match required specifications', () => {
    // Free
    assert.equal(PLAN_CONFIGS.free.monthlyReviews, 50);
    assert.equal(PLAN_CONFIGS.free.aiAssistedReviews, 5);
    assert.equal(PLAN_CONFIGS.free.linesPerReview, 1000);
    assert.equal(PLAN_CONFIGS.free.filesPerReview, 50);
    assert.equal(PLAN_CONFIGS.free.historyRetentionDays, 30);
    assert.equal(PLAN_CONFIGS.free.seats, 0);

    // Pro
    assert.equal(PLAN_CONFIGS.pro.monthlyReviews, 500);
    assert.equal(PLAN_CONFIGS.pro.aiAssistedReviews, 20);
    assert.equal(PLAN_CONFIGS.pro.linesPerReview, 5000);
    assert.equal(PLAN_CONFIGS.pro.filesPerReview, 100);
    assert.equal(PLAN_CONFIGS.pro.historyRetentionDays, 90);
    assert.equal(PLAN_CONFIGS.pro.seats, 10);

    // Team
    assert.equal(PLAN_CONFIGS.team.monthlyReviews, 5000);
    assert.equal(PLAN_CONFIGS.team.aiAssistedReviews, 100);
    assert.equal(PLAN_CONFIGS.team.linesPerReview, 10000);
    assert.equal(PLAN_CONFIGS.team.filesPerReview, 200);
    assert.equal(PLAN_CONFIGS.team.historyRetentionDays, 180);
    assert.equal(PLAN_CONFIGS.team.seats, 10);

    // Enterprise
    assert.equal(PLAN_CONFIGS.enterprise.monthlyReviews, 100000);
    assert.equal(PLAN_CONFIGS.enterprise.aiAssistedReviews, 500);
    assert.equal(PLAN_CONFIGS.enterprise.linesPerReview, 50000);
    assert.equal(PLAN_CONFIGS.enterprise.filesPerReview, 500);
    assert.equal(PLAN_CONFIGS.enterprise.historyRetentionDays, 365);
    assert.equal(PLAN_CONFIGS.enterprise.seats, 100);
  });

  await t.test('Default pricing is correctly configured', () => {
    assert.equal(DEFAULT_PRICES.free, 0);
    assert.equal(DEFAULT_PRICES.pro, 500);
    assert.equal(DEFAULT_PRICES.team, 2000);
    assert.equal(DEFAULT_PRICES.enterprise, 5000);
  });

  await t.test('Subscription service validation and policy lookups', () => {
    assert.equal(checkServicePlanLimits({ plan: 'free' }), true);
    assert.equal(checkServicePlanLimits({ plan: 'pro' }), true);
    assert.equal(checkServicePlanLimits({ plan: 'team' }), true);
    assert.equal(checkServicePlanLimits({ plan: 'enterprise' }), true);
    assert.throws(() => checkServicePlanLimits({ plan: 'nonexistent' }));

    assert.equal(validateServiceStatusTransition({ status: 'trialing' }), true);
    assert.equal(validateServiceStatusTransition({ status: 'active' }), true);
    assert.equal(validateServiceStatusTransition({ status: 'past_due' }), true);
    assert.equal(validateServiceStatusTransition({ status: 'expired' }), true);
    assert.equal(validateServiceStatusTransition({ status: 'cancelled' }), true);
    assert.throws(() => validateServiceStatusTransition({ status: 'invalid' }));
  });
});

test('Access Control Tier Policies', async (t) => {
  await t.test('Supports all 4 tiers', () => {
    assert.deepEqual(SUPPORTED_TIERS, ['free', 'pro', 'team', 'enterprise']);
    assert.deepEqual(getSupportedTiers(), ['free', 'pro', 'team', 'enterprise']);
    assert.equal(normalizeTier('  FREE  '), 'free');
    assert.equal(normalizeTier('PRO'), 'pro');
    assert.equal(normalizeTier('TEAM'), 'team');
    assert.equal(normalizeTier('ENTERPRISE'), 'enterprise');
  });

  await t.test('Tier permissions and feature access', () => {
    // Free tier
    assert.equal(hasFeatureAccess('free', 'archiveUpload'), false);
    assert.equal(hasFeatureAccess('free', 'aiAnalysis'), false);
    assert.equal(hasFeatureAccess('free', 'githubIntegration'), false);
    assert.equal(hasFeatureAccess('free', 'jsonReport'), true);

    // Pro tier
    assert.equal(hasFeatureAccess('pro', 'archiveUpload'), true);
    assert.equal(hasFeatureAccess('pro', 'aiAnalysis'), true);
    assert.equal(hasFeatureAccess('pro', 'advancedAnalysis'), true);
    assert.equal(hasFeatureAccess('pro', 'htmlReport'), true);
    assert.equal(hasFeatureAccess('pro', 'githubIntegration'), false);

    // Team tier
    assert.equal(hasFeatureAccess('team', 'archiveUpload'), true);
    assert.equal(hasFeatureAccess('team', 'aiAnalysis'), true);
    assert.equal(hasFeatureAccess('team', 'githubIntegration'), true);
    assert.equal(hasFeatureAccess('team', 'companyRules'), true);
    assert.equal(hasFeatureAccess('team', 'scheduledReviews'), true);
    assert.equal(getAccessTierPolicy('team').maxLinesPerReview, 10000);
    assert.equal(getAccessTierPolicy('team').maxFilesPerReview, 200);

    // Enterprise tier
    assert.equal(hasFeatureAccess('enterprise', 'archiveUpload'), true);
    assert.equal(hasFeatureAccess('enterprise', 'aiAnalysis'), true);
    assert.equal(hasFeatureAccess('enterprise', 'githubIntegration'), true);
    assert.equal(hasFeatureAccess('enterprise', 'companyRules'), true);
    assert.equal(hasFeatureAccess('enterprise', 'scheduledReviews'), true);
  });
});

test('AI Quota Calculation and Review Engine Integration', async (t) => {
  await t.test('getRemainingAiQuota correctly reads from plan defaults', () => {
    assert.equal(getRemainingAiQuota({ plan: 'free' }), 5);
    assert.equal(getRemainingAiQuota({ plan: 'pro' }), 20);
    assert.equal(getRemainingAiQuota({ plan: 'team' }), 100);
    assert.equal(getRemainingAiQuota({ plan: 'enterprise' }), 500);

    // String plan name
    assert.equal(getRemainingAiQuota('pro'), 20);
    assert.equal(getRemainingAiQuota('team'), 100);

    // Custom remaining quota
    assert.equal(getRemainingAiQuota({ plan: 'team', aiAssistedReviews: 42 }), 42);
    assert.equal(getRemainingAiQuota({ plan: 'pro', aiAssistedReviews: 0 }), 0);

    // Invalid or missing
    assert.equal(getRemainingAiQuota(null), 0);
    assert.equal(getRemainingAiQuota({ plan: 'unknown' }), 0);
  });

  await t.test('reviewEngine skips AI analysis when quota is exhausted', async () => {
    const source = {
      type: 'paste',
      files: [
        {
          path: 'src/index.js',
          content: 'const x = 1;\nconsole.log(x);',
        },
      ],
    };

    const result = await reviewEngine.run({
      source,
      options: {
        aiAnalysis: true,
      },
      subscription: {
        plan: 'pro',
        aiAssistedReviews: 0, // Exhausted!
      },
    });

    assert.ok(result);
    assert.ok(result.aiAnalysis);
    assert.equal(result.aiAnalysis.status, 'skipped');
    assert.equal(result.aiAnalysis.reason, 'AI quota exhausted');
    assert.equal(result.aiAnalysis.enabled, false);
    assert.equal(result.aiAnalysis.available, false);
    assert.deepEqual(result.aiAnalysis.findings, []);
  });

  await t.test('reviewEngine skips AI analysis when plan has no AI quota', async () => {
    const source = {
      type: 'paste',
      files: [
        {
          path: 'src/index.js',
          content: 'const a = 10;',
        },
      ],
    };

    const result = await reviewEngine.run({
      source,
      options: {
        aiAnalysis: true,
      },
      subscription: {
        plan: 'non_existent_tier',
      },
    });

    assert.ok(result);
    assert.ok(result.aiAnalysis);
    assert.equal(result.aiAnalysis.status, 'skipped');
    assert.equal(result.aiAnalysis.reason, 'No AI quota configured for this plan');
  });

  await t.test('reviewEngine skips AI analysis when option is false', async () => {
    const source = {
      type: 'paste',
      files: [
        {
          path: 'src/index.js',
          content: 'const a = 10;',
        },
      ],
    };

    const result = await reviewEngine.run({
      source,
      options: {
        aiAnalysis: false,
      },
      subscription: {
        plan: 'pro',
        aiAssistedReviews: 20,
      },
    });

    assert.ok(result);
    assert.ok(result.aiAnalysis);
    assert.equal(result.aiAnalysis.status, 'skipped');
    assert.equal(result.aiAnalysis.reason, 'AI analysis is not enabled for this review.');
  });
});
