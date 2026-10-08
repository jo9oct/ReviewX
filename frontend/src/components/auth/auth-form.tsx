import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LoaderCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button, Input } from "@/components/primitives";
import { AuthShell } from "./auth-shell";
import { safeNext } from "@/lib/auth";
import {
  loginUser,
  registerUser,
  getCurrentUser,
  setAuthToken,
  getAuthToken,
  ApiClientError,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "register";
  next?: string | undefined;
}) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const destination = safeNext(next);

  useEffect(() => {
    const token = getAuthToken();
    if (token || user) {
      void (async () => {
        let activeUser = user;
        if (!activeUser && token) {
          try {
            activeUser = await useAuthStore.getState().initialize();
          } catch {
            return;
          }
        }
        if (activeUser) {
          void navigate({ to: destination });
        }
      })();
    }
  }, [navigate, destination, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanEmail || !password || (mode === "register" && !cleanName)) {
      setFormError("Please complete all required fields.");
      return;
    }

    if (mode === "register" && (cleanName.length < 2 || cleanName.length > 80)) {
      setFormError("Name must be between 2 and 80 characters.");
      return;
    }

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    if (mode === "register" && password.length > 128) {
      setFormError("Password must be 128 characters or fewer.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "register") {
        const payload = await registerUser({
          name: cleanName,
          email: cleanEmail,
          password,
        });

        if (payload.token) {
          setAuthToken(payload.token);
        }

        const user = await getCurrentUser();
        useAuthStore.getState().setAuth(user, payload.token);

        toast.success("Account created successfully!");
        await navigate({ to: destination });
        return;
      }

      // Login flow
      const payload = await loginUser({
        email: cleanEmail,
        password,
      });

      if (payload.token) {
        setAuthToken(payload.token);
      }

      const user = await getCurrentUser();
      useAuthStore.getState().setAuth(user, payload.token);

      toast.success("Signed in successfully!");
      await navigate({ to: destination });
    } catch (error) {
      let message = "Unable to complete request. Please try again.";

      if (error instanceof ApiClientError) {
        if (error.statusCode === 401) {
          message = "Invalid email or password. Please verify your credentials.";
        } else if (error.statusCode === 409) {
          message = "An account with that email already exists. Please sign in instead.";
        } else if (error.statusCode === 429) {
          message = "Too many attempts. Please try again in 15 minutes.";
        } else {
          message = error.message || message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function continueWithGoogle() {
    toast.info("Google OAuth is coming soon. Please sign in with email and password.");
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

      <form className="space-y-4" onSubmit={submit} autoComplete="off">
        {formError && (
          <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {isRegister && (
          <Field label="Full name">
            <Input
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              value={fullName}
              onChange={(e) => {
                setFormError(null);
                setFullName(e.target.value);
              }}
              placeholder="Alex Morgan"
            />
          </Field>
        )}
        <Field label="Work email">
          <Input
            required
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => {
              setFormError(null);
              setEmail(e.target.value);
            }}
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
              maxLength={isRegister ? 128 : undefined}
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => {
                setFormError(null);
                setPassword(e.target.value);
              }}
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
