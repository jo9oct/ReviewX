import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "./auth-shell";
import { PasswordStrengthIndicator } from "./password-strength";
import { Button, Input } from "@/components/primitives";
import { forgotPassword, resetPassword } from "@/lib/api";
import { getPasswordStrength } from "@/lib/password-strength";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      await forgotPassword(cleanEmail);
      setEmail(cleanEmail);
      setRequested(true);
      toast.success("If an account exists for that email, a reset link has been sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to request a reset code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description={
        requested
          ? "Check your email for a password reset link."
          : "Enter your account email. If it is registered, we’ll send a password reset link."
      }
    >
      {requested ? (
        <div className="space-y-4 text-center text-sm">
          <p>
            If an account exists for <strong>{email}</strong>, a reset link has been sent.
          </p>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setRequested(false)}
          >
            Use a different email
          </button>
          <p>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">
              Back to sign in
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">Email address</span>
            <Input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <LoaderCircle className="animate-spin" />}
            Send reset link
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Remembered your password?{" "}
            <Link to="/auth" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordForm({ token }: { token?: string | undefined }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      toast.error("This password reset link is invalid or expired. Request a new one.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (getPasswordStrength(password) === "weak") {
      toast.error("Password is weak. Use at least 8 characters and a mix of character types.");
      return;
    }

    setBusy(true);
    try {
      await resetPassword({
        token: token.trim(),
        password,
        confirmPassword: confirm,
      });
      toast.success("Password reset successfully. Please sign in.");
      await navigate({ to: "/auth" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password"
      description={
        token
          ? "Choose a new password. This reset link expires after 10 minutes."
          : "This password reset link is missing or invalid. Request a new link to continue."
      }
    >
      {token ? (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">New password</span>
            <Input
              required
              minLength={8}
              maxLength={128}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <PasswordStrengthIndicator password={password} />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">Confirm new password</span>
            <Input
              required
              minLength={8}
              maxLength={128}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <LoaderCircle className="animate-spin" />}
            Reset password
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">
              Back to sign in
            </Link>
          </p>
        </form>
      ) : (
        <div className="space-y-4 text-center text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline">
            Request a new reset link
          </Link>
          <p>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">
              Back to sign in
            </Link>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
