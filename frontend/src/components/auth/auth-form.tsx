import { useState, useEffect, useRef, type FormEvent } from "react";
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
  const submittingRef = useRef(false);
  const user = useAuthStore((s) => s.user);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<"individual" | "company_owner">("individual");
  const [companyName, setCompanyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const destination = safeNext(next);

  useEffect(() => {
    // If the user is already authenticated on mount, redirect to dashboard smoothly
    if (submittingRef.current) return;
    const token = getAuthToken();
    const currentUser = useAuthStore.getState().user;
    if (token && currentUser) {
      void navigate({ to: destination as any, replace: true });
    }
  }, [navigate, destination]);

  async function submit(event?: FormEvent) {
    if (event) {
      event.preventDefault();
    }
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

    const cleanCompanyName = companyName.trim();
    if (mode === "register" && accountType === "company_owner" && cleanCompanyName.length < 2) {
      setFormError("Company name must be at least 2 characters.");
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    try {
      if (mode === "register") {
        const payload = await registerUser({
          name: cleanName,
          email: cleanEmail,
          password,
          accountType,
          ...(accountType === "company_owner" ? { companyName: cleanCompanyName } : {}),
        });

        const token = payload.token;
        if (token) {
          setAuthToken(token);
        }

        // Always fetch the enriched user from /auth/me so companyRole,
        // isOwner, workspaces and activeWorkspace are present from the start.
        const user = await getCurrentUser();
        if (token && user) {
          useAuthStore.getState().setAuth(user, token);
        }

        toast.success(
          accountType === "company_owner"
            ? "Workspace created successfully!"
            : "Account created successfully!",
        );
        await navigate({ to: destination as any, replace: true });
        return;
      }

      // Login flow
      const payload = await loginUser({
        email: cleanEmail,
        password,
      });

      const token = payload.token;
      if (token) {
        setAuthToken(token);
      }

      // Always fetch the enriched user from /auth/me so companyRole,
      // isOwner, workspaces and activeWorkspace are present from the start.
      const user = await getCurrentUser();
      if (token && user) {
        useAuthStore.getState().setAuth(user, token);
      }

      toast.success("Signed in successfully!");
      await navigate({ to: destination as any, replace: true });
    } catch (error) {
      let message = "Unable to complete request. Please try again.";

      if (error instanceof ApiClientError) {
        if (error.statusCode === 401) {
          message = "Invalid email or password. Please verify your credentials.";
        } else if (error.statusCode === 409) {
          message = "An account with that email already exists. Please sign in instead.";
        } else if (error.statusCode === 429) {
          message = "Too many attempts. Please try again in 15 minutes.";
        } else if (error.statusCode === 503) {
          message = error.message || "ReviewX backend server is currently unreachable. Please try again shortly.";
        } else {
          message = error.message || message;
        }
      } else if (error instanceof Error) {
        if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
          message = "Unable to connect to the ReviewX server. Please verify your connection or try again.";
        } else {
          message = error.message;
        }
      }

      setFormError(message);
      toast.error(message);
    } finally {
      submittingRef.current = false;
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
          ? "Create your account — individually, or as a company owner setting up a shared workspace."
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

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e);
        }}
        autoComplete="off"
      >
        {formError && (
          <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {isRegister && (
          <Field label="Account type">
            <div
              role="radiogroup"
              aria-label="Account type"
              className="grid grid-cols-2 gap-2"
            >
              {(
                [
                  { value: "individual", label: "Individual", hint: "Personal account" },
                  { value: "company_owner", label: "Company owner", hint: "Create a workspace" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={accountType === option.value}
                  onClick={() => {
                    setFormError(null);
                    setAccountType(option.value);
                  }}
                  className={`rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    accountType === option.value
                      ? "border-foreground bg-muted"
                      : "border-border bg-transparent hover:bg-muted/50"
                  }`}
                >
                  <span className="block text-xs font-medium text-foreground">{option.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{option.hint}</span>
                </button>
              ))}
            </div>
          </Field>
        )}

        {isRegister && accountType === "company_owner" && (
          <Field label="Company name">
            <Input
              required
              minLength={2}
              maxLength={100}
              autoComplete="organization"
              value={companyName}
              onChange={(e) => {
                setFormError(null);
                setCompanyName(e.target.value);
              }}
              placeholder="Acme Inc."
            />
          </Field>
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
