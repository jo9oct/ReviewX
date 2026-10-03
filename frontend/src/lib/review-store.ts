import { create } from "zustand";
import { STORAGE_KEYS } from "./constants";
import type { ReviewResult } from "./api";

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
  | "payments";

export type Role = "member" | "company" | "platform";

interface ReviewState {
  view: View;
  role: Role;
  analyzing: boolean;
  progress: number;
  step: number;
  theme: "dark" | "light";
  selectedFinding: string | null;
  /** Persisted status per finding id, survives view navigation. */
  findingStatuses: Record<string, string>;
  severity: string;
  /** Display name for the authenticated user shown in sidebar / profile. */
  userName: string;
  /** Email for the authenticated user shown in sidebar / profile. */
  userEmail: string;
  /** Active backend review result, if available. */
  activeReview: ReviewResult | null;
  activeReviewId: string | null;
  activeReviewStatus: string | null;
  setActiveReview: (review: ReviewResult | null) => void;
  setActiveReviewId: (id: string | null) => void;
  setActiveReviewStatus: (status: string | null) => void;
  setView: (view: View) => void;
  setRole: (role: Role) => void;
  setAnalyzing: (value: boolean) => void;
  setProgress: (updater: number | ((prev: number) => number)) => void;
  setStep: (step: number) => void;
  setTheme: (theme: "dark" | "light") => void;
  setSelectedFinding: (id: string) => void;
  setFindingStatus: (id: string, status: string) => void;
  setSeverity: (severity: string) => void;
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

function readActiveReviewId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEYS.ACTIVE_REVIEW_ID) || null;
}

function readActiveReviewStatus(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEYS.ACTIVE_REVIEW_STATUS) || null;
}

const initialReviewId = readActiveReviewId();
const initialStatus = readActiveReviewStatus();
const isInitialAnalyzing = Boolean(initialReviewId && initialStatus && !["completed", "failed"].includes(initialStatus));

export const useReviewStore = create<ReviewState>((set) => ({
  view: isInitialAnalyzing ? "new" : "dashboard",
  role: "member",
  analyzing: isInitialAnalyzing,
  progress: 0,
  step: 0,
  theme: readTheme(),
  selectedFinding: null,
  findingStatuses: {},
  severity: "All",
  userName: "ReviewX member",
  userEmail: "",
  activeReview: null,
  activeReviewId: initialReviewId,
  activeReviewStatus: initialStatus,

  setActiveReview: (activeReview) => {
    if (typeof window !== "undefined") {
      if (activeReview?.status === "completed" || activeReview?.status === "failed") {
        sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_REVIEW_ID);
        sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_REVIEW_STATUS);
      }
    }
    set({
      activeReview,
      activeReviewId: activeReview ? activeReview.reviewId : null,
      activeReviewStatus: activeReview ? activeReview.status : null,
      selectedFinding: activeReview?.findings?.[0]?._id || activeReview?.findings?.[0]?.id || null,
    });
  },

  setActiveReviewId: (activeReviewId) => {
    if (typeof window !== "undefined") {
      if (activeReviewId) {
        sessionStorage.setItem(STORAGE_KEYS.ACTIVE_REVIEW_ID, activeReviewId);
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_REVIEW_ID);
      }
    }
    set({ activeReviewId });
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

  setView: (view) => set({ view }),
  setRole: (role) => set({ role, view: role === "platform" ? "admin" : "dashboard" }),
  setAnalyzing: (analyzing) => set({ analyzing }),

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
      findingStatuses: {},
      activeReview: null,
      activeReviewId: null,
      activeReviewStatus: null,
    });
  },
}));
