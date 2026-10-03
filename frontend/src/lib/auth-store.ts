import { create } from "zustand";
import { getCurrentUser, setAuthToken, getAuthToken, setUnauthorizedHandler, type AuthUser } from "./api";
import { useReviewStore } from "./review-store";

export type Role = "member" | "company" | "platform" | "company_admin" | "platform_admin";

export type User = AuthUser;

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  user: User | null;
  token: string | null;
  status: AuthStatus;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setStatus: (status: AuthStatus) => void;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  initialize: () => Promise<User | null>;
}

export function normalizeRole(role?: string): "member" | "company" | "platform" {
  if (role === "company_admin" || role === "company") return "company";
  if (role === "platform_admin" || role === "platform") return "platform";
  return "member";
}

function syncReviewStore(user: User | null) {
  const reviewStore = useReviewStore.getState();
  reviewStore.resetSession();
  if (user) {
    reviewStore.setUserName(user.name);
    reviewStore.setUserEmail(user.email);
    reviewStore.setRole(normalizeRole(user.role));
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== "undefined" ? getAuthToken() : null,
  status: "idle",

  setUser: (user) => {
    set({ user });
    syncReviewStore(user);
  },

  setToken: (token) => {
    setAuthToken(token);
    set({ token });
  },

  setStatus: (status) => set({ status }),

  setAuth: (user, token) => {
    setAuthToken(token);
    set({
      user,
      token,
      status: "authenticated",
    });
    syncReviewStore(user);
  },

  logout: () => {
    setAuthToken(null);
    set({
      user: null,
      token: null,
      status: "unauthenticated",
    });
    syncReviewStore(null);
    if (typeof window !== "undefined") {
      sessionStorage.clear();
      window.location.href = "/auth";
    }
  },

  initialize: async () => {
    const token = getAuthToken();
    if (!token) {
      set({ user: null, token: null, status: "unauthenticated" });
      return null;
    }

    const current = get();
    if (current.status === "authenticated" && current.user) {
      return current.user;
    }

    set({ status: "loading", token });
    try {
      const user = await getCurrentUser();
      get().setAuth(user, token);
      return user;
    } catch {
      setAuthToken(null);
      set({ user: null, token: null, status: "unauthenticated" });
      syncReviewStore(null);
      return null;
    }
  },
}));

// Global 401 handler triggers logout and redirect
setUnauthorizedHandler(() => {
  useAuthStore.getState().logout();
});
