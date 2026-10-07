import { create } from "zustand";
import type { ProjectRecord, ReviewDetails, ReviewReport, ScheduledReview, SubscriptionTier } from "./review-api";
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
  selectedFinding: string;
  /** Persisted status per finding id, survives view navigation. */
  findingStatuses: Record<string, string>;
  severity: string;
  subscriptionTier: SubscriptionTier;
  projects: ProjectRecord[];
  activeReviewId: string | null;
  activeReview: ReviewDetails | null;
  reviews: ReviewDetails[];
  activeReport: ReviewReport | null;
  reportList: ReviewReport[];
  scheduledReviews: ScheduledReview[];
  githubRepository: { owner: string; name: string; ref?: string } | null;
  apiResponses: Record<string, { request?: unknown; response?: unknown; error?: string; errorResponse?: unknown; receivedAt: string }>;
  /** Display name for the authenticated user shown in sidebar / profile. */
  userName: string;
  /** Email for the authenticated user shown in sidebar / profile. */
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
  setActiveReview: (review: ReviewDetails | null) => void;
  setReviews: (updater: ReviewDetails[] | ((prev: ReviewDetails[]) => ReviewDetails[])) => void;
  setActiveReport: (report: ReviewReport | null) => void;
  setReportList: (updater: ReviewReport[] | ((prev: ReviewReport[]) => ReviewReport[])) => void;
  setScheduledReviews: (updater: ScheduledReview[] | ((prev: ScheduledReview[]) => ScheduledReview[])) => void;
  setGithubRepository: (repository: { owner: string; name: string; ref?: string } | null) => void;
  setApiResponse: (
    key: string,
    value: { request?: unknown; response?: unknown; error?: string; errorResponse?: unknown },
  ) => void;
  setUserName: (name: string) => void;
  setUserEmail: (email: string) => void;
  /** Resets transient UI state (view, analysis, severity) without touching user identity. */
  resetSession: () => void;
}

function readTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEYS.THEME);
  return stored === "light" ? "light" : "dark";
}

function readSubscriptionTier(): SubscriptionTier {
  if (typeof window === "undefined") return "free";
  const stored = window.localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_TIER);
  return stored === "pro" || stored === "enterprise" ? stored : "free";
}

export const useReviewStore = create<ReviewState>((set) => ({
  view: "dashboard",
  role: "member",
  analyzing: false,
  progress: 0,
  step: 0,
  theme: readTheme(),
  selectedFinding: "",
  findingStatuses: {},
  severity: "All",
  subscriptionTier: readSubscriptionTier(),
  projects: [],
  activeReviewId: null,
  activeReview: null,
  reviews: [],
  activeReport: null,
  reportList: [],
  scheduledReviews: [],
  githubRepository: null,
  apiResponses: {},
  userName: "ReviewX member",
  userEmail: "",

  setView: (view) => set({ view }),
  setRole: (role) => set({ role, view: role === "platform" ? "admin" : "dashboard" }),
  setAnalyzing: (analyzing) => set({ analyzing }),

  // Accepts both a plain value and a functional updater so callers can use
  // `setProgress(p => Math.min(p + 4, 100))` to avoid stale-closure bugs.
  setProgress: (updater) =>
    set((state) => ({
      progress: typeof updater === "function" ? updater(state.progress) : updater,
    })),

  setStep: (step) => set({ step }),

  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    }
    set({ theme });
  },

  setSelectedFinding: (selectedFinding) => set({ selectedFinding, view: "finding" }),

  setFindingStatus: (id, status) =>
    set((state) => ({
      findingStatuses: { ...state.findingStatuses, [id]: status },
    })),

  setSeverity: (severity) => set({ severity }),
  setSubscriptionTier: (subscriptionTier) => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_TIER, subscriptionTier);
    set({ subscriptionTier });
  },
  setProjects: (projects) => set({ projects }),
  setActiveReviewId: (activeReviewId) => set({ activeReviewId }),
  setActiveReview: (activeReview) => set({ activeReview }),
  setReviews: (updater) =>
    set((state) => ({
      reviews: typeof updater === "function" ? updater(state.reviews) : updater,
    })),
  setActiveReport: (activeReport) => set({ activeReport }),
  setReportList: (updater) =>
    set((state) => ({
      reportList: typeof updater === "function" ? updater(state.reportList) : updater,
    })),
  setScheduledReviews: (updater) =>
    set((state) => ({
      scheduledReviews: typeof updater === "function" ? updater(state.scheduledReviews) : updater,
    })),
  setGithubRepository: (githubRepository) => set({ githubRepository }),
  setApiResponse: (key, value) =>
    set((state) => ({
      apiResponses: {
        ...state.apiResponses,
        [key]: { ...value, receivedAt: new Date().toISOString() },
      },
    })),
  setUserName: (userName) => set({ userName }),
  setUserEmail: (userEmail) => set({ userEmail }),

  resetSession: () =>
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
      activeReport: null,
      reportList: [],
      scheduledReviews: [],
      githubRepository: null,
      apiResponses: {},
    }),
}));
