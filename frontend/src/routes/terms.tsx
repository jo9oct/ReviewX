import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "@/components/legal/terms-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ReviewX" },
      { name: "description", content: "ReviewX terms of service and acceptable use policy." },
    ],
  }),
  component: TermsPage,
});
