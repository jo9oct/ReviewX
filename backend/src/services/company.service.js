import { User } from "../database/models/user.model.js";
import { Review } from "../database/models/review.model.js";
import { Finding } from "../database/models/finding.model.js";
import { Score } from "../database/models/score.model.js";
import { notificationTriggerService } from "./notificationTrigger.service.js";

export async function getCompanyMembers(user) {
  let filter = {};
  let companyDoc = null;
  if (user?.company) {
    filter = { company: user.company };
    const { Company } = await import("../database/models/company.model.js");
    companyDoc = await Company.findById(user.company).select("owner").lean();
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

      const isOwner = companyDoc?.owner
        ? companyDoc.owner.toString() === u._id.toString()
        : false;
      const displayRole = isOwner
        ? "Owner"
        : u.role === "company_admin"
        ? "Admin"
        : u.role === "platform_admin"
        ? "Platform admin"
        : "Member";

      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: displayRole,
        isOwner,
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

export async function getCompanyProfile(user) {
  if (!user?.company) {
    return null;
  }
  const { Company } = await import("../database/models/company.model.js");
  const company = await Company.findById(user.company).populate("owner", "name email").lean();
  if (!company) {
    return null;
  }
  const membersCount = await User.countDocuments({ company: user.company });
  return {
    ...company,
    membersCount,
  };
}

export async function updateCompanyProfile(user, { name }) {
  if (!user?.company) {
    const { ApiError } = await import("../utils/ApiError.js");
    throw ApiError.notFound("User is not associated with a company");
  }
  const { Company } = await import("../database/models/company.model.js");
  const company = await Company.findById(user.company);
  if (!company) {
    const { ApiError } = await import("../utils/ApiError.js");
    throw ApiError.notFound("Company not found");
  }
  if (name?.trim()) {
    company.name = name.trim();
    await company.save();
  }
  return company.toObject();
}
