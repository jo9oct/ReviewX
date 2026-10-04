import mongoose from "mongoose";
import { User } from "../database/models/user.model.js";
import { Review } from "../database/models/review.model.js";
import { Finding } from "../database/models/finding.model.js";
import { Score } from "../database/models/score.model.js";
import { ApiError } from "../utils/ApiError.js";

export async function getCompanyMembers(user) {
  let filter = {};
  if (user?.company) {
    filter = { company: user.company };
  } else {
    const uid = user?._id || user?.id || user?.userId;
    if (!uid) return [];
    filter = { _id: uid };
  }

  const users = await User.find(filter)
    .select("name email role createdAt")
    .sort({ createdAt: 1 })
    .lean();

  const membersWithStats = await Promise.all(
    users.map(async (u) => {
      const userReviews = await Review.find({ user: u._id }, { _id: 1 }).lean();
      const reviewIds = userReviews.map((r) => r._id);
      const reviewsCount = reviewIds.length;

      let avgScore = 0;
      let openFindings = 0;

      if (reviewsCount > 0) {
        const scores = await Score.find({ reviewId: { $in: reviewIds } }, { overall: 1 }).lean();
        if (scores.length > 0) {
          const total = scores.reduce((sum, s) => sum + (s.overall || 0), 0);
          avgScore = Math.round(total / scores.length);
        }
        openFindings = await Finding.countDocuments({
          reviewId: { $in: reviewIds },
          status: { $ne: "resolved" }
        });
      }

      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role === "company_admin" ? "Company admin" : u.role === "platform_admin" ? "Platform admin" : "Member",
        rawRole: u.role,
        reviews: reviewsCount,
        avg: avgScore,
        open: openFindings,
        trend: avgScore >= 75 ? "up" : "neutral",
        createdAt: u.createdAt
      };
    })
  );

  return membersWithStats;
}

export async function inviteCompanyMember(currentUser, { name, email, role = "member" }) {
  if (!name || !email) {
    throw ApiError.badRequest("Name and email are required.");
  }

  let companyId = currentUser.company;
  if (!companyId) {
    companyId = new mongoose.Types.ObjectId();
    await User.findByIdAndUpdate(currentUser._id || currentUser.id, {
      company: companyId
    });
    currentUser.company = companyId.toString();
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    existing.company = companyId;
    if (role === "company_admin") existing.role = "company_admin";
    await existing.save();
    return {
      id: existing._id.toString(),
      name: existing.name,
      email: existing.email,
      role: existing.role === "company_admin" ? "Company admin" : "Member",
      rawRole: existing.role,
      reviews: 0,
      avg: 0,
      open: 0,
      trend: "neutral",
      createdAt: existing.createdAt
    };
  }

  const tempPassword = "TempPassword123!";
  const newUser = new User({
    name: name.trim(),
    email: cleanEmail,
    role: role === "company_admin" ? "company_admin" : "member",
    company: companyId,
    isActive: true
  });
  await newUser.setPassword(tempPassword);
  await newUser.save();

  return {
    id: newUser._id.toString(),
    name: newUser.name,
    email: newUser.email,
    role: newUser.role === "company_admin" ? "Company admin" : "Member",
    rawRole: newUser.role,
    reviews: 0,
    avg: 0,
    open: 0,
    trend: "neutral",
    createdAt: newUser.createdAt
  };
}
