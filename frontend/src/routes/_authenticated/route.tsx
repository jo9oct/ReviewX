import { createFileRoute, Outlet, redirect, isRedirect, useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { getAuthToken } from "@/lib/api";
import { useAuthStore, normalizeRole } from "@/lib/auth-store";

const VoxideAssistant = lazy(() => import("@/components/ai/VoxideAssistant"));

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
    // During server-side rendering (SSR), client-only session storage (localStorage)
    // is not accessible. Since ssr is false for this layout, return a placeholder
    // context and allow client-side hydration to perform the auth guard check.
    if (typeof window === "undefined") {
      return {
        user: null,
        role: "member" as const,
      };
    }

    const nextParam =
      location.pathname &&
      !location.pathname.startsWith("/auth") &&
      !location.pathname.startsWith("/register")
        ? location.pathname
        : "/dashboard";

    // 1. Must have an auth token in storage
    const token = getAuthToken();
    if (!token) {
      throw redirect({
        to: "/auth",
        search: { next: nextParam },
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
          search: { next: nextParam },
        });
      }
    }

    if (!user) {
      throw redirect({
        to: "/auth",
        search: { next: nextParam },
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
  const navigate = useNavigate();
  const { status, user, initialize } = useAuthStore();
  const role = normalizeRole(user?.role);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      void navigate({ to: "/auth", replace: true });
      return;
    }
    if (!user) {
      void initialize().then((activeUser) => {
        if (!activeUser) {
          void navigate({ to: "/auth", replace: true });
        }
      });
    }
  }, [user, navigate, initialize]);

  if (status === "loading" || (!user && status !== "unauthenticated")) {
    return <AuthLoadingScreen />;
  }

  return (
    <>
      <Outlet />
      {status === "authenticated" && role !== "platform" && (
        <Suspense fallback={null}>
          <VoxideAssistant />
        </Suspense>
      )}
    </>
  );
}
