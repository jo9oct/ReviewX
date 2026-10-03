import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "./auth-shell";
import { Button, Input } from "@/components/primitives";
import { demoAccounts, findDemoAccount, registerRuntimeAccount } from "@/lib/demo-accounts";
import { ensureProfile, safeNext } from "@/lib/auth";
import { STORAGE_KEYS } from "@/lib/constants";

export function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "register";
  next?: string | undefined;
}) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const destination = safeNext(next);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (!email || !password || (mode === "register" && !fullName)) {
        throw new Error("Please complete all required fields.");
      }

      if (mode === "register") {
        // Register the account into the runtime registry so the user can log
        // in with these credentials immediately after confirming their email.
        registerRuntimeAccount({
          id: `local-${Date.now()}`,
          name: fullName,
          email: email.trim().toLowerCase(),
          password,
          role: "member",
          label: "Member",
          context: "Personal reviews and assigned findings",
        });
        await ensureProfile(
          { id: "mock-user", email, user_metadata: { full_name: fullName } },
          fullName,
        );
        setConfirmationSent(true);
        return;
      }

      const account = findDemoAccount(email, password);
      if (!account) {
        throw new Error("Use one of the demo accounts below to enter the workspace.");
      }
      // setActiveDemoAccount is called inside registerRuntimeAccount for new
      // accounts; for demo accounts we call it here via findDemoAccount's result.
      const { setActiveDemoAccount } = await import("@/lib/demo-accounts");
      setActiveDemoAccount(account);
      await ensureProfile({
        id: account.id,
        email: account.email,
        user_metadata: { full_name: account.name },
      });
      await navigate({ to: destination });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to continue");
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    setBusy(true);
    sessionStorage.setItem(STORAGE_KEYS.AUTH_NEXT, destination);
    try {
      await ensureProfile(
        { id: "mock-user", email: "alex@acme.dev", user_metadata: { full_name: "Alex Morgan" } },
        "Alex Morgan",
      );
      await navigate({ to: "/auth/callback" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to continue");
    } finally {
      setBusy(false);
    }
  }

  if (confirmationSent) {
    return (
      <AuthShell
        eyebrow="Confirm your account"
        title="Check your inbox"
        description={`We sent a confirmation link to ${email}. Open it to finish creating your account.`}
      >
        <Button asChild className="w-full">
          <Link to="/auth">Return to sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  const isRegister = mode === "register";
  return (
    <AuthShell
      eyebrow={isRegister ? "Create account" : "Welcome back"}
      title={isRegister ? "Start reviewing with ReviewX" : "Sign in to your workspace"}
      description={
        isRegister
          ? "Create your member account. Your workspace access is assigned securely by your organization."
          : "Continue to your reviews, findings, and team workspace."
      }
    >
      <Button variant="outline" className="w-full" onClick={continueWithGoogle} disabled={busy}>
        <span className="font-semibold">G</span> Continue with Google
      </Button>
      <div className="my-6 flex items-center gap-3 text-[10px] uppercase text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or use email
        <span className="h-px flex-1 bg-border" />
      </div>
      <form className="space-y-4" onSubmit={submit}>
        {isRegister && (
          <Field label="Full name">
            <Input
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Morgan"
            />
          </Field>
        )}
        <Field label="Work email">
          <Input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </Field>
        <Field
          label="Password"
          aside={
            !isRegister ? (
              <Link to="/forgot-password" className="text-primary hover:underline">
                Forgot password?
              </Link>
            ) : undefined
          }
        >
          <div className="relative">
            <Input
              required
              minLength={8}
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="pr-10"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Button className="w-full" type="submit" disabled={busy}>
          {busy && <LoaderCircle className="animate-spin" />}
          {isRegister ? "Create account" : "Sign in"}
        </Button>
      </form>
      {!isRegister && (
        <div className="mt-6 border border-border bg-surface p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">Demo accounts</p>
            <span className="font-mono text-[10px] text-muted-foreground">
              password: reviewx123
            </span>
          </div>
          <div className="space-y-2">
            {demoAccounts.map((account) => (
              <button
                key={account.id}
                type="button"
                className="flex w-full items-center justify-between border border-border px-3 py-2 text-left transition-colors hover:border-primary hover:bg-accent"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
              >
                <span>
                  <span className="block text-xs font-medium text-foreground">{account.name}</span>
                  <span className="block text-[11px] text-muted-foreground">{account.context}</span>
                </span>
                <span className="font-mono text-[10px] text-primary">{account.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        {isRegister ? "Already have an account?" : "New to ReviewX?"}{" "}
        <Link
          to={isRegister ? "/auth" : "/register"}
          className="font-medium text-foreground hover:text-primary"
        >
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex justify-between text-xs font-medium text-foreground">
        <span>{label}</span>
        {aside}
      </span>
      {children}
    </label>
  );
}
