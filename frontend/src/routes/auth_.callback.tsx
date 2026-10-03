import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { Brand } from "@/components/brand";
import { ensureProfile, safeNext } from "@/lib/auth";
import { STORAGE_KEYS } from "@/lib/constants";
import { demoAccounts, setActiveDemoAccount } from "@/lib/demo-accounts";

export const Route = createFileRoute("/auth_/callback")({
  head: () => ({
    meta: [
      { title: "Completing sign in — ReviewX" },
      { name: "description", content: "Completing your secure ReviewX sign-in." },
      { property: "og:title", content: "Completing sign in — ReviewX" },
      { property: "og:description", content: "Completing your secure sign-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CallbackPage,
});
function CallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Securing your workspace…");
  useEffect(() => {
    void (async () => {
      const destination = safeNext(sessionStorage.getItem(STORAGE_KEYS.AUTH_NEXT));
      sessionStorage.removeItem(STORAGE_KEYS.AUTH_NEXT);

      // Mock Google OAuth: always resolves to the demo member account (Alex Morgan).
      // Replace with real OAuth token exchange when integrating a real auth provider.
      const mockAccount = demoAccounts.find((a) => a.id === "demo-member") ?? demoAccounts[0]!;
      setActiveDemoAccount(mockAccount);
      await ensureProfile(
        {
          id: mockAccount.id,
          email: mockAccount.email,
          user_metadata: { full_name: mockAccount.name },
        },
        mockAccount.name,
      );
      setMessage("Signed in successfully.");
      await navigate({ to: destination });
    })();
  }, [navigate]);
  return (
    <main className="grid min-h-screen place-items-center bg-background">
      <div className="text-center">
        <Brand />
        <LoaderCircle className="mx-auto mt-8 size-5 animate-spin text-primary" />
        <p className="mt-3 text-xs text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
