import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordForm } from "@/components/auth/password-forms";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose new password — ReviewX" },
      { name: "description", content: "Set a new password for your ReviewX account." },
      { property: "og:title", content: "Choose new password — ReviewX" },
      { property: "og:description", content: "Secure your ReviewX account with a new password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordForm,
});
