import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthForm } from "@/components/auth/auth-form";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — ReviewX" },
      { name: "description", content: "Sign in to your ReviewX code review workspace." },
      { property: "og:title", content: "Sign in — ReviewX" },
      { property: "og:description", content: "Continue to your secure code review workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthRoutePage,
});

function AuthRoutePage() {
  return <AuthForm mode="login" next={Route.useSearch().next} />;
}
