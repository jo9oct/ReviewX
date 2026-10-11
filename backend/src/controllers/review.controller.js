// STATUS: UPDATED

import {
  createReviewResponse,
  getReviewResponse,
} from '../services/review.service.js';

import {
  findMany,
} from '../database/repositories/review.repository.js';

import {
  createResponse,
} from '../utils/response.js';

import { Review } from '../database/models/review.model.js';

const createReview = async (
  req,
  res,
  next,
) => {
  try {
    const result =
      await createReviewResponse(
        req.body,
        req.user.id,
        {
          workspace:    req.workspace,
          subscription: req.subscription,
          usage:        req.usage,
        },
      );

    return res.status(202).json(
      createResponse({
        success: true,

        data: result,

        meta: {
          requestId:
            req.requestId,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

const getReviewMetrics = async (
  req,
  res,
  next,
) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const filter = {
      $or: [
        { user: userId },
        { ownerId: String(userId) },
      ],
    };
    if (req.user?.company) {
      filter.$or.push({ company: req.user.company });
    }

    const [reviews, totalReviews] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).limit(10).lean(),
      Review.countDocuments(filter),
    ]);

    let totalFindings = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let scoreSum = 0;

    for (const r of reviews) {
      if (r.summary) {
        totalFindings += r.summary.totalFindings || 0;
        criticalCount += r.summary.critical || 0;
        highCount += r.summary.high || 0;
        mediumCount += r.summary.medium || 0;
        lowCount += r.summary.low || 0;
      }
      if (typeof r.score === 'number') {
        scoreSum += r.score;
      }
    }

    const averageScore = reviews.length > 0 ? Math.round(scoreSum / reviews.length) : 85;

    const formattedRecentReviews = reviews.map((r) => ({
      id: String(r._id),
      reviewId: String(r.reviewId || r._id),
      name: r.fileName || 'Review',
      lang: r.language || 'typescript',
      langBadge: (r.language || 'ts').slice(0, 2).toUpperCase(),
      score: r.score ?? 85,
      date: new Date(r.createdAt).toLocaleDateString(),
      relativeDate: 'recent',
      status: r.status || 'completed',
      findings: r.summary?.totalFindings || 0,
      severityCounts: {
        critical: r.summary?.critical || 0,
        high: r.summary?.high || 0,
        medium: r.summary?.medium || 0,
        low: r.summary?.low || 0,
      },
      createdAt: r.createdAt,
    }));

    const metricsData = {
      totalReviews,
      totalFindings,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      resolvedPercentage: 100,
      averageScore,
      categoryHealth: {
        security: 90,
        bugs: 85,
        quality: 88,
        performance: 92,
      },
      scoreTrend: [
        { label: 'May', score: 80 },
        { label: 'Jun', score: 82 },
        { label: 'Jul', score: 85 },
        { label: 'Aug', score: averageScore },
      ],
      recentReviews: formattedRecentReviews,
      openFindings: [],
    };

    return res.status(200).json(
      createResponse({
        success: true,
        data: metricsData,
        meta: {
          requestId: req.requestId,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

const getReview = async (
  req,
  res,
  next,
) => {
  try {
    if (req.params.reviewId === 'metrics') {
      return getReviewMetrics(req, res, next);
    }

    const result =
      await getReviewResponse(
        req.params.reviewId,
        req.user.id,
        {
          ...req.user,
          activeCompanyId: req.activeCompanyId,
        },
      );

    return res.status(200).json(
      createResponse({
        success: true,
        data: result,
        meta: {
          requestId: req.requestId,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

const getAllReviews = async (
  req,
  res,
  next,
) => {
  try {
    const limit = Number(
      req.query.limit || 50,
    );

    const skip = Number(
      req.query.skip || 0,
    );

    const isCompanyWorkspace = req.workspace?.type === 'company' && req.workspace?.companyId;
    const filter = isCompanyWorkspace
      ? { company: req.workspace.companyId }
      : { ownerId: req.user.id };

    const reviews =
      await findMany(
        filter,
        {
          limit,
          skip,
        },
      );

    return res.status(200).json(
      createResponse({
        success: true,

        data: {
          reviews,
        },

        meta: {
          requestId:
            req.requestId,

          count:
            reviews.length,

          limit,

          skip,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

export {
  createReview,
  getReview,
  getAllReviews,
  getReviewMetrics,
};