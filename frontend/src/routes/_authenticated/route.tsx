import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { getAuthToken } from "@/lib/api";
import { useAuthStore, normalizeRole } from "@/lib/auth-store";

function AuthLoadingScreen() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
      <LoaderCircle className="size-8 animate-spin text-primary" />
      <p className="mt-3 text-xs text-muted-foreground">Authenticating session…</p>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // 1. Must have an auth token in storage
    const token = getAuthToken();
    if (!token) {
      throw redirect({
        to: "/auth",
        search: { next: location.href },
      });
    }

    // 2. Ensure user is loaded in Zustand auth store
    let user = useAuthStore.getState().user;
    if (!user) {
      try {
        user = await useAuthStore.getState().initialize();
      } catch (err) {
        if (isRedirect(err)) throw err;
        throw redirect({
          to: "/auth",
          search: { next: location.href },
        });
      }
    }

    if (!user) {
      throw redirect({
        to: "/auth",
        search: { next: location.href },
      });
    }

    return {
      user,
      role: normalizeRole(user.role),
    };
  },
  pendingComponent: AuthLoadingScreen,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { status, user } = useAuthStore();

  if (status === "loading" || (!user && status !== "unauthenticated")) {
    return <AuthLoadingScreen />;
  }

  return <Outlet />;
}
