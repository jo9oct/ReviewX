import { redirect, isRedirect } from "@tanstack/react-router";
import { getAuthToken } from "./api";
import { useAuthStore } from "./auth-store";

export function safeNext(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  // Prevent redirecting back to auth/register routes when already authenticated
  if (
    value === "/auth" ||
    value.startsWith("/auth?") ||
    value === "/register" ||
    value.startsWith("/register?") ||
    value === "/login" ||
    value.startsWith("/login?")
  ) {
    return fallback;
  }

  return value;
}

export async function redirectIfAuthenticated(next?: string | null) {
  if (typeof window === "undefined") return;

  const token = getAuthToken();
  if (!token) return;

  let user = useAuthStore.getState().user;
  if (!user) {
    try {
      user = await useAuthStore.getState().initialize();
    } catch (err) {
      if (isRedirect(err)) throw err;
      return;
    }
  }

  if (user) {
    const destination = safeNext(next, "/dashboard");
    throw redirect({
      to: destination as any,
    });
  }
}
