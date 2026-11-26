import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { LoaderCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button, Input } from "@/components/primitives";
import { verifyEmail, resendVerificationCode } from "@/lib/api";
import { redirectIfAuthenticated } from "@/lib/auth";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/verify")({
  ssr: false,
  validateSearch: z.object({
    code: z.string().optional(),
    token: z.string().optional(),
    email: z.string().optional(),
  }),
  beforeLoad: async () => {
    await redirectIfAuthenticated();
  },
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
  const initialCode = (search?.code || search?.token || "").replace(/\D/g, "").slice(0, 6);
  const [code, setCode] = useState(() =>
    Array.from({ length: 6 }, (_, index) => initialCode[index] || ""),
  );
  const codeInputs = useRef<Array<HTMLInputElement | null>>([]);
  const [email, setEmail] = useState(search?.email || "");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = useCallback(
    async (tokenToVerify: string) => {
      if (!tokenToVerify.trim()) {
        setErrorMsg("Please enter the verification code sent to your email.");
        return;
      }

      setBusy(true);
      setErrorMsg(null);

      try {
        const response = await verifyEmail(tokenToVerify.trim(), email || undefined);
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
    },
    [email, navigate],
  );

  useEffect(() => {
    if (initialCode.length === 6) {
      void handleVerify(initialCode);
    }
  }, [handleVerify, initialCode]);

  async function handleResend() {
    setResending(true);
    setErrorMsg(null);
    try {
      await resendVerificationCode(email || undefined);
      toast.success("Verification code resent to your email.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unable to resend code. Please try signing in.";
      toast.error(msg);
    } finally {
      setResending(false);
    }
  }

  function handleCodeChange(index: number, value: string) {
    const enteredDigits = value.replace(/\D/g, "").slice(0, 6 - index);
    if (!enteredDigits) {
      const nextCode = [...code];
      nextCode[index] = "";
      setCode(nextCode);
      setErrorMsg(null);
      return;
    }

    const nextCode = [...code];
    enteredDigits.split("").forEach((digit, offset) => {
      nextCode[index + offset] = digit;
    });
    setCode(nextCode);
    setErrorMsg(null);
    codeInputs.current[Math.min(index + enteredDigits.length, 5)]?.focus();

    if (nextCode.every((digit) => digit !== "")) {
      void handleVerify(nextCode.join(""));
    }
  }

  return (
    <AuthShell
      eyebrow="Account Verification"
      title={verified ? "Email verified!" : "Verify your email"}
      description={
        verified
          ? "Your email has been verified. Redirecting you to your workspace..."
          : email
            ? `Please enter the 6-digit verification code sent to ${email}.`
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
        <div className="space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <span id="verification-code-label" className="mb-1.5 block text-xs font-medium">
              Verification code
            </span>
            <div
              role="group"
              aria-labelledby="verification-code-label"
              className="flex justify-center gap-2"
            >
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(element) => {
                    codeInputs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  pattern="[0-9]*"
                  maxLength={6}
                  value={digit}
                  aria-label={`Digit ${index + 1} of 6`}
                  disabled={busy}
                  autoFocus={index === 0}
                  onChange={(event) => handleCodeChange(index, event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && !digit && index > 0) {
                      event.preventDefault();
                      const previousIndex = index - 1;
                      handleCodeChange(previousIndex, "");
                      codeInputs.current[previousIndex]?.focus();
                    } else if (event.key === "ArrowLeft" && index > 0) {
                      codeInputs.current[index - 1]?.focus();
                    } else if (event.key === "ArrowRight" && index < 5) {
                      codeInputs.current[index + 1]?.focus();
                    }
                  }}
                  onPaste={(event) => {
                    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
                    if (pasted) {
                      event.preventDefault();
                      handleCodeChange(index, pasted);
                    }
                  }}
                  className="h-12 w-11 shrink-0 px-0 text-center font-mono text-lg"
                />
              ))}
            </div>
          </div>

          {busy && (
            <div
              role="status"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <LoaderCircle className="size-4 animate-spin" />
              Verifying code...
            </div>
          )}

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

          <div className="border-t border-border/50 pt-3 text-center text-xs text-muted-foreground">
            <Link to="/auth" className="hover:text-foreground hover:underline">
              ← Return to Sign In
            </Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
