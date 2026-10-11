import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LoaderCircle, AlertCircle, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button, Input } from "@/components/primitives";
import { Brand } from "@/components/brand";
import {
  getInvitationInfo,
  acceptInvitation,
  getCurrentUser,
  setAuthToken,
  ApiClientError,
  type InvitationInfo,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { safeNext } from "@/lib/auth";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Accept invitation — ReviewX" },
      { name: "description", content: "Accept your invitation to a ReviewX workspace." },
      { property: "og:title", content: "Accept invitation — ReviewX" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InviteRoutePage,
});

function InviteRoutePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInvitationInfo(token)
      .then((data) => {
        if (!cancelled) {
          setInfo(data);
          setLoadError(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof ApiClientError
            ? err.message
            : "This invitation link is invalid or has expired.";
        setLoadError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function accept(payload: { name?: string; password?: string }) {
    setBusy(true);
    setFormError(null);
    try {
      const data = await acceptInvitation(token, payload);
      if (data.token) {
        setAuthToken(data.token);
      }
      const nextUser = data.user || (await getCurrentUser());
      if (data.token && nextUser) {
        setAuth(nextUser, data.token);
      }
      toast.success("Invitation accepted — welcome to the workspace!");
      await navigate({ to: safeNext(undefined), replace: true });
    } catch (err: unknown) {
      let message = "Could not accept the invitation. Please try again.";
      if (err instanceof ApiClientError) {
        if (err.code === "LOGIN_REQUIRED" || err.statusCode === 401) {
          // Existing account — bounce to sign-in and return here afterwards.
          await navigate({
            to: "/auth",
            search: { next: `/invite/${token}` },
            replace: true,
          });
          return;
        }
        if (err.code === "EMAIL_MISMATCH") {
          message =
            "You're signed in with a different email. Sign out and sign in with the invited account.";
        } else if (err.statusCode === 409) {
          message = err.message;
        } else {
          message = err.message || message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || password.length < 8) {
      setFormError("Enter your name and a password of at least 8 characters.");
      return;
    }
    void accept({ name: name.trim(), password });
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <LoaderCircle className="size-6 animate-spin" />
          <p className="text-sm">Checking your invitation…</p>
        </div>
      </Shell>
    );
  }

  if (loadError || !info) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle className="size-6 text-destructive" />
          <h1 className="text-lg font-semibold text-foreground">Invitation unavailable</h1>
          <p className="max-w-sm text-sm text-muted-foreground">{loadError}</p>
          <Link to="/">
            <Button variant="outline" className="mt-2">
              Back to home
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  // Existing account, already signed in as the right user → single accept button.
  if (info.accountExists && user) {
    return (
      <Shell>
        <div className="space-y-4 py-8 text-center">
          <MailCheck className="mx-auto size-7 text-emerald-500" />
          <h1 className="text-xl font-semibold text-foreground">
            Join {info.companyName}
          </h1>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            You're signed in as <span className="font-medium text-foreground">{user.email}</span>.
            Accept to join this workspace as a member.
          </p>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <Button className="mx-auto mt-2 block" disabled={busy} onClick={() => void accept({})}>
            {busy && <LoaderCircle className="animate-spin" />}
            Accept invitation
          </Button>
        </div>
      </Shell>
    );
  }

  // Existing account, signed out (or signed in as someone else) → sign in first.
  if (info.accountExists) {
    return (
      <Shell>
        <div className="space-y-4 py-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Join {info.companyName}
          </h1>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            An account already exists for{" "}
            <span className="font-medium text-foreground">{info.email}</span>. Sign in to
            accept this invitation.
          </p>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <Link to="/auth" search={{ next: `/invite/${token}` }}>
            <Button className="mx-auto mt-2 block">Sign in to accept</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  // New account → name + password form.
  return (
    <Shell>
      <div className="space-y-1 pb-5 text-center">
        <h1 className="text-xl font-semibold text-foreground">Join {info.companyName}</h1>
        <p className="text-sm text-muted-foreground">
          Invited as <span className="font-medium text-foreground">{info.email}</span> — set
          your name and password to finish signing up.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError && (
          <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-foreground">Full name</span>
          <Input
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setFormError(null);
              setName(e.target.value);
            }}
            placeholder="Alex Morgan"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-foreground">Password</span>
          <Input
            required
            minLength={8}
            maxLength={128}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setFormError(null);
              setPassword(e.target.value);
            }}
            placeholder="At least 8 characters"
          />
        </label>
        <Button className="w-full" type="submit" disabled={busy}>
          {busy && <LoaderCircle className="animate-spin" />}
          Accept & create account
        </Button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        {children}
      </div>
    </div>
  );
}
