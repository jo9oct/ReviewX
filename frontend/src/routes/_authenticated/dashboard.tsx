import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ReviewPlatform } from "@/components/review-platform";
import { ensureProfile } from "@/lib/auth";
import { getActiveDemoAccount } from "@/lib/demo-accounts";
import { STORAGE_KEYS } from "@/lib/constants";
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
  const { setRole, setUserName, setUserEmail } = useReviewStore();

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const profileName = await ensureProfile(user);
        if (active && profileName) setUserName(profileName);
      } catch {
        // Frontend-only mock profile flow; no backend required.
      }

      if (!active) return;

      // Re-read from sessionStorage in case ensureProfile or a login flow
      // wrote the name there after the initial render.
      const storedName = window.sessionStorage.getItem(STORAGE_KEYS.PROFILE_NAME);
      if (storedName) setUserName(storedName);

      const account = getActiveDemoAccount();
      setRole(account.role);
      setUserEmail(account.email);
    })();

    return () => {
      active = false;
    };
  }, [user, setRole, setUserName, setUserEmail]);

  return <ReviewPlatform />;
}
