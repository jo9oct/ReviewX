/**
 * Shared layout for legal pages (Privacy, Terms).
 * Uses the same design tokens as the rest of the app.
 */
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";

export function LegalShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal nav */}
      <header className="border-b border-border/60 bg-background/80 px-5 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" aria-label="ReviewX home">
            <Brand />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-6 lg:px-8">
        {/* Page heading */}
        <div className="mb-10 border-b border-border pb-8">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Legal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{title}</h1>
          <p className="mt-2 text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        {/* Prose content */}
        <div className="prose-legal">{children}</div>
      </main>

      <footer className="border-t border-border px-5 py-8 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
        © {new Date().getFullYear()} ReviewX. All rights reserved.
        <span className="mx-3">·</span>
        <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
        <span className="mx-3">·</span>
        <Link to="/terms" className="hover:text-foreground">Terms</Link>
      </footer>
    </div>
  );
}

/**
 * A styled section heading inside legal pages.
 */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}
