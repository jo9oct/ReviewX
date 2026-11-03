import { lazy, Suspense, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useAuthStore, normalizeRole } from "@/lib/auth-store";
import { useReviewStore } from "@/lib/review-store";

const ReviewPlatform = lazy(() =>
  import("@/components/review-platform").then((module) => ({
    default: module.ReviewPlatform,
  })),
);

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Workspace — ReviewX" },
      {
        name: "description",
        content: "Review code, investigate findings, and manage your ReviewX workspace.",
      },
      { property: "og:title", content: "Workspace — ReviewX" },
      { property: "og:description", content: "Your automated code review workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const { user } = Route.useRouteContext();
  const authUser = useAuthStore((s) => s.user) || user;
  const setRole = useReviewStore((s) => s.setRole);
  const setUserName = useReviewStore((s) => s.setUserName);
  const setUserEmail = useReviewStore((s) => s.setUserEmail);

  useEffect(() => {
    if (authUser) {
      if (authUser.name) setUserName(authUser.name);
      if (authUser.email) setUserEmail(authUser.email);
      if (authUser.role) setRole(normalizeRole(authUser.role));
    }
  }, [authUser, setRole, setUserName, setUserEmail]);

  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-background">
          <LoaderCircle className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <ReviewPlatform />
    </Suspense>
  );
}
