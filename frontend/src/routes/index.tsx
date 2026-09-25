import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing-page";

export const Route = createFileRoute("/")({
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
  component: LandingPage,
});
