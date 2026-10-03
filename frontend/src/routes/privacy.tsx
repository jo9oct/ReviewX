import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPage } from "@/components/legal/privacy-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ReviewX" },
      { name: "description", content: "How ReviewX collects, uses, and protects your data." },
    ],
  }),
  component: PrivacyPage,
});
