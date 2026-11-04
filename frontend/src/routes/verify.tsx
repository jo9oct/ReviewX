import { useState, useEffect, type FormEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { LoaderCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button, Input } from "@/components/primitives";
import { verifyEmail, resendVerificationCode } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/verify")({
  ssr: false,
  validateSearch: z.object({
    code: z.string().optional(),
    token: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Verify email — ReviewX" },
      { name: "description", content: "Verify your ReviewX account email." },
      { property: "og:title", content: "Verify email — ReviewX" },
      { property: "og:description", content: "Verify your email to activate your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyRoutePage,
});

function VerifyRoutePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [code, setCode] = useState(search?.code || search?.token || "");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const initialToken = search?.code || search?.token;
    if (initialToken && initialToken.length === 6) {
      void handleVerify(initialToken);
    }
  }, []);

  async function handleVerify(tokenToVerify: string) {
    if (!tokenToVerify.trim()) {
      setErrorMsg("Please enter the verification code sent to your email.");
      return;
    }

    setBusy(true);
    setErrorMsg(null);

    try {
      const response = await verifyEmail(tokenToVerify.trim());
      setVerified(true);
      toast.success("Email verified successfully!");

      if (response.user && response.token) {
        useAuthStore.getState().setAuth(response.user, response.token);
      } else {
        await useAuthStore.getState().initialize();
      }

      setTimeout(() => {
        void navigate({ to: "/dashboard" });
      }, 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid or expired verification code.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setErrorMsg(null);
    try {
      await resendVerificationCode();
      toast.success("Verification code resent to your email.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to resend code. Please try signing in.";
      toast.error(msg);
    } finally {
      setResending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void handleVerify(code);
  }

  return (
    <AuthShell
      eyebrow="Account Verification"
      title={verified ? "Email verified!" : "Verify your email"}
      description={
        verified
          ? "Your email has been verified. Redirecting you to your workspace..."
          : "Please enter the 6-digit verification code sent to your email inbox."
      }
    >
      {verified ? (
        <div className="space-y-5 text-center">
          <div className="flex items-center justify-center gap-3 border border-border bg-surface p-4 text-sm text-success">
            <CheckCircle2 className="size-5" />
            Verification complete. Taking you to your dashboard...
          </div>
          <Button asChild className="w-full">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">Verification code</span>
            <Input
              required
              maxLength={6}
              value={code}
              onChange={(e) => {
                setErrorMsg(null);
                setCode(e.target.value.replace(/\D/g, ""));
              }}
              placeholder="123456"
              className="text-center font-mono text-lg tracking-widest"
              autoFocus
            />
          </label>

          <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
            {busy && <LoaderCircle className="animate-spin mr-2 size-4" />}
            Verify email
          </Button>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            Didn't receive the email?{" "}
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resending}
              className="font-medium text-primary hover:underline disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

