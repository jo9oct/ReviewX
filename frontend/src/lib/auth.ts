import { redirect, isRedirect } from "@tanstack/react-router";
import { getAuthToken } from "./api";
import { useAuthStore } from "./auth-store";

export function safeNext(value: unknown, fallback = "/dashboard") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}

export async function redirectIfAuthenticated(next?: string | null) {
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
