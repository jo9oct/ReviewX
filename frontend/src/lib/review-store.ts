import { create } from "zustand";
import type { ReviewResult } from "./api";
import type { ProjectRecord, ScheduledReview, SubscriptionTier } from "./review-api";
import { STORAGE_KEYS } from "./constants";

export type View =
  | "new"
  | "result"
  | "finding"
  | "dashboard"
  | "history"
  | "rules"
  | "company"
  | "billing"
  | "profile"
  | "admin"
  | "users"
  | "companies"
  | "payments"
  | "integrations"
  | "schedules";

export type Role = "member" | "company" | "platform";

interface ReviewState {
  view: View;
  role: Role;
  analyzing: boolean;
  progress: number;
  step: number;
  theme: "dark" | "light";
  selectedFinding: string | null;
  findingStatuses: Record<string, string>;
  severity: string;
  subscriptionTier: SubscriptionTier;
  projects: ProjectRecord[];
  activeReviewId: string | null;
  activeReview: ReviewResult | null;
  activeReviewStatus: string | null;
  scheduledReviews: ScheduledReview[];
  apiResponses: Record<string, { request?: unknown; response?: unknown; error?: string; errorResponse?: unknown; receivedAt: string }>;
  userName: string;
  userEmail: string;
  setView: (view: View) => void;
  setRole: (role: Role) => void;
  setAnalyzing: (value: boolean) => void;
  setProgress: (updater: number | ((prev: number) => number)) => void;
  setStep: (step: number) => void;
  setTheme: (theme: "dark" | "light") => void;
  setSelectedFinding: (id: string) => void;
  setFindingStatus: (id: string, status: string) => void;
  setSeverity: (severity: string) => void;
  setSubscriptionTier: (tier: SubscriptionTier) => void;
  setProjects: (projects: ProjectRecord[]) => void;
  setActiveReviewId: (reviewId: string | null) => void;
  setActiveReview: (review: ReviewResult | null) => void;
  setActiveReviewStatus: (status: string | null) => void;
  setScheduledReviews: (updater: ScheduledReview[] | ((prev: ScheduledReview[]) => ScheduledReview[])) => void;
  setApiResponse: (
    key: string,
    value: { request?: unknown; response?: unknown; error?: string; errorResponse?: unknown },
  ) => void;
  setUserName: (name: string) => void;
  setUserEmail: (email: string) => void;
  resetSession: () => void;
}

function readTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem(STORAGE_KEYS.THEME) === "light" ? "light" : "dark";
}

function readSubscriptionTier(): SubscriptionTier {
  if (typeof window === "undefined") return "free";
  const stored = window.localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_TIER);
  return stored === "pro" || stored === "enterprise" ? stored : "free";
}

function readActiveReviewSession() {
  if (typeof window === "undefined") return { reviewId: null, status: null };
  const reviewId = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_REVIEW_ID);
  const status = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_REVIEW_STATUS);
  if (!reviewId || status === "completed" || status === "failed") {
    sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_REVIEW_ID);
    sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_REVIEW_STATUS);
    return { reviewId: null, status: null };
  }
  return { reviewId, status };
}

const initialReviewSession = readActiveReviewSession();

export const useReviewStore = create<ReviewState>((set) => ({
  view: initialReviewSession.reviewId ? "new" : "dashboard",
  role: "member",
  analyzing: Boolean(initialReviewSession.reviewId),
  progress: 0,
  step: 0,
  theme: readTheme(),
  selectedFinding: null,
  findingStatuses: {},
  severity: "All",
  subscriptionTier: readSubscriptionTier(),
  projects: [],
  activeReviewId: initialReviewSession.reviewId,
  activeReview: null,
  activeReviewStatus: initialReviewSession.status,
  scheduledReviews: [],
  apiResponses: {},
  userName: "ReviewX member",
  userEmail: "",

  setView: (view) => set({ view }),
  setRole: (role) => set({ role, view: role === "platform" ? "admin" : "dashboard" }),
  setAnalyzing: (analyzing) => set({ analyzing }),
  setProgress: (updater) =>
    set((state) => ({
      progress: typeof updater === "function" ? updater(state.progress) : updater,
    })),
  setStep: (step) => set({ step }),
  setTheme: (theme) => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEYS.THEME, theme);
    set({ theme });
  },
  setSelectedFinding: (selectedFinding) => set({ selectedFinding, view: "finding" }),
  setFindingStatus: (id, status) =>
    set((state) => ({ findingStatuses: { ...state.findingStatuses, [id]: status } })),
  setSeverity: (severity) => set({ severity }),
  setSubscriptionTier: (subscriptionTier) => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_TIER, subscriptionTier);
    set({ subscriptionTier });
  },
  setProjects: (projects) => set({ projects }),
  setActiveReviewId: (activeReviewId) => {
    if (typeof window !== "undefined") {
      if (activeReviewId) sessionStorage.setItem(STORAGE_KEYS.ACTIVE_REVIEW_ID, activeReviewId);
      else sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_REVIEW_ID);
    }
    set({ activeReviewId });
  },
  setActiveReview: (activeReview) => {
    const status = activeReview?.status ?? null;
    if (typeof window !== "undefined" && (status === "completed" || status === "failed")) {
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_REVIEW_ID);
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_REVIEW_STATUS);
    }
    set({
      activeReview,
      activeReviewId: activeReview?.reviewId ?? null,
      activeReviewStatus: status,
      selectedFinding: activeReview?.findings[0]?._id ?? activeReview?.findings[0]?.id ?? null,
    });
  },
  setActiveReviewStatus: (activeReviewStatus) => {
    if (typeof window !== "undefined") {
      if (activeReviewStatus && !["completed", "failed"].includes(activeReviewStatus)) {
        sessionStorage.setItem(STORAGE_KEYS.ACTIVE_REVIEW_STATUS, activeReviewStatus);
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_REVIEW_STATUS);
      }
    }
    set({ activeReviewStatus });
  },
  setScheduledReviews: (updater) =>
    set((state) => ({
      scheduledReviews: typeof updater === "function" ? updater(state.scheduledReviews) : updater,
    })),
  setApiResponse: (key, value) =>
    set((state) => ({
      apiResponses: {
        ...state.apiResponses,
        [key]: { ...value, receivedAt: new Date().toISOString() },
      },
    })),
  setUserName: (userName) => set({ userName }),
  setUserEmail: (userEmail) => set({ userEmail }),
  resetSession: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_REVIEW_ID);
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_REVIEW_STATUS);
    }
    set({
      view: "dashboard",
      analyzing: false,
      progress: 0,
      step: 0,
      severity: "All",
      projects: [],
      findingStatuses: {},
      activeReviewId: null,
      activeReview: null,
      activeReviewStatus: null,
      scheduledReviews: [],
      apiResponses: {},
      selectedFinding: null,
    });
  },
}));
