import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "./auth-shell";
import { Button, Input } from "@/components/primitives";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (!email.trim()) throw new Error("Please enter your email address.");
      await new Promise((resolve) => setTimeout(resolve, 300));
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send reset link");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell
      eyebrow="Account recovery"
      title={sent ? "Check your inbox" : "Reset your password"}
      description={
        sent
          ? `If an account exists for ${email}, a secure reset link is on its way.`
          : "Enter your email and we’ll send you a secure reset link."
      }
    >
      {sent ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3 border border-border bg-surface p-4 text-sm">
            <CheckCircle2 className="size-5 text-success" />
            Reset instructions sent
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/auth">Return to sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">Work email</span>
            <Input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <LoaderCircle className="animate-spin" />}
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      toast.success("Password updated");
      await navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update password");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell
      eyebrow="Choose a new password"
      title="Secure your account"
      description="Use at least eight characters and avoid a password you use elsewhere."
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">New password</span>
          <Input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">Confirm password</span>
          <Input
            required
            minLength={8}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <LoaderCircle className="animate-spin" />}
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
