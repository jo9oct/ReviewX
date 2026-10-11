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

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("reviewx_user") || sessionStorage.getItem("reviewx_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user: User | null): void {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem("reviewx_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("reviewx_user");
    sessionStorage.removeItem("reviewx_user");
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: typeof window !== "undefined" ? getStoredUser() : null,
  token: typeof window !== "undefined" ? getAuthToken() : null,
  status: typeof window !== "undefined" && getAuthToken() ? "authenticated" : "idle",

  setUser: (user) => {
    setStoredUser(user);
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
    setStoredUser(user);
    set({
      user,
      token,
      status: "authenticated",
    });
    syncReviewStore(user);
  },

  logout: () => {
    setAuthToken(null);
    setStoredUser(null);
    set({
      user: null,
      token: null,
      status: "unauthenticated",
    });
    syncReviewStore(null);
    if (typeof window !== "undefined") {
      sessionStorage.clear();
    }
  },

  initialize: async () => {
    const token = getAuthToken();
    if (!token) {
      setStoredUser(null);
      set({ user: null, token: null, status: "unauthenticated" });
      return null;
    }

    const storedUser = getStoredUser();
    if (storedUser) {
      set({ user: storedUser, token, status: "authenticated" });
      syncReviewStore(storedUser);
    }

    try {
      const user = await getCurrentUser();
      get().setAuth(user, token);
      return user;
    } catch {
      // If we had a stored user, don't evict on temporary network issues
      if (storedUser) {
        return storedUser;
      }
      setAuthToken(null);
      setStoredUser(null);
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
