import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ReviewPlatform } from "@/components/review-platform";
import { useAuthStore, normalizeRole } from "@/lib/auth-store";
import { useReviewStore } from "@/lib/review-store";

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
  const { setRole, setUserName, setUserEmail } = useReviewStore();

  useEffect(() => {
    if (authUser) {
      if (authUser.name) setUserName(authUser.name);
      if (authUser.email) setUserEmail(authUser.email);
      if (authUser.role) setRole(normalizeRole(authUser.role));
    }
  }, [authUser, setRole, setUserName, setUserEmail]);

  return <ReviewPlatform />;
}
