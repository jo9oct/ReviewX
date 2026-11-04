import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { Brand } from "@/components/brand";
import { safeNext } from "@/lib/auth";
import { STORAGE_KEYS } from "@/lib/constants";
import { getAuthToken, setAuthToken } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

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

  useEffect(() => {
    void (async () => {
      const destination = safeNext(
        typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEYS.AUTH_NEXT) : null,
      );
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(STORAGE_KEYS.AUTH_NEXT);
      }

      let token = getAuthToken();
      if (!token && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const queryToken = params.get("token");
        if (queryToken) {
          setAuthToken(queryToken);
          token = queryToken;
          try {
            await useAuthStore.getState().initialize();
          } catch (_e) {}
        }
      }

      if (token) {
        await navigate({ to: destination });
      } else {
        await navigate({ to: "/auth" });
      }
    })();
  }, [navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-background">
      <div className="text-center">
        <Brand />
        <LoaderCircle className="mx-auto mt-8 size-5 animate-spin text-primary" />
        <p className="mt-3 text-xs text-muted-foreground">Redirecting to workspace…</p>
      </div>
    </main>
  );
}
