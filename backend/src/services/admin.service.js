import { User } from "../database/models/user.model.js";
import { Review } from "../database/models/review.model.js";
import { Finding } from "../database/models/finding.model.js";
import { ApiError } from "../utils/ApiError.js";
import { config } from "../config/env.js";

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
    const label = r.fileName || `REV-${(r.reviewId || "").slice(-6).toUpperCase()}`;
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
    systemEvents: events.slice(0, 10),
  };
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
