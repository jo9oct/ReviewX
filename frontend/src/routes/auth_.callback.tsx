import { useEffect, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const destination = safeNext(
        typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEYS.AUTH_NEXT) : null,
      );
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(STORAGE_KEYS.AUTH_NEXT);
      }

      if (typeof window !== "undefined") {
        const callbackError = new URLSearchParams(window.location.search).get("error");
        if (callbackError) {
          window.history.replaceState(window.history.state, "", window.location.pathname);
          if (!cancelled) {
            setError(
              callbackError === "github"
                ? "GitHub sign-in was cancelled or could not be completed. Please try again."
                : "Social sign-in could not be completed. Please try again.",
            );
          }
          return;
        }
      }

      let token = getAuthToken();
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const queryToken = params.get("token");
        if (queryToken) {
          window.history.replaceState(window.history.state, "", window.location.pathname);
          setAuthToken(queryToken);
          token = queryToken;
        }
      }

      if (!token) {
        if (!cancelled) {
          setError("Social sign-in did not return a session. Please try again.");
        }
        return;
      }

      try {
        const user = await useAuthStore.getState().initialize();
        if (!user) {
          throw new Error("Could not verify the sign-in session.");
        }
        if (!cancelled) await navigate({ to: destination });
      } catch {
        setAuthToken(null);
        if (!cancelled) {
          setError("We couldn't complete sign-in. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-background">
      <div className="text-center">
        <Brand />
        {!error && <LoaderCircle className="mx-auto mt-8 size-5 animate-spin text-primary" />}
        {error ? (
          <>
            <p className="mt-3 text-sm text-destructive">{error}</p>
            <a
              className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              href="/auth"
            >
              Return to sign in
            </a>
          </>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Redirecting to workspace…</p>
        )}
      </div>
    </main>
  );
}
