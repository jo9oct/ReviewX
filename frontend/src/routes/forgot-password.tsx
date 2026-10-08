import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordForm } from "@/components/auth/password-forms";
import { redirectIfAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  beforeLoad: async () => {
    await redirectIfAuthenticated();
  },
  head: () => ({
    meta: [
      { title: "Reset password — ReviewX" },
      { name: "description", content: "Request a secure ReviewX password reset link." },
      { property: "og:title", content: "Reset password — ReviewX" },
      { property: "og:description", content: "Recover access to your ReviewX workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordForm,
});
