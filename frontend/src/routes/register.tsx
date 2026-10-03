import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthForm } from "@/components/auth/auth-form";

export const Route = createFileRoute("/register")({
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Create account — ReviewX" },
      { name: "description", content: "Create a ReviewX account and start reviewing code." },
      { property: "og:title", content: "Create account — ReviewX" },
      {
        property: "og:description",
        content: "Start finding security, bug, quality, and performance issues.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterRoutePage,
});

function RegisterRoutePage() {
  return <AuthForm mode="register" next={Route.useSearch().next} />;
}
