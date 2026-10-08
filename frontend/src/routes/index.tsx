import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LandingPage } from "@/components/landing-page";
import { redirectIfAuthenticated } from "@/lib/auth";
import { getAuthToken } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    await redirectIfAuthenticated();
  },
  head: () => ({
    meta: [
      { title: "ReviewX — Automated Code Review" },
      {
        name: "description",
        content:
          "Review source code for security, bugs, quality, and performance with actionable fixes.",
      },
      { property: "og:title", content: "ReviewX — Automated Code Review" },
      {
        property: "og:description",
        content: "Ship safer code with automated, explainable reviews.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndexRoutePage,
});

function IndexRoutePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const token = getAuthToken();
    if (token || user) {
      void (async () => {
        let activeUser = user;
        if (!activeUser && token) {
          try {
            activeUser = await useAuthStore.getState().initialize();
          } catch {
            return;
          }
        }
        if (activeUser) {
          void navigate({ to: "/dashboard" });
        }
      })();
    }
  }, [navigate, user]);

  return <LandingPage />;
}
