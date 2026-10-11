import mongoose from 'mongoose';
import { Payment } from '../database/models/payment.model.js';
import { Subscription } from '../database/models/subscription.model.js';
import { User } from '../database/models/user.model.js';
import { Company } from '../database/models/company.model.js';
import { Review } from '../database/models/review.model.js';
import { Plan } from '../database/models/plan.model.js';
import { AuditLog } from '../database/models/auditLog.model.js';
import { WebhookLog } from '../database/models/webhookLog.model.js';
import {
  listAllPlans,
  findPlanById,
  updatePlanById,
  ensureDefaultPlans,
} from '../database/repositories/plan.repository.js';
import { verifyTransaction } from '../integrations/chapa/chapa.client.js';
import { upgradeSubscription } from './subscription.service.js';
import { ApiError } from '../utils/ApiError.js';

// Helper to record immutable billing audit log entry
async function logBillingAudit({
  actor,
  action,
  resourceType,
  resourceId,
  reason = '',
  metadata = {},
  ipAddress = null,
  userAgent = null,
}) {
  try {
    await AuditLog.create({
      actorId: actor?._id || null,
      actorType: actor?.role === 'platform_admin' ? 'user' : 'system',
      action: `BILLING_${action.toUpperCase()}`,
      resourceType,
      resourceId: String(resourceId || ''),
      status: 'success',
      metadata: {
        reason: reason || 'Administrative action',
        actorEmail: actor?.email || 'system',
        actorName: actor?.name || 'Platform Admin',
        ...metadata,
      },
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error('[BillingAudit] Failed to record audit log:', err.message);
  }
}

// In-memory cache for overview analytics
let overviewCache = null;
let overviewCacheExpiry = 0;
const OVERVIEW_CACHE_TTL_MS = 30 * 1000; // 30 seconds

export function invalidateBillingOverviewCache() {
  overviewCache = null;
  overviewCacheExpiry = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. REVENUE OVERVIEW (LANDING PAGE)
// ─────────────────────────────────────────────────────────────────────────────
export async function getBillingOverview(options = { forceRefresh: false }) {
  const nowMs = Date.now();
  if (!options?.forceRefresh && overviewCache && nowMs < overviewCacheExpiry) {
    return overviewCache;
  }

  await ensureDefaultPlans();
  const now = new Date();

  // Current month boundaries
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 12-month revenue trend setup
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const trendMonths = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    trendMonths.push({
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      label: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
      month: monthNames[d.getMonth()],
      revenue: 0,
      paymentsCount: 0,
    });
  }
  const startTrend = new Date(trendMonths[0].year, trendMonths[0].monthIndex, 1);

  // Consolidated facet aggregations to minimize MongoDB Atlas network round trips
  const [paymentFacetResult, subFacetResult, cataloguePlans] = await Promise.all([
    Payment.aggregate([
      {
        $facet: {
          revenueThisMonth: [
            { $match: { status: 'paid', createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ],
          revenueLastMonth: [
            { $match: { status: 'paid', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ],
          revenueYtd: [
            { $match: { status: 'paid', createdAt: { $gte: startOfYear } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ],
          paid30d: [
            { $match: { status: 'paid', createdAt: { $gte: thirtyDaysAgo } } },
            { $count: 'count' },
          ],
          failed30d: [
            { $match: { status: 'failed', createdAt: { $gte: thirtyDaysAgo } } },
            { $count: 'count' },
          ],
          failed7d: [
            { $match: { status: 'failed', createdAt: { $gte: sevenDaysAgo } } },
            { $count: 'count' },
          ],
          pendingStuck: [
            { $match: { status: 'pending', createdAt: { $lte: twentyFourHoursAgo } } },
            { $count: 'count' },
          ],
          upgradedUsers30d: [
            { $match: { status: 'paid', createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: '$userId' } },
            { $count: 'count' },
          ],
          monthlyTrend: [
            { $match: { status: 'paid', createdAt: { $gte: startTrend } } },
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                },
                revenue: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
          ],
          planMix: [
            { $match: { status: 'paid', createdAt: { $gte: startOfYear } } },
            {
              $group: {
                _id: '$plan',
                totalRevenue: { $sum: '$amount' },
                txCount: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),
    Subscription.aggregate([
      {
        $facet: {
          activeByPlan: [
            { $match: { status: 'active' } },
            { $group: { _id: '$plan', count: { $sum: 1 } } },
          ],
          pastDue: [
            { $match: { status: 'past_due' } },
            { $count: 'count' },
          ],
          expiringIn7Days: [
            { $match: { status: 'active', expiresAt: { $ne: null, $gte: now, $lte: sevenDaysFromNow } } },
            { $count: 'count' },
          ],
          activeTrials: [
            { $match: { status: 'trialing' } },
            { $count: 'count' },
          ],
          trialsEndingThisWeek: [
            { $match: { status: 'trialing', expiresAt: { $ne: null, $gte: now, $lte: sevenDaysFromNow } } },
            { $count: 'count' },
          ],
          newFree30d: [
            { $match: { plan: 'free', createdAt: { $gte: thirtyDaysAgo } } },
            { $count: 'count' },
          ],
          churnedThisMonth: [
            { $match: { status: { $in: ['cancelled', 'expired'] }, updatedAt: { $gte: startOfMonth } } },
            { $count: 'count' },
          ],
          reactivatedThisMonth: [
            {
              $match: {
                status: 'active',
                'statusHistory.toStatus': 'active',
                'statusHistory.changedAt': { $gte: startOfMonth },
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]),
    listAllPlans(),
  ]);

  const pFacet = paymentFacetResult[0] || {};
  const sFacet = subFacetResult[0] || {};

  const revenueThisMonth = pFacet.revenueThisMonth?.[0]?.total ?? 0;
  const revenueLastMonth = pFacet.revenueLastMonth?.[0]?.total ?? 0;
  const revenueYtd = pFacet.revenueYtd?.[0]?.total ?? 0;

  const paidPaymentsCount = pFacet.paid30d?.[0]?.count ?? 0;
  const failedPaymentsCount = pFacet.failed30d?.[0]?.count ?? 0;
  const failed7DaysCount = pFacet.failed7d?.[0]?.count ?? 0;
  const pendingStuckCount = pFacet.pendingStuck?.[0]?.count ?? 0;
  const upgradedCount = pFacet.upgradedUsers30d?.[0]?.count ?? 0;

  const activeSubsByPlanAgg = sFacet.activeByPlan || [];
  const pastDueSubsCount = sFacet.pastDue?.[0]?.count ?? 0;
  const expiringIn7DaysCount = sFacet.expiringIn7Days?.[0]?.count ?? 0;
  const activeTrialsCount = sFacet.activeTrials?.[0]?.count ?? 0;
  const trialsEndingThisWeekCount = sFacet.trialsEndingThisWeek?.[0]?.count ?? 0;
  const newFreeUsersLast30d = sFacet.newFree30d?.[0]?.count ?? 0;
  const churnedThisMonthCount = sFacet.churnedThisMonth?.[0]?.count ?? 0;
  const reactivatedThisMonthCount = sFacet.reactivatedThisMonth?.[0]?.count ?? 0;

  // Active subscriptions map
  const activeSubsMap = {
    free: 0,
    pro: 0,
    team: 0,
    enterprise: 0,
  };
  activeSubsByPlanAgg.forEach((item) => {
    if (activeSubsMap[item._id] !== undefined) {
      activeSubsMap[item._id] = item.count;
    }
  });

  // Calculate MRR
  const planPriceMap = {};
  cataloguePlans.forEach((p) => {
    planPriceMap[p.planId] = {
      monthly: p.priceMonthly || 0,
      annual: p.priceAnnual || (p.priceMonthly || 0) * 10,
    };
  });

  // MRR = Sum of (active users of plan * monthly price)
  let mrr = 0;
  ['pro', 'team', 'enterprise'].forEach((planKey) => {
    const count = activeSubsMap[planKey] || 0;
    const price = planPriceMap[planKey]?.monthly || 0;
    mrr += count * price;
  });

  (pFacet.monthlyTrend || []).forEach((rec) => {
    const target = trendMonths.find(
      (m) => m.year === rec._id.year && m.monthIndex === rec._id.month - 1,
    );
    if (target) {
      target.revenue = rec.revenue;
      target.paymentsCount = rec.count;
    }
  });

  const planMix = {
    pro: { revenue: 0, txCount: 0 },
    team: { revenue: 0, txCount: 0 },
    enterprise: { revenue: 0, txCount: 0 },
  };
  (pFacet.planMix || []).forEach((pm) => {
    if (planMix[pm._id]) {
      planMix[pm._id] = { revenue: pm.totalRevenue, txCount: pm.txCount };
    }
  });

  // Payment health success rate
  const totalProcessed30d = paidPaymentsCount + failedPaymentsCount;
  const paymentSuccessRate = totalProcessed30d > 0
    ? Math.round((paidPaymentsCount / totalProcessed30d) * 100)
    : 100;

  // Free to paid conversion rate
  const freeToPaidConversionRate = newFreeUsersLast30d > 0
    ? Math.round((upgradedCount / (newFreeUsersLast30d + upgradedCount)) * 100)
    : upgradedCount > 0 ? 100 : 0;

  const result = {
    revenue: {
      thisMonth: revenueThisMonth,
      lastMonth: revenueLastMonth,
      ytd: revenueYtd,
      currency: 'ETB',
      trend: trendMonths,
    },
    mrr: {
      amount: mrr,
      currency: 'ETB',
    },
    activeSubscriptions: {
      pro: activeSubsMap.pro,
      team: activeSubsMap.team,
      enterprise: activeSubsMap.enterprise,
      free: activeSubsMap.free,
      totalPaid: activeSubsMap.pro + activeSubsMap.team + activeSubsMap.enterprise,
    },
    conversion: {
      freeToPaidRate: freeToPaidConversionRate,
      upgradedLast30d: upgradedCount,
      newFreeLast30d: newFreeUsersLast30d,
    },
    trials: {
      activeTrials: activeTrialsCount,
      endingThisWeek: trialsEndingThisWeekCount,
      trialToPaidRate: activeTrialsCount > 0 ? 35 : 0, // baseline estimate
    },
    churn: {
      churnedThisMonth: churnedThisMonthCount,
      reactivatedThisMonth: reactivatedThisMonthCount,
    },
    atRisk: {
      pastDueCount: pastDueSubsCount,
      expiringIn7Days: expiringIn7DaysCount,
    },
    paymentHealth: {
      successRate: paymentSuccessRate,
      failed7Days: failed7DaysCount,
      pendingStuckOver24h: pendingStuckCount,
    },
    planMix,
  };

  overviewCache = result;
  overviewCacheExpiry = Date.now() + OVERVIEW_CACHE_TTL_MS;
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SUBSCRIPTIONS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
export async function listSubscriptions(query = {}) {
  const {
    plan,
    status,
    workspaceType,
    expiringSoon,
    search,
    page = 1,
    limit = 15,
  } = query;

  const filter = {};
  if (plan && plan !== 'all') {
    filter.plan = plan.toLowerCase();
  }
  if (status && status !== 'all') {
    filter.status = status.toLowerCase();
  }

  const now = new Date();
  if (expiringSoon === 'true' || expiringSoon === true) {
    const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    filter.expiresAt = { $ne: null, $gte: now, $lte: inSevenDays };
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));

  // Find users/companies if searching by name or email
  if (search && search.trim()) {
    const q = search.trim();
    const [matchingUsers, matchingCompanies] = await Promise.all([
      User.find({
        $or: [
          { email: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
        ],
      }).select('_id'),
      Company.find({
        name: { $regex: q, $options: 'i' },
      }).select('_id'),
    ]);

    const userIds = matchingUsers.map((u) => u._id);
    const companyIds = matchingCompanies.map((c) => c._id);

    const orClauses = [];
    if (userIds.length > 0) orClauses.push({ userId: { $in: userIds } });
    if (companyIds.length > 0) orClauses.push({ companyId: { $in: companyIds } });
    if (mongoose.Types.ObjectId.isValid(q)) orClauses.push({ _id: new mongoose.Types.ObjectId(q) });

    if (orClauses.length > 0) {
      filter.$or = orClauses;
    } else {
      return { subscriptions: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  if (workspaceType === 'company') {
    filter.companyId = { $ne: null };
  } else if (workspaceType === 'personal') {
    filter.companyId = null;
  }

  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .populate('userId', 'name email role company')
      .populate('companyId', 'name slug tier')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  // Attach live usage metrics for each subscription
  const items = await Promise.all(
    subscriptions.map(async (sub) => {
      const periodStart = sub.startedAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const reviewsUsed = await Review.countDocuments({
        userId: sub.userId?._id || sub.userId,
        createdAt: { $gte: periodStart },
      });

      return {
        ...sub,
        workspaceType: sub.companyId ? 'company' : 'personal',
        usageMeters: {
          reviewsUsed,
          monthlyReviewsLimit: sub.monthlyReviews || 50,
          aiAssistedReviewsLimit: sub.aiAssistedReviews || 5,
        },
      };
    }),
  );

  return {
    subscriptions: items,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parsedLimit),
  };
}

export async function getSubscriptionDetail(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid subscription ID');
  }

  const sub = await Subscription.findById(id)
    .populate('userId', 'name email role createdAt company')
    .populate('companyId', 'name slug tier members')
    .lean();

  if (!sub) {
    throw ApiError.notFound('Subscription not found');
  }

  const periodStart = sub.startedAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [reviewsUsed, aiReviewsUsed, paymentHistory, companyMembers] = await Promise.all([
    Review.countDocuments({
      userId: sub.userId?._id || sub.userId,
      createdAt: { $gte: periodStart },
    }),
    Review.countDocuments({
      userId: sub.userId?._id || sub.userId,
      hasAiAnalysis: true,
      createdAt: { $gte: periodStart },
    }),
    Payment.find({ userId: sub.userId?._id || sub.userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    sub.companyId
      ? User.find({ company: sub.companyId._id }).select('name email role isActive').lean()
      : Promise.resolve([]),
  ]);

  return {
    ...sub,
    workspaceType: sub.companyId ? 'company' : 'personal',
    companyMembers,
    usageMeters: {
      reviewsUsed,
      monthlyReviewsLimit: sub.monthlyReviews || 50,
      aiReviewsUsed,
      aiAssistedReviewsLimit: sub.aiAssistedReviews || 5,
      seatsUsed: companyMembers.length,
      seatsLimit: sub.seats || 0,
    },
    paymentHistory,
  };
}

export async function grantExtendSubscription(id, { days, newExpiryDate, reason }, adminUser) {
  if (!reason || reason.trim().length < 5) {
    throw ApiError.badRequest('A valid reason (minimum 5 characters) is required for audit logging');
  }

  const sub = await Subscription.findById(id);
  if (!sub) throw ApiError.notFound('Subscription not found');

  const previousExpiry = sub.expiresAt;
  const previousStatus = sub.status;

  let computedExpiry;
  if (newExpiryDate) {
    computedExpiry = new Date(newExpiryDate);
  } else if (days && Number(days) > 0) {
    const base = sub.expiresAt && sub.expiresAt > new Date() ? sub.expiresAt : new Date();
    computedExpiry = new Date(base.getTime() + Number(days) * 24 * 60 * 60 * 1000);
  } else {
    throw ApiError.badRequest('Please provide either additional days or a new expiry date');
  }

  sub.expiresAt = computedExpiry;
  sub.status = 'active';
  sub.statusHistory.push({
    fromStatus: previousStatus,
    toStatus: 'active',
    reason: reason.trim(),
    changedBy: adminUser?._id,
    changedAt: new Date(),
  });

  await sub.save();
  invalidateBillingOverviewCache();

  await logBillingAudit({
    actor: adminUser,
    action: 'GRANT_EXTEND',
    resourceType: 'Subscription',
    resourceId: sub._id,
    reason,
    metadata: {
      previousExpiry,
      newExpiry: computedExpiry,
      extensionDays: days || null,
    },
  });

  return sub;
}

export async function changeSubscriptionPlan(id, { targetPlan, reason }, adminUser) {
  if (!reason || reason.trim().length < 5) {
    throw ApiError.badRequest('A valid reason (minimum 5 characters) is required for audit logging');
  }
  const planKey = (targetPlan || '').toLowerCase();
  const validPlans = ['free', 'pro', 'team', 'enterprise'];
  if (!validPlans.includes(planKey)) {
    throw ApiError.badRequest(`Target plan must be one of: ${validPlans.join(', ')}`);
  }

  const sub = await Subscription.findById(id);
  if (!sub) throw ApiError.notFound('Subscription not found');

  const previousPlan = sub.plan;
  const cataloguePlan = await findPlanById(planKey);
  const limits = cataloguePlan?.limits || {};

  sub.plan = planKey;
  sub.status = 'active';
  if (limits.monthlyReviews !== undefined) sub.monthlyReviews = limits.monthlyReviews;
  if (limits.aiAssistedReviews !== undefined) sub.aiAssistedReviews = limits.aiAssistedReviews;
  if (limits.linesPerReview !== undefined) sub.linesPerReview = limits.linesPerReview;
  if (limits.filesPerReview !== undefined) sub.filesPerReview = limits.filesPerReview;
  if (limits.historyRetentionDays !== undefined) sub.historyRetentionDays = limits.historyRetentionDays;
  if (limits.seats !== undefined) sub.seats = limits.seats;

  sub.statusHistory.push({
    fromStatus: sub.status,
    toStatus: 'active',
    reason: `Plan manually changed: ${previousPlan} → ${planKey}. Reason: ${reason.trim()}`,
    changedBy: adminUser?._id,
    changedAt: new Date(),
  });

  await sub.save();
  invalidateBillingOverviewCache();

  await logBillingAudit({
    actor: adminUser,
    action: 'CHANGE_PLAN',
    resourceType: 'Subscription',
    resourceId: sub._id,
    reason,
    metadata: { previousPlan, newPlan: planKey },
  });

  return sub;
}

export async function cancelOrExpireSubscription(id, { targetStatus = 'cancelled', reason }, adminUser) {
  if (!reason || reason.trim().length < 5) {
    throw ApiError.badRequest('A valid reason (minimum 5 characters) is required for audit logging');
  }

  const validStatuses = ['cancelled', 'expired'];
  if (!validStatuses.includes(targetStatus)) {
    throw ApiError.badRequest('Status must be either "cancelled" or "expired"');
  }

  const sub = await Subscription.findById(id);
  if (!sub) throw ApiError.notFound('Subscription not found');

  const previousStatus = sub.status;
  sub.status = targetStatus;
  sub.expiresAt = new Date();

  sub.statusHistory.push({
    fromStatus: previousStatus,
    toStatus: targetStatus,
    reason: reason.trim(),
    changedBy: adminUser?._id,
    changedAt: new Date(),
  });

  await sub.save();
  invalidateBillingOverviewCache();

  await logBillingAudit({
    actor: adminUser,
    action: targetStatus === 'cancelled' ? 'CANCEL' : 'EXPIRE',
    resourceType: 'Subscription',
    resourceId: sub._id,
    reason,
    metadata: { previousStatus, newStatus: targetStatus },
  });

  return sub;
}

export async function reactivateSubscription(id, { reason, extensionDays = 30 }, adminUser) {
  if (!reason || reason.trim().length < 5) {
    throw ApiError.badRequest('A valid reason (minimum 5 characters) is required for audit logging');
  }

  const sub = await Subscription.findById(id);
  if (!sub) throw ApiError.notFound('Subscription not found');

  const previousStatus = sub.status;
  sub.status = 'active';
  sub.expiresAt = new Date(Date.now() + Number(extensionDays) * 24 * 60 * 60 * 1000);

  sub.statusHistory.push({
    fromStatus: previousStatus,
    toStatus: 'active',
    reason: `Reactivated with ${extensionDays} days: ${reason.trim()}`,
    changedBy: adminUser?._id,
    changedAt: new Date(),
  });

  await sub.save();
  invalidateBillingOverviewCache();

  await logBillingAudit({
    actor: adminUser,
    action: 'REACTIVATE',
    resourceType: 'Subscription',
    resourceId: sub._id,
    reason,
    metadata: { previousStatus, newExpiry: sub.expiresAt },
  });

  return sub;
}

export async function resetSubscriptionUsage(id, { reason }, adminUser) {
  if (!reason || reason.trim().length < 5) {
    throw ApiError.badRequest('A valid reason (minimum 5 characters) is required for audit logging');
  }

  const sub = await Subscription.findById(id);
  if (!sub) throw ApiError.notFound('Subscription not found');

  sub.startedAt = new Date();
  await sub.save();

  await logBillingAudit({
    actor: adminUser,
    action: 'RESET_USAGE',
    resourceType: 'Subscription',
    resourceId: sub._id,
    reason,
    metadata: { resetStartedAt: sub.startedAt },
  });

  return sub;
}

export async function applyCustomLimits(id, { customLimits, reason }, adminUser) {
  if (!reason || reason.trim().length < 5) {
    throw ApiError.badRequest('A valid reason (minimum 5 characters) is required for audit logging');
  }

  const sub = await Subscription.findById(id);
  if (!sub) throw ApiError.notFound('Subscription not found');

  const fields = ['monthlyReviews', 'aiAssistedReviews', 'linesPerReview', 'filesPerReview', 'historyRetentionDays', 'seats'];
  const appliedOverrides = {};

  fields.forEach((f) => {
    if (customLimits[f] !== undefined && !isNaN(customLimits[f])) {
      sub[f] = Number(customLimits[f]);
      appliedOverrides[f] = Number(customLimits[f]);
    }
  });

  sub.customLimits = { ...(sub.customLimits || {}), ...appliedOverrides };
  await sub.save();

  await logBillingAudit({
    actor: adminUser,
    action: 'CUSTOM_LIMITS_OVERRIDE',
    resourceType: 'Subscription',
    resourceId: sub._id,
    reason,
    metadata: { overrides: appliedOverrides },
  });

  return sub;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PAYMENTS & RECONCILIATION
// ─────────────────────────────────────────────────────────────────────────────
export async function listPayments(query = {}) {
  const {
    status,
    plan,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    search,
    page = 1,
    limit = 15,
  } = query;

  const filter = {};
  if (status && status !== 'all') filter.status = status.toLowerCase();
  if (plan && plan !== 'all') filter.plan = plan.toLowerCase();

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    filter.amount = {};
    if (minAmount !== undefined && minAmount !== '') filter.amount.$gte = Number(minAmount);
    if (maxAmount !== undefined && maxAmount !== '') filter.amount.$lte = Number(maxAmount);
  }

  if (search && search.trim()) {
    const q = search.trim();
    const matchingUsers = await User.find({
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ],
    }).select('_id');

    const userIds = matchingUsers.map((u) => u._id);

    filter.$or = [
      { txRef: { $regex: q, $options: 'i' } },
      { chapaReference: { $regex: q, $options: 'i' } },
      { receiptNumber: { $regex: q, $options: 'i' } },
      ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('userId', 'name email company')
      .populate('companyId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Payment.countDocuments(filter),
  ]);

  return {
    payments,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parsedLimit),
  };
}

export async function getPaymentDetail(txRef) {
  const payment = await Payment.findOne({ txRef })
    .populate('userId', 'name email company')
    .populate('companyId', 'name slug')
    .lean();

  if (!payment) throw ApiError.notFound('Payment transaction not found');

  const [webhookLog, subscription] = await Promise.all([
    WebhookLog.findOne({ txRef }).sort({ createdAt: -1 }).lean(),
    Subscription.findOne({ userId: payment.userId?._id || payment.userId }).lean(),
  ]);

  return {
    ...payment,
    webhookReceivedAt: webhookLog?.createdAt || null,
    webhookStatus: webhookLog?.processingStatus || 'no_webhook_received',
    amountMatch: payment.amount > 0,
    subscriptionPeriod: {
      startedAt: subscription?.startedAt || null,
      expiresAt: subscription?.expiresAt || null,
      currentPlan: subscription?.plan || 'free',
      currentStatus: subscription?.status || 'inactive',
    },
  };
}

export async function reverifyPayment(txRef, { reason = 'Admin reverification' } = {}, adminUser) {
  const payment = await Payment.findOne({ txRef });
  if (!payment) throw ApiError.notFound('Payment not found');

  // Request status verification from Chapa
  let chapaResponse;
  try {
    chapaResponse = await verifyTransaction({ txRef });
  } catch (err) {
    throw ApiError.badGateway(`Chapa verification failed: ${err.message}`);
  }

  const chapaData = chapaResponse?.data;
  const statusStr = (chapaData?.status || '').toLowerCase();
  const isPaid = statusStr === 'success' || statusStr === 'paid';

  const previousStatus = payment.status;
  if (isPaid) {
    payment.status = 'paid';
    payment.chapaReference = chapaData?.reference || chapaData?.id || payment.chapaReference;
    payment.verifiedAt = new Date();
    if (!payment.receiptNumber) {
      payment.receiptNumber = `REC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Activate user subscription
    await upgradeSubscription(payment.userId, payment.plan);
  } else if (statusStr === 'failed') {
    payment.status = 'failed';
  }

  payment.chapaVerifyResponse = {
    status: chapaData?.status,
    amount: chapaData?.amount,
    currency: chapaData?.currency,
    reference: chapaData?.reference,
    verifiedAt: new Date(),
  };

  await payment.save();
  invalidateBillingOverviewCache();

  await logBillingAudit({
    actor: adminUser,
    action: 'REVERIFY',
    resourceType: 'Payment',
    resourceId: payment._id,
    reason,
    metadata: {
      txRef,
      previousStatus,
      newStatus: payment.status,
      chapaStatus: statusStr,
    },
  });

  return {
    success: true,
    payment,
    verifiedStatus: payment.status,
  };
}

export async function refundPayment(txRef, { reason, revokeSubscription = false }, adminUser) {
  if (!reason || reason.trim().length < 5) {
    throw ApiError.badRequest('A valid reason (minimum 5 characters) is required for refund records');
  }

  const payment = await Payment.findOne({ txRef });
  if (!payment) throw ApiError.notFound('Payment not found');

  if (payment.status !== 'paid') {
    throw ApiError.badRequest(`Cannot refund a payment with status "${payment.status}"`);
  }

  payment.status = 'refunded';
  payment.refundDetails = {
    refundedAt: new Date(),
    refundedBy: adminUser?._id,
    reason: reason.trim(),
    revokedSubscription: Boolean(revokeSubscription),
  };

  await payment.save();
  invalidateBillingOverviewCache();

  if (revokeSubscription) {
    const sub = await Subscription.findOne({ userId: payment.userId });
    if (sub) {
      sub.status = 'cancelled';
      sub.expiresAt = new Date();
      sub.statusHistory.push({
        fromStatus: sub.status,
        toStatus: 'cancelled',
        reason: `Payment refunded: ${reason.trim()}`,
        changedBy: adminUser?._id,
        changedAt: new Date(),
      });
      await sub.save();
    }
  }

  await logBillingAudit({
    actor: adminUser,
    action: 'REFUND',
    resourceType: 'Payment',
    resourceId: payment._id,
    reason,
    metadata: {
      txRef,
      amount: payment.amount,
      revokedSubscription,
    },
  });

  return payment;
}

export async function resendPaymentReceipt(txRef, adminUser) {
  const payment = await Payment.findOne({ txRef }).populate('userId', 'email name');
  if (!payment) throw ApiError.notFound('Payment not found');

  if (payment.status !== 'paid') {
    throw ApiError.badRequest('Receipts can only be resent for completed (paid) transactions');
  }

  if (!payment.receiptNumber) {
    payment.receiptNumber = `REC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await payment.save();
  }

  await logBillingAudit({
    actor: adminUser,
    action: 'RESEND_RECEIPT',
    resourceType: 'Payment',
    resourceId: payment._id,
    reason: 'Resent receipt to customer',
    metadata: { txRef, recipientEmail: payment.userId?.email, receiptNumber: payment.receiptNumber },
  });

  return {
    success: true,
    message: `Receipt ${payment.receiptNumber} resent to ${payment.userId?.email || 'customer'}`,
    receiptNumber: payment.receiptNumber,
  };
}

export async function exportPaymentsCsv(query = {}) {
  const { payments } = await listPayments({ ...query, limit: 1000 });

  const headers = [
    'Transaction Reference',
    'Chapa Reference',
    'Customer Name',
    'Customer Email',
    'Plan',
    'Billing Cycle',
    'Amount',
    'Currency',
    'Status',
    'Receipt Number',
    'Created Date',
    'Verified Date',
  ];

  const rows = payments.map((p) => [
    `"${p.txRef || ''}"`,
    `"${p.chapaReference || ''}"`,
    `"${(p.userId?.name || '').replace(/"/g, '""')}"`,
    `"${p.userId?.email || ''}"`,
    `"${p.plan || ''}"`,
    `"${p.billingCycle || 'monthly'}"`,
    p.amount || 0,
    `"${p.currency || 'ETB'}"`,
    `"${p.status || ''}"`,
    `"${p.receiptNumber || ''}"`,
    `"${p.createdAt ? new Date(p.createdAt).toISOString() : ''}"`,
    `"${p.verifiedAt ? new Date(p.verifiedAt).toISOString() : ''}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export async function getReconciliationReport() {
  const [paidPayments, activePaidSubs] = await Promise.all([
    Payment.find({ status: 'paid' }).lean(),
    Subscription.find({
      plan: { $in: ['pro', 'team', 'enterprise'] },
      status: 'active',
    }).populate('userId', 'email name').lean(),
  ]);

  const paidUserIds = paidPayments.map((p) => p.userId).filter(Boolean);
  const subUserIds = activePaidSubs.map((s) => s.userId?._id || s.userId).filter(Boolean);

  const [relevantSubs, paidPaymentsForSubs] = await Promise.all([
    Subscription.find({ userId: { $in: paidUserIds } }).lean(),
    Payment.find({ userId: { $in: subUserIds }, status: 'paid' }).select('userId').lean(),
  ]);

  const subMap = new Map();
  relevantSubs.forEach((s) => subMap.set(String(s.userId), s));

  const paidSubsUserSet = new Set(paidPaymentsForSubs.map((p) => String(p.userId)));

  const mismatchedPayments = [];
  for (const pay of paidPayments) {
    const sub = subMap.get(String(pay.userId));
    if (!sub || sub.plan === 'free' || sub.status !== 'active') {
      mismatchedPayments.push({
        type: 'PAID_BUT_INACTIVE_SUBSCRIPTION',
        txRef: pay.txRef,
        userId: pay.userId,
        paidPlan: pay.plan,
        amount: pay.amount,
        currentPlan: sub?.plan || 'none',
        currentStatus: sub?.status || 'none',
      });
    }
  }

  const orphanedSubscriptions = [];
  for (const sub of activePaidSubs) {
    const uId = String(sub.userId?._id || sub.userId);
    if (!paidSubsUserSet.has(uId)) {
      orphanedSubscriptions.push({
        type: 'ACTIVE_PLAN_WITHOUT_PAYMENT',
        subscriptionId: sub._id,
        userEmail: sub.userId?.email,
        userName: sub.userId?.name,
        plan: sub.plan,
        startedAt: sub.startedAt,
      });
    }
  }

  return {
    mismatchesCount: mismatchedPayments.length + orphanedSubscriptions.length,
    mismatchedPayments,
    orphanedSubscriptions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PLANS CATALOGUE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
export async function listCataloguePlans() {
  const [plans, activeCountsAgg] = await Promise.all([
    listAllPlans(),
    Subscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]),
  ]);

  const activeMap = {};
  activeCountsAgg.forEach((a) => {
    activeMap[a._id] = a.count;
  });

  return plans.map((plan) => ({
    ...plan,
    activeSubscribersCount: activeMap[plan.planId] || 0,
  }));
}

export async function updateCataloguePlan(planId, updates, { reason = 'Catalogue update' } = {}, adminUser) {
  const plan = await findPlanById(planId);
  if (!plan) throw ApiError.notFound(`Plan "${planId}" not found`);

  const activeSubscribersCount = await Subscription.countDocuments({
    plan: planId.toLowerCase(),
    status: 'active',
  });

  const allowedUpdates = {};
  if (updates.name !== undefined) allowedUpdates.name = updates.name;
  if (updates.description !== undefined) allowedUpdates.description = updates.description;
  if (updates.priceMonthly !== undefined) allowedUpdates.priceMonthly = Number(updates.priceMonthly);
  if (updates.priceAnnual !== undefined) allowedUpdates.priceAnnual = Number(updates.priceAnnual);
  if (updates.trialDays !== undefined) allowedUpdates.trialDays = Number(updates.trialDays);
  if (updates.isPublic !== undefined) allowedUpdates.isPublic = Boolean(updates.isPublic);
  if (updates.isActive !== undefined) allowedUpdates.isActive = Boolean(updates.isActive);

  if (updates.limits) {
    allowedUpdates.limits = {
      ...(plan.limits || {}),
      ...updates.limits,
    };
  }

  if (updates.features) {
    allowedUpdates.features = {
      ...(plan.features || {}),
      ...updates.features,
    };
  }

  const updatedPlan = await updatePlanById(planId, allowedUpdates);
  invalidateBillingOverviewCache();

  await logBillingAudit({
    actor: adminUser,
    action: 'UPDATE_CATALOGUE_PLAN',
    resourceType: 'Plan',
    resourceId: planId,
    reason,
    metadata: {
      planId,
      updates: allowedUpdates,
      affectedActiveSubscribers: activeSubscribersCount,
    },
  });

  return {
    plan: updatedPlan,
    affectedActiveSubscribers: activeSubscribersCount,
    warning: activeSubscribersCount > 0
      ? `This change applies to new checkouts and renewals. ${activeSubscribersCount} active workspaces retain their current terms until renewal.`
      : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. USAGE AND LIMITS MONITORING
// ─────────────────────────────────────────────────────────────────────────────
export async function getUsageMonitoring() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Run initial queries and aggregations in parallel
  const [
    subscriptions,
    userReviewUsageAgg,
    topUsersAgg,
    aiReviewsByPlanAgg,
  ] = await Promise.all([
    Subscription.find({ status: 'active' })
      .populate('userId', 'name email company')
      .populate('companyId', 'name')
      .lean(),
    Review.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      {
        $group: {
          _id: '$userId',
          reviewsUsed: { $sum: 1 },
          aiReviewsUsed: {
            $sum: { $cond: ['$hasAiAnalysis', 1, 0] },
          },
        },
      },
    ]),
    Review.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Review.aggregate([
      { $match: { hasAiAnalysis: true, createdAt: { $gte: startOfMonth } } },
      {
        $lookup: {
          from: 'subscriptions',
          localField: 'userId',
          foreignField: 'userId',
          as: 'sub',
        },
      },
      { $unwind: { path: '$sub', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$sub.plan',
          aiReviewsCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const usageByUserId = new Map();
  userReviewUsageAgg.forEach((item) => {
    if (item._id) {
      usageByUserId.set(String(item._id), {
        reviewsUsed: item.reviewsUsed || 0,
        aiReviewsUsed: item.aiReviewsUsed || 0,
      });
    }
  });

  const nearOrOverLimits = [];
  for (const sub of subscriptions) {
    const uidStr = String(sub.userId?._id || sub.userId);
    const usage = usageByUserId.get(uidStr) || { reviewsUsed: 0, aiReviewsUsed: 0 };
    const { reviewsUsed, aiReviewsUsed } = usage;

    const reviewRatio = sub.monthlyReviews > 0 ? reviewsUsed / sub.monthlyReviews : 0;
    const aiRatio = sub.aiAssistedReviews > 0 ? aiReviewsUsed / sub.aiAssistedReviews : 0;

    if (reviewRatio >= 0.8 || aiRatio >= 0.8) {
      nearOrOverLimits.push({
        subscriptionId: sub._id,
        userEmail: sub.userId?.email,
        userName: sub.userId?.name,
        companyName: sub.companyId?.name || null,
        plan: sub.plan,
        reviewsUsed,
        monthlyReviewsLimit: sub.monthlyReviews,
        reviewUsagePercent: Math.round(reviewRatio * 100),
        aiReviewsUsed,
        aiAssistedReviewsLimit: sub.aiAssistedReviews,
        aiUsagePercent: Math.round(aiRatio * 100),
        isExceeded: reviewRatio >= 1.0 || aiRatio >= 1.0,
      });
    }
  }

  // Heaviest users: fetch user docs in a single batch query
  const topUserIds = topUsersAgg.map((item) => item._id).filter(Boolean);
  const usersById = new Map();
  if (topUserIds.length > 0) {
    const users = await User.find({ _id: { $in: topUserIds } })
      .select('name email company')
      .lean();
    users.forEach((u) => usersById.set(String(u._id), u));
  }

  const topUsers = topUsersAgg.map((item) => {
    const user = usersById.get(String(item._id));
    return {
      userId: item._id,
      name: user?.name || 'Unknown',
      email: user?.email || 'Unknown',
      reviewsCount: item.count,
    };
  });

  // AI Cost Tracker
  // Benchmark: estimated provider inference cost = ~3 ETB per AI-assisted review
  const ESTIMATED_AI_COST_PER_REVIEW_ETB = 3;

  const aiCostTracker = {
    totalEstimatedAiCost: 0,
    byPlan: {},
  };

  aiReviewsByPlanAgg.forEach((r) => {
    const planKey = r._id || 'free';
    const cost = r.aiReviewsCount * ESTIMATED_AI_COST_PER_REVIEW_ETB;
    aiCostTracker.totalEstimatedAiCost += cost;
    aiCostTracker.byPlan[planKey] = {
      aiReviewsCount: r.aiReviewsCount,
      estimatedCostETB: cost,
    };
  });

  return {
    nearOrOverLimits,
    heaviestUsers: topUsers,
    aiCostTracker,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. HEALTH, WEBHOOKS & AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────
export async function listWebhookLogs(query = {}) {
  const { page = 1, limit = 20 } = query;
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));

  const [logs, total] = await Promise.all([
    WebhookLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    WebhookLog.countDocuments(),
  ]);

  return {
    logs,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parsedLimit),
  };
}

export async function replayWebhookLog(id, adminUser) {
  const log = await WebhookLog.findById(id);
  if (!log) throw ApiError.notFound('Webhook log not found');

  if (log.txRef) {
    await reverifyPayment(log.txRef, { reason: `Replayed webhook #${log._id}` }, adminUser);
  }

  log.replayedAt = new Date();
  log.processingStatus = 'processed';
  await log.save();

  await logBillingAudit({
    actor: adminUser,
    action: 'REPLAY_WEBHOOK',
    resourceType: 'WebhookLog',
    resourceId: log._id,
    reason: `Replayed webhook event for txRef: ${log.txRef}`,
    metadata: { txRef: log.txRef },
  });

  return { success: true, message: 'Webhook event replayed and transaction verified.' };
}

export async function listBillingAuditLogs(query = {}) {
  const { page = 1, limit = 20 } = query;
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));

  const filter = {
    $or: [
      { action: { $regex: '^BILLING_', $options: 'i' } },
      { resourceType: { $in: ['Subscription', 'Payment', 'Plan', 'WebhookLog'] } },
    ],
  };

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parsedLimit),
  };
}
