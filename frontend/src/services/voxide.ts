// STATUS: UPDATED

import { VoxideClient } from "@voxide/react";
import {
  getReview,
  listAllReviews,
  listProjects,
  listScheduledReviews,
  type ReviewDetails,
  type ReviewIndexRecord,
} from "../lib/review-api";

const publicKey = import.meta.env["VITE_VOXIDE_PUBLIC_KEY"];

if (!publicKey) {
  throw new Error("VITE_VOXIDE_PUBLIC_KEY is not configured.");
}

export const voxide = new VoxideClient({
  publicKey,
});

voxide.register({
  getMyProjects: {
    description:
      "Get the projects that belong to the currently authenticated user.",

    params: {},

    handler: async () => {
      const projects = await listProjects(50, 0);

      return {
        success: true,
        projects,
      };
    },
  },

  getMySchedules: {
    description:
      "Get the scheduled code reviews that belong to the currently authenticated user.",

    params: {},

    handler: async () => {
      const schedules = await listScheduledReviews();

      return {
        success: true,
        schedules,
      };
    },
  },

  getMyLatestReview: {
    description:
      "Get the authenticated user's most recent code review.",

    params: {},

    handler: async () => {
      const result = await listAllReviews(100, 0);
      const reviews = result.reviews ?? [];

      if (reviews.length === 0) {
        return {
          success: true,
          review: null,
          message: "No reviews were found.",
        };
      }

      const sortedReviews = [...reviews].sort((a, b) => {
        const aDate = new Date(a.createdAt ?? 0).getTime();
        const bDate = new Date(b.createdAt ?? 0).getTime();

        return bDate - aDate;
      });

      const latest = sortedReviews[0];

      if (!latest) {
        return {
          success: true,
          review: null,
          message: "No reviews were found.",
        };
      }

      const reviewId = String(
        latest.reviewId ?? latest.id ?? latest._id ?? "",
      );

      if (!reviewId) {
        throw new Error(
          "The latest review does not contain a valid review ID.",
        );
      }

      const details = await getReview(reviewId);

      return {
        success: true,
        review: details,
      };
    },
  },

  getCriticalFindings: {
    description:
      "Get critical security findings from the authenticated user's code reviews.",

    params: {},

    handler: async () => {
      const result = await listAllReviews(100, 0);
      const reviews = result.reviews ?? [];

      const reviewDetails = await Promise.all(
        reviews.map(async (review: ReviewIndexRecord) => {
          const reviewId = String(
            review.reviewId ?? review.id ?? review._id ?? "",
          );

          if (!reviewId) {
            return null;
          }

          try {
            return await getReview(reviewId);
          } catch {
            return null;
          }
        }),
      );

      const criticalFindings = reviewDetails
        .filter(
          (review): review is ReviewDetails =>
            review !== null && Array.isArray(review.findings),
        )
        .flatMap((review) =>
          review.findings.filter(
            (finding) =>
              String(finding.severity ?? "").toLowerCase() === "critical",
          ),
        );

      return {
        success: true,
        severity: "critical",
        total: criticalFindings.length,
        findings: criticalFindings,
      };
    },
  },

  explainFinding: {
    description:
      "Find a security finding belonging to the authenticated user and return its description and remediation information.",

    params: {
      findingId: {
        type: "string",
        description:
          "The unique identifier of the security finding to explain.",
        required: true,
      },
    },

    handler: async (args: Record<string, any>) => {
      const findingId = String(args["findingId"] ?? "").trim();

      if (!findingId) {
        throw new Error("findingId is required.");
      }

      const result = await listAllReviews(100, 0);
      const reviews = result.reviews ?? [];

      for (const review of reviews) {
        const reviewId = String(
          review.reviewId ?? review.id ?? review._id ?? "",
        );

        if (!reviewId) {
          continue;
        }

        let details: ReviewDetails;

        try {
          details = await getReview(reviewId);
        } catch {
          continue;
        }

        const finding = details.findings.find(
          (item) => String(item._id ?? item.id ?? "") === findingId,
        );

        if (finding) {
          return {
            success: true,
            finding: {
              ...finding,
              reviewId,
            },
          };
        }
      }

      throw new Error(`Security finding "${findingId}" was not found.`);
    },
  },

  startReview: {
    description:
      "Start a new code review. This changes application state and requires explicit user confirmation.",

    params: {
      projectId: {
        type: "string",
        description: "The unique identifier of the project to review.",
        required: true,
      },
    },

    dangerous: true,

    handler: async (args: Record<string, any>) => {
      const projectId = String(args["projectId"] ?? "").trim();

      if (!projectId) {
        throw new Error("projectId is required.");
      }

      throw new Error(
        "Starting a review from Voxide is not connected yet because the existing createReview API requires the review source and project name.",
      );
    },
  },

  deleteProject: {
    description:
      "Delete a project belonging to the authenticated user. This is a destructive action and requires explicit user confirmation.",

    params: {
      projectId: {
        type: "string",
        description: "The unique identifier of the project to delete.",
        required: true,
      },
    },

    dangerous: true,

    handler: async (args: Record<string, any>) => {
      const projectId = String(args["projectId"] ?? "").trim();

      if (!projectId) {
        throw new Error("projectId is required.");
      }

      throw new Error(
        "Project deletion is not connected because the existing frontend API does not currently expose a deleteProject function.",
      );
    },
  },
});