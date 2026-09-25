import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { Brand } from "@/components/brand";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(430px,560px)]">
      <section className="relative hidden overflow-hidden border-r border-[oklch(0.29_0.01_260)] bg-editor p-12 lg:flex lg:flex-col">
        <Brand />
        <div className="my-auto max-w-lg">
          <p className="font-mono text-xs uppercase text-primary">Review before risk ships</p>
          <h2 className="mt-5 text-4xl font-semibold leading-tight text-[oklch(0.94_0.006_255)]">
            One workspace for safer, clearer code.
          </h2>
          <div className="mt-8 space-y-4">
            {[
              "Security and reliability findings",
              "Plain-language explanations",
              "Review-ready suggested fixes",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-[oklch(0.64_0.018_255)]">
                <span className="grid size-5 place-items-center rounded-full border border-[oklch(0.29_0.01_260)] bg-[oklch(0.22_0.009_260)]">
                  <Check className="size-3 text-success" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="font-mono text-[10px] text-[oklch(0.48_0.015_255)]">
          REVIEWX / AUTOMATED CODE REVIEW
        </p>
      </section>
      <section className="flex min-h-screen flex-col px-5 py-5 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between lg:justify-end">
          <Brand className="lg:hidden" />
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back home
          </Link>
        </div>
        <div className="my-auto mx-auto w-full max-w-sm py-12">
          <p className="font-mono text-[10px] uppercase text-primary">{eyebrow}</p>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
