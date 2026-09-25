import { create } from "zustand";
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
  | "payments";

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

export const useReviewStore = create<ReviewState>((set) => ({
  view: "dashboard",
  role: "member",
  analyzing: false,
  progress: 0,
  step: 0,
  theme: readTheme(),
  selectedFinding: "FND-1042",
  findingStatuses: {},
  severity: "All",
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
  setUserName: (userName) => set({ userName }),
  setUserEmail: (userEmail) => set({ userEmail }),

  resetSession: () =>
    set({
      view: "dashboard",
      analyzing: false,
      progress: 0,
      step: 0,
      severity: "All",
      findingStatuses: {},
    }),
}));
