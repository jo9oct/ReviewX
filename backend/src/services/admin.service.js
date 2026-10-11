import mongoose from "mongoose";
import { User } from "../database/models/user.model.js";
import { Review } from "../database/models/review.model.js";
import { Finding } from "../database/models/finding.model.js";
import { CompanyRule } from "../database/models/companyRule.model.js";
import { Company } from "../database/models/company.model.js";
import { AuditLog } from "../database/models/auditLog.model.js";
import { ApiError } from "../utils/ApiError.js";
import { config } from "../config/env.js";
import environment from "../config/environment.js";
import { getReviewQueue, getReportQueue, getCleanupQueue } from "../queue/queue.factory.js";
import { reviewRepository } from "../database/repositories/review.repository.js";

export async function getPlatformStats() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersThisMonth,
    totalReviews,
    completedReviews,
    failedReviews,
    totalFindings,
    criticalFindings,
    highFindings,
    recentReviews,
    recentUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Review.countDocuments(),
    Review.countDocuments({ status: "completed" }),
    Review.countDocuments({ status: "failed" }),
    Finding.countDocuments(),
    Finding.countDocuments({ severity: "critical" }),
    Finding.countDocuments({ severity: "high" }),
    Review.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select("reviewId fileName status score createdAt")
      .lean(),
    User.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select("name email role createdAt")
      .lean(),
  ]);

  const completionRate =
    totalReviews > 0
      ? Math.round((completedReviews / totalReviews) * 100)
      : 100;

  // Build real live event feed
  const events = [];

  for (const r of recentReviews) {
    const reviewIdStr = r.reviewId ? String(r.reviewId) : r._id ? String(r._id) : "";
    const label = r.fileName || (reviewIdStr ? `REV-${reviewIdStr.slice(-6).toUpperCase()}` : "REV-RECENT");
    const scoreStr = typeof r.score === "number" ? ` · score ${r.score}` : "";
    events.push({
      id: `rev-${r._id}`,
      text: `Review ${label} ${r.status}${scoreStr}`,
      time: r.createdAt,
      icon: "rev",
    });
  }

  for (const u of recentUsers) {
    events.push({
      id: `usr-${u._id}`,
      text: `New user registered: ${u.name} (${u.email})`,
      time: u.createdAt,
      icon: "usr",
    });
  }

  events.sort((a, b) => new Date(b.time) - new Date(a.time));

  // 6-month review activity trend
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const sixMonths = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    sixMonths.push({
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      month: monthNames[d.getMonth()],
      count: 0,
      completed: 0,
    });
  }

  const startPeriod = new Date(sixMonths[0].year, sixMonths[0].monthIndex, 1);

  const monthlyReviewStats = await Review.aggregate([
    { $match: { createdAt: { $gte: startPeriod } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
  ]);

  for (const stat of monthlyReviewStats) {
    const target = sixMonths.find(
      (m) => m.year === stat._id.year && m.monthIndex === stat._id.month - 1
    );
    if (target) {
      target.count = stat.count;
      target.completed = stat.completed;
    }
  }

  const activityTrend = sixMonths.map(({ month, count, completed }) => ({
    month,
    count,
    completed,
  }));

  // Real enterprise tenants aggregation from users
  const tenantGroups = await User.aggregate([
    { $match: { company: { $ne: null } } },
    {
      $group: {
        _id: "$company",
        members: { $sum: 1 },
        companyAdmins: {
          $sum: { $cond: [{ $eq: ["$role", "company_admin"] }, 1, 0] },
        },
      },
    },
  ]);

  const topTenants = [];
  for (const tg of tenantGroups) {
    const companyId = tg._id;
    if (!companyId) continue;
    const isValidId = mongoose.isValidObjectId(companyId);
    const companyDoc = isValidId ? await Company.findById(companyId).lean() : null;
    const rulesCount = isValidId ? await CompanyRule.countDocuments({ company: companyId }) : 0;
    const idStr = companyId.toString();
    topTenants.push({
      id: idStr,
      name: companyDoc?.name || `Workspace ${idStr.slice(-6).toUpperCase()}`,
      plan: tg.companyAdmins > 0 ? "Enterprise" : "Team",
      members: tg.members,
      rules: rulesCount,
      reviews: 0,
      health: 100,
    });
  }

  return {
    kpis: {
      totalUsers,
      newUsersThisMonth,
      totalReviews,
      completedReviews,
      failedReviews,
      completionRate,
      totalFindings,
      criticalFindings,
      highFindings,
      activeEnvironment: config.nodeEnv,
      uptimeSeconds: Math.floor(process.uptime()),
    },
    activityTrend,
    topTenants,
    systemEvents: events.slice(0, 10),
  };
}

export async function listCompanies() {
  // Companies with no members (just created, everyone left) should still show.
  const companies = await Company.find().sort({ createdAt: 1 }).lean();

  const tenantGroups = await User.aggregate([
    { $match: { company: { $ne: null } } },
    {
      $group: {
        _id: "$company",
        members: { $sum: 1 },
        companyAdmins: {
          $sum: { $cond: [{ $eq: ["$role", "company_admin"] }, 1, 0] },
        },
      },
    },
  ]);
  const groupsById = new Map(
    tenantGroups
      .filter((g) => g._id)
      .map((g) => [g._id.toString(), g])
  );

  const knownIds = new Set(companies.map((c) => c._id.toString()));
  const rulesCounts = await CompanyRule.aggregate([
    { $match: { company: { $ne: null } } },
    { $group: { _id: "$company", count: { $sum: 1 } } },
  ]);
  const rulesById = new Map(
    rulesCounts
      .filter((r) => r._id)
      .map((r) => [r._id.toString(), r.count])
  );

  const rows = companies.map((c) => {
    const id = c._id.toString();
    const tg = groupsById.get(id);
    return {
      id,
      name: c.name,
      plan: (tg?.companyAdmins ?? 0) > 0 ? "Enterprise" : "Team",
      members: tg?.members ?? 0,
      rulesCount: rulesById.get(id) ?? 0,
      reviewsCount: 0,
    };
  });

  // Legacy tenants: users carrying a company ObjectId with no Company document
  // (created before the Company model existed). Surface them rather than hide data.
  for (const tg of tenantGroups) {
    if (!tg._id) continue;
    const id = tg._id.toString();
    if (knownIds.has(id)) continue;
    rows.push({
      id,
      name: `Workspace ${id.slice(-6).toUpperCase()}`,
      plan: tg.companyAdmins > 0 ? "Enterprise" : "Team",
      members: tg.members,
      rulesCount: rulesById.get(id) ?? 0,
      reviewsCount: 0,
    });
  }

  return { companies: rows, total: rows.length };
}

export async function listUsers(query = {}) {
  const filter = {};

  if (query.role && query.role !== "all") {
    filter.role = query.role;
  }

  if (query.search && typeof query.search === "string" && query.search.trim()) {
    const s = query.search.trim();
    filter.$or = [
      { name: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
    ];
  }

  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
  const page = Math.max(Number(query.page) || 1, 1);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const sanitized = users.map((u) => ({
    id: u._id.toString(),
    _id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    company: u.company || null,
    isActive: u.isActive !== false,
    lastLoginAt: u.lastLoginAt || null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  return {
    users: sanitized,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function updateUserRole(userId, newRole) {
  const VALID_ROLES = ["member", "company_admin", "platform_admin"];
  if (!VALID_ROLES.includes(newRole)) {
    throw ApiError.badRequest(`Role must be one of: ${VALID_ROLES.join(", ")}`);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { role: newRole } },
    { new: true }
  ).select("-passwordHash");

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company || null,
    isActive: user.isActive,
    updatedAt: user.updatedAt,
  };
}

export async function toggleUserStatus(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  user.isActive = !user.isActive;
  await user.save();

  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company || null,
    isActive: user.isActive,
    updatedAt: user.updatedAt,
  };
}

// ── Queue monitoring ──────────────────────────────────────────────────────────

const QUEUE_TIMEOUT_MS = 5000;

const withTimeout = (promise, ms, fallback) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

export async function getQueuesSummary() {
  const tryGetCounts = async (queueFn, name) => {
    const fallback = { name, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, healthy: false, error: 'unreachable' };
    try {
      const q = queueFn();
      const counts = await withTimeout(
        q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
        QUEUE_TIMEOUT_MS,
        null,
      );
      if (!counts) return fallback;
      return { name, ...counts, healthy: (counts.failed || 0) === 0 };
    } catch {
      return fallback;
    }
  };

  const [review, report, cleanup] = await Promise.all([
    tryGetCounts(getReviewQueue, 'review'),
    tryGetCounts(getReportQueue, 'report'),
    tryGetCounts(getCleanupQueue, 'cleanup'),
  ]);

  return {
    queues: { review, report, cleanup },
    totalFailed: (review.failed || 0) + (report.failed || 0) + (cleanup.failed || 0),
    totalWaiting: (review.waiting || 0) + (report.waiting || 0) + (cleanup.waiting || 0),
  };
}

export async function getQueuesDetail() {
  const tryGetDetail = async (queueFn, name) => {
    const fallback = { name, counts: {}, failedJobs: [], error: 'unreachable' };
    try {
      const q = queueFn();
      const result = await withTimeout(
        Promise.all([
          q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
          q.getFailed(0, 19),
        ]),
        QUEUE_TIMEOUT_MS,
        null,
      );
      if (!result) return fallback;
      const [counts, failedJobs] = result;
      const failed = failedJobs.map((j) => ({
        id: j.id,
        name: j.name,
        failedReason: j.failedReason || 'Unknown error',
        attemptsMade: j.attemptsMade,
        timestamp: j.timestamp ? new Date(j.timestamp).toISOString() : null,
        processedOn: j.processedOn ? new Date(j.processedOn).toISOString() : null,
        finishedOn: j.finishedOn ? new Date(j.finishedOn).toISOString() : null,
      }));
      return { name, counts, failedJobs: failed };
    } catch {
      return fallback;
    }
  };

  const [review, report, cleanup] = await Promise.all([
    tryGetDetail(getReviewQueue, 'review'),
    tryGetDetail(getReportQueue, 'report'),
    tryGetDetail(getCleanupQueue, 'cleanup'),
  ]);

  return { queues: { review, report, cleanup } };
}

export async function retryFailedJobs(queueName) {
  const queueMap = { review: getReviewQueue, report: getReportQueue, cleanup: getCleanupQueue };
  const queueFn = queueMap[queueName];
  if (!queueFn) {
    throw ApiError.badRequest(`Unknown queue: ${queueName}. Valid queues: review, report, cleanup`);
  }
  try {
    const q = queueFn();
    const failedJobs = await q.getFailed(0, 99);
    let retried = 0;
    for (const job of failedJobs) {
      await job.retry();
      retried++;
    }
    return { retried, queue: queueName };
  } catch (err) {
    throw ApiError.internal(`Failed to retry jobs: ${err.message}`);
  }
}

// ── All-platform reviews ──────────────────────────────────────────────────────

export async function listAllReviews(query = {}) {
  const {
    status,
    search,
    page = 1,
    limit = 20,
  } = query;

  const filter = {};
  if (status && status !== 'all') filter.status = status;

  // search by userId string match (if it looks like ObjectId) or skip
  if (search && search.trim()) {
    const q = search.trim();
    if (mongoose.Types.ObjectId.isValid(q)) {
      filter.$or = [{ _id: q }, { userId: q }];
    }
  }

  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const parsedPage = Math.max(Number(page) || 1, 1);
  const skip = (parsedPage - 1) * parsedLimit;

  const [docs, total] = await Promise.all([
    reviewRepository.findMany(filter, { limit: parsedLimit, skip }),
    reviewRepository.countAll(filter),
  ]);

  // Attach user email/name
  const enriched = await Promise.all(
    docs.map(async (rev) => {
      let userInfo = null;
      if (rev.userId || rev.ownerId) {
        const uid = rev.userId || rev.ownerId;
        try {
          const u = await User.findById(uid).select('name email').lean();
          if (u) userInfo = { name: u.name, email: u.email };
        } catch { /* skip */ }
      }
      return { ...rev, userInfo };
    }),
  );

  return {
    reviews: enriched,
    total,
    page: parsedPage,
    totalPages: Math.ceil(total / parsedLimit),
  };
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export async function listAllAuditLogs(query = {}) {
  const {
    action,
    resourceType,
    actorId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = query;

  const filter = {};
  if (action && action !== 'all') filter.action = { $regex: `^${action}`, $options: 'i' };
  if (resourceType && resourceType !== 'all') filter.resourceType = resourceType;
  if (status && status !== 'all') filter.status = status;
  if (actorId && mongoose.Types.ObjectId.isValid(actorId)) filter.actorId = actorId;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const parsedPage = Math.max(Number(page) || 1, 1);
  const skip = (parsedPage - 1) * parsedLimit;

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
    page: parsedPage,
    totalPages: Math.ceil(total / parsedLimit),
  };
}

// ── Platform settings ─────────────────────────────────────────────────────────

export function getPlatformSettings() {
  const { app, queue, ai, github, cloudinary } = environment;
  return {
    application: {
      name: app?.name || 'ReviewX',
      version: app?.version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
    },
    queues: {
      concurrency: queue?.concurrency ?? 3,
      attempts: queue?.attempts ?? 3,
      backoffMs: queue?.backoff ?? 5000,
      removeOnComplete: 100,
      removeOnFail: 100,
    },
    integrations: {
      ai: {
        enabled: Boolean(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY),
        provider: process.env.GROQ_API_KEY ? 'groq' : process.env.OPENAI_API_KEY ? 'openai' : 'none',
      },
      github: {
        enabled: Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY),
      },
      cloudinary: {
        enabled: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
      },
      email: {
        enabled: Boolean(process.env.RESEND_API_KEY),
        from: process.env.EMAIL_FROM || 'not configured',
      },
      chapa: {
        enabled: Boolean(process.env.CHAPA_SECRET_KEY),
      },
    },
    featureFlags: {
      aiAnalysisEnabled: Boolean(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY),
      githubIntegrationEnabled: Boolean(process.env.GITHUB_APP_ID),
      emailEnabled: Boolean(process.env.RESEND_API_KEY),
      pdfReportsEnabled: true,
      advancedAnalysisEnabled: true,
    },
  };
}

// ── Admin management ──────────────────────────────────────────────────────────

export async function listAdmins() {
  const admins = await User.find({ role: 'platform_admin' })
    .select('-passwordHash')
    .sort({ createdAt: 1 })
    .lean();

  return admins.map((u) => ({
    id: u._id.toString(),
    _id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive !== false,
    lastLoginAt: u.lastLoginAt || null,
    createdAt: u.createdAt,
  }));
}

export async function promoteToAdmin(targetUserId, reason, actorUser) {
  if (!reason || String(reason).trim().length < 5) {
    throw ApiError.badRequest('A reason of at least 5 characters is required');
  }

  const target = await User.findById(targetUserId).select('-passwordHash');
  if (!target) throw ApiError.notFound('User not found');

  if (target.role === 'platform_admin') {
    throw ApiError.conflict('User is already a platform_admin');
  }

  const previousRole = target.role;
  target.role = 'platform_admin';
  await target.save();

  await AuditLog.create({
    actorId: actorUser?._id || null,
    actorType: 'user',
    action: 'ADMIN_PROMOTE',
    resourceType: 'User',
    resourceId: target._id.toString(),
    status: 'success',
    metadata: {
      reason: reason.trim(),
      actorEmail: actorUser?.email || 'system',
      targetEmail: target.email,
      previousRole,
      newRole: 'platform_admin',
    },
  });

  return {
    id: target._id.toString(),
    name: target.name,
    email: target.email,
    role: target.role,
  };
}

export async function demoteAdmin(targetUserId, reason, actorUser) {
  if (!reason || String(reason).trim().length < 5) {
    throw ApiError.badRequest('A reason of at least 5 characters is required');
  }

  const actorId = actorUser?._id?.toString() || actorUser?.id || actorUser?.userId;
  if (String(targetUserId) === String(actorId)) {
    throw ApiError.badRequest('You cannot demote yourself');
  }

  const target = await User.findById(targetUserId).select('-passwordHash');
  if (!target) throw ApiError.notFound('User not found');

  if (target.role !== 'platform_admin') {
    throw ApiError.badRequest('User is not a platform_admin');
  }

  target.role = 'member';
  await target.save();

  await AuditLog.create({
    actorId: actorUser?._id || null,
    actorType: 'user',
    action: 'ADMIN_DEMOTE',
    resourceType: 'User',
    resourceId: target._id.toString(),
    status: 'success',
    metadata: {
      reason: reason.trim(),
      actorEmail: actorUser?.email || 'system',
      targetEmail: target.email,
      previousRole: 'platform_admin',
      newRole: 'member',
    },
  });

  return {
    id: target._id.toString(),
    name: target.name,
    email: target.email,
    role: target.role,
  };
}
