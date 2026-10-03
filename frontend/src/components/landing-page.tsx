/**
 * ReviewX landing page — refinement pass.
 *
 * Changes from previous version:
 * - Removed fabricated social proof (fake company logos, fake testimonials)
 * - Replaced testimonials with "early access" framing
 * - CTA copy unified to "Start free" across header/hero/CTA band
 * - Hero trust row: added "Your code is never executed"
 * - Hero copy mentions paste-or-upload
 * - Two key stats pulled up to hero (below fold strip)
 * - Language badges row added below hero
 * - Feature card "Health score at a glance" shows a mini score ring instead of plain icon
 * - Voice/Voxide callout section added (between Workflow and Security)
 * - Reports callout added as a feature point in Features section
 * - Security section reinforces "code never executed"
 * - Section backgrounds alternate: dark / surface / dark / surface …
 * - FAQ section added between Security and Pricing
 * - Footer legal links point to real /privacy and /terms routes
 */

import { Link } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Download,
  FileText,
  Gauge,
  Github,
  Lock,
  Menu,
  Mic,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Twitter,
  WandSparkles,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { forwardRef, useEffect, useState } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/primitives";
import { useFadeIn } from "@/lib/use-fade-in";
import { useTheme } from "@/lib/use-theme";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────── shared types ─── */

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Optional override: render a custom visual instead of the plain icon box. */
  visual?: React.ReactNode;
};

type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  featured?: boolean;
  cta: string;
};

type FaqItem = {
  q: string;
  a: string;
};

/* ─────────────────────────────────────────── static content ─── */

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Security", href: "#security" },
  { label: "Pricing",  href: "#pricing"  },
];

/** Mini score ring used inside the "Health score" feature card. */
function MiniScoreRing() {
  const score = 78;
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto mb-4 size-16">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none"
          stroke="var(--score)" strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-mono text-sm font-semibold text-foreground">{score}</span>
      </div>
    </div>
  );
}

const FEATURES: Feature[] = [
  {
    title: "Security-first review",
    description:
      "Catch injection flaws, unsafe auth patterns, and risky data handling before they reach production. Mapped to CWE and OWASP 2021.",
    icon: ShieldCheck,
  },
  {
    title: "AI explained clearly",
    description:
      "Turn confusing issues into plain-language guidance with before/after code fixes you can accept in one click.",
    icon: Bot,
  },
  {
    title: "Team rules enforced",
    description:
      "Encode your company's engineering standards as guardrails that run automatically on every review.",
    icon: Workflow,
  },
  {
    title: "Health score at a glance",
    description:
      "A single composite score with trend graphs and severity breakdowns — so you always know where you stand.",
    icon: Gauge,
    visual: <MiniScoreRing />,
  },
];

// Reports as its own standalone feature point
const REPORT_FEATURE = {
  title: "PDF & JSON reports",
  description:
    "Every review generates a shareable PDF report and a structured JSON export. Persistent links let you share findings with your team or attach them to your PR.",
  icon: FileText,
};

const STEPS = [
  {
    label: "Paste or upload a file",
    detail:
      "Drop in a source file or paste code directly. Supports JavaScript, TypeScript, Python, Java, and PHP.",
  },
  {
    label: "Analyze in seconds",
    detail:
      "ReviewX runs security, bug, quality, and performance checks against built-in and your own company rules.",
  },
  {
    label: "Act on findings",
    detail:
      "Accept AI-generated fixes, reject false positives, download a PDF report, or escalate to your team.",
  },
];

const SUPPORTED_LANGUAGES = [
  { label: "JavaScript", mono: "JS",  color: "text-[#f7df1e]" },
  { label: "TypeScript", mono: "TS",  color: "text-[#3178c6]" },
  { label: "Python",     mono: "PY",  color: "text-[#4b8bbe]" },
  { label: "Java",       mono: "JV",  color: "text-[#ed8b00]" },
  { label: "PHP",        mono: "PHP", color: "text-[#8892be]" },
];

const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "0",
    period: "ETB / month",
    description: "For developers exploring automated code review.",
    features: [
      "10 reviews / month",
      "Built-in security rules",
      "PDF & JSON export reports",
      "Shareable finding links",
    ],
    cta: "Start for free",
  },
  {
    name: "Pro",
    price: "3,120",
    period: "ETB / month",
    description: "For product teams shipping multiple changes per week.",
    features: [
      "Unlimited reviews",
      "Custom rules engine",
      "AI-explained findings",
      "Voice questions via Voxide",
      "Priority support",
    ],
    featured: true,
    cta: "Start free trial",
  },
  {
    name: "Company",
    price: "10,270",
    period: "ETB / month",
    description: "For multi-team engineering organisations.",
    features: [
      "Everything in Pro",
      "Shared dashboards",
      "Team-wide rule controls",
      "Advanced audit policies",
      "Admin access controls",
    ],
    cta: "Talk to us",
  },
];

const FAQ: FaqItem[] = [
  {
    q: "Is my source code ever executed?",
    a: "No. ReviewX performs static analysis only — your code is parsed and analysed as text. It is never run, compiled, or executed on our infrastructure.",
  },
  {
    q: "What languages are supported?",
    a: "JavaScript, TypeScript, Python, Java, and PHP are supported today. Additional language support is on the roadmap.",
  },
  {
    q: "Can I use my own company's coding rules?",
    a: "Yes. The Pro and Company plans include a custom rules engine where you can encode your team's standards and enforce them on every review.",
  },
  {
    q: "What happens to my code after a review?",
    a: "Your source is processed for that review only and is not stored, shared, or used for model training. Each session is isolated.",
  },
  {
    q: "Can I integrate ReviewX into my CI pipeline?",
    a: "An API and GitHub Action are on the near-term roadmap. For now, reviews are run through the web interface.",
  },
];

const SOCIAL_LINKS = [
  { label: "ReviewX on GitHub",     href: "https://github.com",  icon: Github  },
  { label: "ReviewX on X / Twitter", href: "https://twitter.com", icon: Twitter },
];

const FOOTER_LINKS = [
  {
    heading: "Product",
    links: [
      { label: "Features",   href: "#features" },
      { label: "Pricing",    href: "#pricing"  },
      { label: "Security",   href: "#security" },
      { label: "Changelog",  href: "#"         },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About",    href: "#" },
      { label: "Blog",     href: "#" },
      { label: "Contact",  href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy policy",   href: "/privacy" },
      { label: "Terms of service", href: "/terms"   },
    ],
  },
];

/* ────────────────────────────────────────── shared components ─── */

const SectionLabel = forwardRef<HTMLParagraphElement, { children: React.ReactNode }>(
  function SectionLabel({ children }, ref) {
    return (
      <p
        ref={ref}
        className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-purple-400"
      >
        {children}
      </p>
    );
  },
);
SectionLabel.displayName = "SectionLabel";

const SectionHeading = forwardRef<
  HTMLHeadingElement,
  { children: React.ReactNode; className?: string; id?: string }
>(function SectionHeading({ children, className, id }, ref) {
  return (
    <h2
      ref={ref}
      id={id}
      className={cn(
        "mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl",
        className,
      )}
    >
      {children}
    </h2>
  );
});
SectionHeading.displayName = "SectionHeading";

/** Mini code-editor mock shown in the hero. */
function HeroCodePanel() {
  const lines = [
    { text: "import express from 'express';",            hi: false },
    { text: "import mysql  from 'mysql2';",              hi: false },
    { text: "",                                           hi: false },
    { text: "app.get('/api/users', async (req, res) => {", hi: false },
    { text: "  const userId = req.query.id;",            hi: false },
    { text: "  const query  = `SELECT * FROM users",     hi: true  },
    { text: "    WHERE id = ${userId}`;",                hi: true  },
    { text: "  const [rows] = await db.query(query);",   hi: true  },
    { text: "  res.json(rows);",                         hi: false },
    { text: "});",                                       hi: false },
  ];

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/[0.12] bg-[#120f1c]/90 shadow-[0_24px_80px_rgba(0,0,0,0.6),0_0_40px_rgba(139,92,246,0.15)] backdrop-blur-xl"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#161224]/80 px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          <span className="inline-block size-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          api/users.ts
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[9px] text-muted-foreground">
          TypeScript
        </span>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
        {/* Code pane — bg-editor is always dark; use fixed light text colors */}
        <div className="border-r border-white/[0.06] bg-[#0c0915] px-1 py-3 font-mono text-[11px] leading-[1.7]">
          {lines.map((line, i) => (
            <div
              key={i}
              className={cn("flex gap-3 px-3", line.hi && "border-l-2 border-critical bg-critical/10")}
            >
              {/* Line numbers — fixed muted violet-slate */}
              <span className="w-4 select-none text-right text-[#5d5670]">{i + 1}</span>
              {/* Code text — fixed light on dark; highlighted lines use the critical token */}
              <span className={line.hi ? "text-critical" : "text-[#e2ddf0]"}>{line.text}</span>
            </div>
          ))}
        </div>

        {/* Score pane — uses theme tokens with dark purple styling */}
        <div className="bg-[#120f1c]/80 p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Overall score</p>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-mono text-4xl font-semibold leading-none text-foreground">78</span>
            <span className="pb-0.5 font-mono text-[10px] text-muted-foreground">/100</span>
          </div>
          <div className="mt-5 space-y-3">
            {[
              { label: "Security",    value: 70, color: "bg-critical" },
              { label: "Bugs",        value: 80, color: "bg-high"     },
              { label: "Quality",     value: 85, color: "bg-score"    },
              { label: "Performance", value: 75, color: "bg-purple-500" },
            ].map((m) => (
              <div key={m.label}>
                <div className="mb-1 flex justify-between font-mono text-[10px]">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className="font-semibold text-foreground">{m.value}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className={cn("h-full rounded-full", m.color)} style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#0c0915]/60 p-3">
            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Findings</p>
            <div className="space-y-1.5">
              {[
                { label: "Critical", count: 1, cls: "severity-critical" },
                { label: "High",     count: 2, cls: "severity-high"     },
                { label: "Medium",   count: 3, cls: "severity-medium"   },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between text-[11px]">
                  <span className={cn("inline-flex h-4 items-center rounded-sm border px-1.5 font-mono text-[9px] font-semibold", f.cls)}>
                    {f.label}
                  </span>
                  <span className="font-mono font-semibold text-foreground">{f.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Feature card — supports a custom visual override for select cards. */
function FeatureCard({ feature, index = 0 }: { feature: Feature; index?: number }) {
  const shouldReduceMotion = useReducedMotion();
  const Icon = feature.icon;

  /*
   * Entrance: fade-in + upward translate, staggered by card index.
   * Hover: lift the card -3px, shift border to primary/40.
   * Icon box: scale up on card hover via Framer's `whileHover` parent propagation.
   *
   * When prefers-reduced-motion is set, translate/scale are zeroed out so only
   * the opacity fade remains — content is never hidden, just cross-fades in.
   */
  const entranceVariants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 16,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1] as const, // ease-out quint
        delay: index * 0.1,               // 100ms stagger between cards
      },
    },
  };

  return (
    <motion.article
      variants={entranceVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      {...(!shouldReduceMotion && {
        whileHover: { y: -3, transition: { duration: 0.18, ease: "easeInOut" as const } },
      })}
      className="group relative flex flex-col p-6 rounded-2xl border border-white/[0.08] bg-[#120f1c]/70 backdrop-blur-xl transition-all duration-300 hover:border-purple-500/40 hover:shadow-[0_0_35px_rgba(139,92,246,0.16),inset_0_0_20px_rgba(168,85,247,0.03)]"
    >
      {/* Icon area — scales 1→1.08 on card hover, synced via group CSS */}
      {feature.visual ? (
        <div className="transition-transform duration-200 ease-in-out group-hover:scale-[1.04]">
          {feature.visual}
        </div>
      ) : (
        <div className="mb-4 grid size-10 place-items-center rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-500/15 to-pink-500/10 text-purple-300 transition-all duration-200 group-hover:scale-[1.08] group-hover:border-purple-500/50 group-hover:shadow-[0_0_18px_rgba(168,85,247,0.25)]">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
    </motion.article>
  );
}

/** Workflow step row. */
function WorkflowStep({ index, label, detail }: { index: number; label: string; detail: string }) {
  return (
    <div className="flex gap-4">
      <div
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 font-mono text-[11px] font-semibold text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]"
        aria-hidden="true"
      >
        {index + 1}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

/** Pricing plan card. */
function PlanCard({ plan, index = 0 }: { plan: Plan; index?: number }) {
  const shouldReduceMotion = useReducedMotion();

  /*
   * Entrance: fade + upward translate, same timing as FeatureCard.
   * The featured (Pro) card additionally scales 0.98 → 1 to reinforce emphasis.
   * Hover: lift -3px + border strengthens (via CSS class swap).
   * CTA button: scale 1 → 1.02 on hover, faster than card-level (120ms).
   * No box-shadow blur/glow per brief — only border color shift.
   */
  const entranceVariants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 16,
      scale: plan.featured && !shouldReduceMotion ? 0.98 : 1,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1] as const,
        delay: index * 0.1,
      },
    },
  };

  return (
    <motion.article
      variants={entranceVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      {...(!shouldReduceMotion && {
        whileHover: { y: -3, transition: { duration: 0.18, ease: "easeInOut" as const } },
      })}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl p-6 backdrop-blur-xl transition-all duration-300",
        plan.featured
          ? "border border-purple-500/50 bg-[#161126]/90 shadow-[0_0_40px_rgba(168,85,247,0.18)] hover:border-purple-400 hover:shadow-[0_0_50px_rgba(217,70,239,0.28)]"
          : "border border-white/[0.08] bg-[#120f1c]/70 hover:border-purple-500/40 hover:shadow-[0_0_35px_rgba(139,92,246,0.16)]",
      )}
    >
      {/* Decorative shimmer on featured card */}
      {plan.featured && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(168,85,247,0.22),transparent)] opacity-80 transition-opacity duration-500 group-hover:opacity-100"
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
        </div>
        {plan.featured && (
          <span className="shrink-0 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_0_12px_rgba(217,70,239,0.4)]">
            Most popular
          </span>
        )}
      </div>

      {/* Price — intentionally static, no count-up */}
      <div className="relative mt-5 flex items-baseline gap-1">
        <span className="font-mono text-4xl font-semibold text-foreground">
          {plan.price}
        </span>
        <span className="text-xs text-muted-foreground">{plan.period}</span>
      </div>

      <ul className="relative mt-6 grow space-y-3" aria-label={`${plan.name} plan features`}>
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <span
              className="grid size-4 shrink-0 place-items-center rounded-full bg-success/15 text-success transition-colors duration-200 group-hover:bg-success/25"
              aria-hidden="true"
            >
              <Check className="size-2.5" />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA — snappier 130ms scale on hover, independent of card lift */}
      <div className="relative mt-8">
        <motion.div
          {...(!shouldReduceMotion && {
            whileHover: { scale: 1.02, transition: { duration: 0.13, ease: "easeInOut" as const } },
            whileTap:   { scale: 0.98, transition: { duration: 0.10, ease: "easeInOut" as const } },
          })}
        >
          <Button
            asChild
            variant={plan.featured ? "default" : "outline"}
            className={cn(
              "w-full gap-2 rounded-full font-medium transition-all [&_svg]:translate-x-0 [&_svg]:transition-transform [&_svg]:duration-200 group-hover:[&_svg]:translate-x-1",
              plan.featured
                ? "border-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 text-white shadow-[0_0_24px_rgba(217,70,239,0.35)] hover:from-violet-500 hover:via-fuchsia-400 hover:to-pink-400 hover:shadow-[0_0_32px_rgba(236,72,153,0.5)]"
                : "border border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.08] hover:border-purple-500/30",
            )}
          >
            <Link to="/register">
              {plan.cta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </motion.article>
  );
}

/** Single FAQ accordion item. */
function FaqRow({ item, delay = 0 }: { item: FaqItem; delay?: number }) {
  const ref = useFadeIn<HTMLDivElement>({ delay });
  const [open, setOpen] = useState(false);
  const answerId = `faq-answer-${item.q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div ref={ref} className="border-b border-border last:border-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={answerId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {item.q}
        {/* Single chevron that rotates 180° when open — no layout jump */}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={answerId}
            role="region"
            aria-label={item.q}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-7 text-muted-foreground">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────────────────────────────── main export ─── */

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();

  // Add .theme-ready after mount so the CSS color-transition rule only applies
  // after the initial theme has been set (prevents any transition on first paint).
  useEffect(() => {
    const t = setTimeout(() => {
      document.documentElement.classList.add("theme-ready");
    }, 100);
    return () => {
      clearTimeout(t);
      document.documentElement.classList.remove("theme-ready");
    };
  }, []);

  // ── Features ────────────────────────────────────────────────────────────
  const featLabelRef = useFadeIn<HTMLParagraphElement>({ delay: 0 });
  const featHeadRef  = useFadeIn<HTMLHeadingElement>({ delay: 80 });
  const featBodyRef  = useFadeIn<HTMLParagraphElement>({ delay: 160 });
  const reportRef    = useFadeIn<HTMLElement>({ delay: 280 });
  const statsRef     = useFadeIn<HTMLDListElement>({ delay: 0, threshold: 0.2 });

  // ── Workflow ─────────────────────────────────────────────────────────────
  const wfLabelRef = useFadeIn<HTMLParagraphElement>({ delay: 0 });
  const wfHeadRef  = useFadeIn<HTMLHeadingElement>({ delay: 80 });
  const wfBodyRef  = useFadeIn<HTMLParagraphElement>({ delay: 160 });
  const wfStepsRef = useFadeIn<HTMLOListElement>({ delay: 240 });
  const wfCtaRef   = useFadeIn<HTMLDivElement>({ delay: 360 });
  const wfPanelRef = useFadeIn<HTMLDivElement>({ delay: 180, distance: 48 });

  // ── Voice callout ────────────────────────────────────────────────────────
  const voiceRef = useFadeIn<HTMLElement>({ delay: 0, threshold: 0.15 });

  // ── Security ─────────────────────────────────────────────────────────────
  const secCardRef = useFadeIn<HTMLDivElement>({ delay: 0 });
  const secWhyRef  = useFadeIn<HTMLDivElement>({ delay: 140 });

  // ── FAQ ──────────────────────────────────────────────────────────────────
  const faqLabelRef = useFadeIn<HTMLParagraphElement>({ delay: 0 });
  const faqHeadRef  = useFadeIn<HTMLHeadingElement>({ delay: 80 });

  // ── Pricing ──────────────────────────────────────────────────────────────
  const prLabelRef = useFadeIn<HTMLParagraphElement>({ delay: 0 });
  const prHeadRef  = useFadeIn<HTMLHeadingElement>({ delay: 80 });
  const prBodyRef  = useFadeIn<HTMLParagraphElement>({ delay: 160 });
  const prNoteRef  = useFadeIn<HTMLParagraphElement>({ delay: 480 });

  // ── CTA / footer ─────────────────────────────────────────────────────────
  const ctaInnerRef    = useFadeIn<HTMLDivElement>({ delay: 0, threshold: 0.2 });
  const footerBrandRef = useFadeIn<HTMLDivElement>({ delay: 0, threshold: 0.15 });
  const footerBarRef   = useFadeIn<HTMLDivElement>({ delay: 200, threshold: 0.15 });

  return (
    <>
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-background text-foreground">

        {/* ══════════════════════════════════════════════════ NAV ═══ */}
        {/* Floating pill/capsule navbar matching Dimension visual design */}
        <header className="sticky top-4 z-40 mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-4 rounded-full border border-white/10 bg-[#0d0a16]/80 px-5 sm:px-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <Link to="/" aria-label="ReviewX home"><Brand /></Link>

            <nav aria-label="Primary navigation" className="hidden items-center gap-7 md:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-full text-muted-foreground hover:text-foreground hover:bg-white/[0.06]">
                <Link to="/auth">Sign in</Link>
              </Button>

              {/* Theme toggle — icon only, smooth Sun↔Moon crossfade */}
              <button
                type="button"
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                onClick={toggle}
                className="relative grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <Sun
                  className={cn(
                    "absolute size-4 transition-[opacity,transform] duration-200",
                    theme === "light"
                      ? "rotate-0 opacity-100"
                      : "rotate-90 opacity-0",
                  )}
                  aria-hidden="true"
                />
                <Moon
                  className={cn(
                    "absolute size-4 transition-[opacity,transform] duration-200",
                    theme === "dark"
                      ? "rotate-0 opacity-100"
                      : "-rotate-90 opacity-0",
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* Primary CTA — consistent "Start free" everywhere in nav/hero/closing band */}
              <Button asChild size="sm" className="rounded-full border-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 text-white font-medium shadow-[0_0_20px_rgba(217,70,239,0.35)] hover:from-violet-500 hover:via-fuchsia-400 hover:to-pink-400 hover:shadow-[0_0_28px_rgba(236,72,153,0.5)]">
                <Link to="/register">Start free</Link>
              </Button>
              <button
                type="button"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-white/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:hidden"
              >
                {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav
              id="mobile-menu"
              aria-label="Mobile navigation"
              className="mt-2 rounded-2xl border border-white/10 bg-[#0d0a16]/95 px-5 pb-4 pt-3 backdrop-blur-2xl shadow-2xl md:hidden"
            >
              <ul className="space-y-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li className="pt-2">
                  <Button asChild variant="outline" size="sm" className="w-full rounded-full border-white/10 bg-white/[0.04] text-foreground">
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
                  </Button>
                </li>
                <li className="pt-1">
                  <button
                    type="button"
                    aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                    onClick={() => { toggle(); setMobileMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
                  >
                    {theme === "dark"
                      ? <><Moon className="size-4" aria-hidden="true" /> Dark theme</>
                      : <><Sun  className="size-4" aria-hidden="true" /> Light theme</>
                    }
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </header>

        <main id="main-content">

          {/* ══════════════════════════════════════════════ HERO ═══ */}
          {/* bg: deep space-purple */}
          <section
            aria-labelledby="hero-heading"
            className="relative overflow-hidden px-5 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-32"
          >
            {/* Atmospheric pulsing glow */}
            <div
              aria-hidden="true"
              className="animate-glow-pulse pointer-events-none absolute inset-x-0 top-0 -z-10 h-[48rem] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.22),transparent)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_0%,black,transparent)]"
            />

            {/* Glowing horizon arc / light-sweep graphic inspired by Dimension */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-4 sm:top-2 -translate-x-1/2 -z-10 w-[1200px] max-w-[100vw] overflow-visible"
            >
              <svg
                viewBox="0 0 1200 600"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto opacity-75 dark:opacity-85"
              >
                <defs>
                  <linearGradient id="hero-arc-gradient" x1="100" y1="360" x2="1100" y2="360" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0" />
                    <stop offset="25%" stopColor="#8b5cf6" stopOpacity="0.85" />
                    <stop offset="52%" stopColor="#d946ef" stopOpacity="0.95" />
                    <stop offset="78%" stopColor="#ec4899" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                  </linearGradient>
                  <radialGradient id="hero-ambient-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.32" />
                    <stop offset="50%" stopColor="#d946ef" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#0a0812" stopOpacity="0" />
                  </radialGradient>
                  <filter id="arc-glow" x="-20%" y="-40%" width="140%" height="180%">
                    <feGaussianBlur stdDeviation="24" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="arc-soft-blur" x="-20%" y="-40%" width="140%" height="180%">
                    <feGaussianBlur stdDeviation="60" />
                  </filter>
                </defs>
                <ellipse cx="600" cy="360" rx="480" ry="180" fill="url(#hero-ambient-glow)" filter="url(#arc-soft-blur)" />
                <path
                  d="M 80 480 Q 600 220 1120 480"
                  stroke="url(#hero-arc-gradient)"
                  strokeWidth="3"
                  fill="none"
                  filter="url(#arc-glow)"
                />
                <path
                  d="M 180 500 Q 600 270 1020 500"
                  stroke="url(#hero-arc-gradient)"
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                  fill="none"
                  filter="url(#arc-glow)"
                />
              </svg>
            </div>

            <div className="mx-auto max-w-7xl">
              <div className="grid items-center gap-14 lg:grid-cols-2">
                <div>
                  <div className="animate-hero-1 pill-badge">
                    <Sparkles className="size-3 text-pink-400" aria-hidden="true" />
                    Static analysis · zero execution
                  </div>

                  <h1
                    id="hero-heading"
                    className="animate-hero-2 mt-7 max-w-xl text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl"
                  >
                    Ship safer code
                    <br />
                    <span className="gradient-text">with instant clarity.</span>
                  </h1>

                  <p className="animate-hero-3 mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
                    Paste or upload a source file. ReviewX scans it for security flaws, bugs,
                    quality issues, and performance problems in under two minutes — then
                    explains every finding and suggests a fix.
                  </p>

                  <div className="animate-hero-4 mt-8 flex flex-wrap items-center gap-3">
                    <Button asChild size="lg" className="rounded-full border-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 text-white font-medium shadow-[0_0_28px_rgba(217,70,239,0.4)] hover:from-violet-500 hover:via-fuchsia-400 hover:to-pink-400 hover:shadow-[0_0_36px_rgba(236,72,153,0.6)]">
                      <Link to="/register">
                        Start free
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-full border border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.08] hover:border-purple-500/30">
                      <Link to="/auth">Sign in to demo</Link>
                    </Button>
                  </div>

                  {/* Trust checkmarks — "code never executed" is the key trust signal */}
                  <div className="animate-hero-5 mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
                    {[
                      "Your code is never executed",
                      "No credit card required",
                      "Cancel anytime",
                    ].map((t) => (
                      <span key={t} className="flex items-center gap-1.5">
                        <Check className="size-3.5 text-success" aria-hidden="true" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="animate-hero-panel">
                  <HeroCodePanel />
                </div>
              </div>

              {/* ── Inline stat strip pulled up near fold ── */}
              <dl className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { stat: "94%",     desc: "Security findings caught" },
                  { stat: "< 2 min", desc: "Average review time"      },
                  { stat: "5",       desc: "Languages supported"       },
                  { stat: "89%",     desc: "Fix acceptance rate"       },
                ].map(({ stat, desc }) => (
                  <div key={desc} className="rounded-2xl border border-white/[0.08] bg-[#120f1c]/70 p-4 backdrop-blur-md transition-all hover:border-purple-500/30 hover:shadow-[0_0_24px_rgba(139,92,246,0.12)]">
                    <dd className="font-mono text-2xl font-semibold text-foreground">{stat}</dd>
                    <dt className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{desc}</dt>
                  </div>
                ))}
              </dl>

              {/* ── Supported language badges ── */}
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Works with
                </span>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <span
                    key={lang.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#120f1c]/70 px-3 py-1 font-mono text-[11px] font-semibold transition-colors hover:border-purple-500/30"
                  >
                    <span className={lang.color}>{lang.mono}</span>
                    <span className="text-muted-foreground">{lang.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════ FEATURES ═══ */}
          {/* bg: surface tint — first alternation */}
          <section
            id="features"
            aria-labelledby="features-heading"
            className="bg-surface/30 px-5 py-24 sm:px-6 lg:px-8"
          >
            <div className="mx-auto max-w-7xl">
              <div className="mx-auto max-w-2xl text-center">
                <p ref={featLabelRef} className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  Everything you need
                </p>
                <SectionHeading ref={featHeadRef} id="features-heading">
                  A review workflow built for real engineering teams.
                </SectionHeading>
                <p ref={featBodyRef} className="mt-4 text-sm leading-7 text-muted-foreground">
                  ReviewX covers the full loop from upload to patch — no context switching, no
                  extra tooling.
                </p>
              </div>

              <div className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {FEATURES.map((f, i) => (
                  <FeatureCard key={f.title} feature={f} index={i} />
                ))}
              </div>

              {/* Reports as its own feature card — not buried in a pricing bullet */}
              <article
                ref={reportRef}
                className="mt-4 flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#120f1c]/70 p-6 backdrop-blur-xl transition-all duration-300 hover:border-purple-500/40 hover:shadow-[0_0_35px_rgba(139,92,246,0.16)] sm:flex-row sm:items-start"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-500/15 to-pink-500/10 text-purple-300">
                  <Download className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{REPORT_FEATURE.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{REPORT_FEATURE.description}</p>
                </div>
              </article>

              {/* Stats strip — distinct from hero strip */}
              <dl ref={statsRef} className="mt-16 grid divide-y divide-white/[0.08] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                {[
                  { stat: "6+",      desc: "Finding categories checked" },
                  { stat: "5",       desc: "Languages supported"         },
                  { stat: "24+",     desc: "Built-in security rules"     },
                  { stat: "2 min",   desc: "Average review time"         },
                ].map(({ stat, desc }) => (
                  <div key={desc} className="px-6 py-5 first:pl-0 last:pr-0">
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{desc}</dt>
                    <dd className="mt-2 font-mono text-3xl font-semibold text-foreground">{stat}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* ══════════════════════════════════════════ WORKFLOW ═══ */}
          {/* bg: dark — second alternation */}
          <section
            id="workflow"
            aria-labelledby="workflow-heading"
            className="px-5 py-24 sm:px-6 lg:px-8"
          >
            <div className="mx-auto max-w-7xl">
              <div className="grid items-center gap-12 lg:grid-cols-2">
                <div>
                  <p ref={wfLabelRef} className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                    Workflow
                  </p>
                  <SectionHeading ref={wfHeadRef} id="workflow-heading">
                    Review in minutes, not in follow-ups.
                  </SectionHeading>
                  <p ref={wfBodyRef} className="mt-4 text-sm leading-7 text-muted-foreground">
                    One workflow from upload to patch: scan, assess, explain, and approve or
                    reject the suggested fix alongside your team.
                  </p>

                  <ol ref={wfStepsRef} className="mt-10 space-y-7" aria-label="Workflow steps">
                    {STEPS.map((step, i) => (
                      <li key={step.label}>
                        <WorkflowStep index={i} label={step.label} detail={step.detail} />
                      </li>
                    ))}
                  </ol>

                  <div ref={wfCtaRef} className="mt-10">
                    <Button asChild size="lg" className="rounded-full border-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 text-white font-medium shadow-[0_0_28px_rgba(217,70,239,0.4)] hover:from-violet-500 hover:via-fuchsia-400 hover:to-pink-400 hover:shadow-[0_0_36px_rgba(236,72,153,0.6)]">
                      <Link to="/register">
                        Start free
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div ref={wfPanelRef} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#120f1c]/80 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.4)]" aria-hidden="true">
                  <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#161224]/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      <WandSparkles className="size-3.5 text-purple-400" aria-hidden="true" />
                      Analysis status
                    </div>
                    <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-medium text-success">live</span>
                  </div>
                  <div className="grid gap-5 p-5 sm:grid-cols-[1fr_0.85fr]">
                    <ol className="space-y-2.5">
                      {[
                        "Parsing source",
                        "Analyzing patterns",
                        "Applying company rules",
                        "Generating AI explanations",
                        "Calculating score",
                      ].map((item, i) => (
                        <li key={item} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0c0915]/60 px-3 py-2">
                          <div className={cn(
                            "grid size-5 place-items-center rounded-full border font-mono text-[10px] font-semibold",
                            i < 4 ? "border-success/40 bg-success/15 text-success" : "border-purple-400/50 bg-purple-500/20 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]",
                          )}>
                            {i < 4 ? <Check className="size-3" /> : i + 1}
                          </div>
                          <span className="text-xs text-foreground">{item}</span>
                          {i === 4 && <span className="ml-auto size-1.5 animate-pulse rounded-full bg-pink-400" />}
                        </li>
                      ))}
                    </ol>
                    <div className="rounded-xl border border-white/[0.06] bg-[#161224]/60 p-4">
                      <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        <span>Progress</span>
                        <span className="font-mono font-semibold text-foreground">96%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 shadow-[0_0_12px_rgba(217,70,239,0.4)]" style={{ width: "96%" }} />
                      </div>
                      <div className="mt-5 space-y-3 text-xs">
                        {[{ l: "Security", v: 70 }, { l: "Bugs", v: 80 }, { l: "Quality", v: 85 }].map(({ l, v }) => (
                          <div key={l} className="flex justify-between">
                            <span className="text-muted-foreground">{l}</span>
                            <span className="font-mono text-foreground">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════ VOICE / VOXIDE ═══ */}
          {/* bg: surface tint */}
          <section
            ref={voiceRef}
            aria-labelledby="voice-heading"
            className="bg-[#0d0a16]/40 px-5 py-20 sm:px-6 lg:px-8"
          >
            <div className="mx-auto max-w-7xl">
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#120f1c]/80 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
                <div className="grid gap-0 lg:grid-cols-2">
                  {/* left: copy */}
                  <div className="p-8 sm:p-10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-purple-300">
                      <Mic className="size-3 text-pink-400" aria-hidden="true" />
                      Voxide — voice AI
                    </div>
                    <h2
                      id="voice-heading"
                      className="mt-5 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
                    >
                      Ask about a finding
                      <br />
                      out loud.
                    </h2>
                    <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
                      Click the mic on any finding and speak your question. Voxide transcribes
                      it, queries the AI context of that exact finding, and reads the answer
                      back — no typing, no tab-switching.
                    </p>
                    <ul className="mt-6 space-y-3">
                      {[
                        "Why is this flagged as critical?",
                        "Show me a safe version of this code.",
                        "What CWE does this map to?",
                      ].map((q) => (
                        <li key={q} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-purple-500/15 text-purple-300" aria-hidden="true">
                            <Check className="size-2.5" />
                          </span>
                          "{q}"
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* right: visual mock — bg-editor is always dark; all child colors hardcoded for dark surface */}
                  <div
                    className="flex flex-col items-center justify-center gap-6 border-t border-white/[0.06] bg-[#0c0915] p-10 lg:border-l lg:border-t-0"
                    aria-hidden="true"
                  >
                    {/* mic button mock */}
                    <div className="relative">
                      <div className="absolute inset-0 animate-ping rounded-full bg-pink-500/20" />
                      <button
                        type="button"
                        tabIndex={-1}
                        className="relative grid size-16 place-items-center rounded-full bg-gradient-to-tr from-violet-600 to-pink-600 text-white ring-4 ring-pink-500/20 shadow-[0_0_28px_rgba(217,70,239,0.45)]"
                      >
                        <Mic className="size-7" />
                      </button>
                    </div>
                    {/* transcript bubble — fixed dark-surface styling */}
                    <div className="max-w-[220px] rounded-xl border border-white/[0.08] bg-[#161224]/80 px-4 py-3">
                      <p className="font-mono text-[11px] text-purple-200">
                        "Why is this flagged as critical?"
                      </p>
                    </div>
                    {/* ai reply bubble — fixed dark-surface styling */}
                    <div className="max-w-[220px] rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                      <p className="text-[11px] leading-5 text-white/90">
                        This is a SQL injection risk (CWE-89). User input is
                        interpolated directly into the query string…
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] text-pink-400">
                        <Mic className="size-2.5" />
                        Voxide
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════ SECURITY ═══ */}
          {/* bg: dark */}
          <section
            id="security"
            aria-labelledby="security-heading"
            className="px-5 py-24 sm:px-6 lg:px-8"
          >
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div ref={secCardRef} className="rounded-2xl border border-white/[0.08] bg-[#120f1c]/75 backdrop-blur-xl p-7 sm:p-10 shadow-[0_16px_48px_rgba(0,0,0,0.4)] transition-all hover:border-purple-500/30 hover:shadow-[0_0_35px_rgba(139,92,246,0.12)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <SectionLabel>Security posture</SectionLabel>
                      <SectionHeading id="security-heading">
                        Visible risk. Clear action.
                      </SectionHeading>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-[11px] font-medium text-success">
                      <Lock className="size-3.5" aria-hidden="true" />
                      Secure by default
                    </span>
                  </div>
                  <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">
                    Every review is mapped to CWE categories, OWASP Top 10 (2021), and your
                    custom rule set — so findings are actionable, not just informational.
                    <strong className="block mt-3 font-medium text-foreground">
                      Your source code is never executed, stored, or used for model training.
                      Each review session is isolated and discarded after processing.
                    </strong>
                  </p>
                  <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                    {[
                      { value: "1", label: "Critical", cls: "text-critical" },
                      { value: "2", label: "High",     cls: "text-high"     },
                      { value: "3", label: "Other",    cls: "text-medium"   },
                    ].map((m) => (
                      <div key={m.label} className="rounded-xl border border-white/[0.08] bg-[#0c0915]/60 p-5">
                        <dd className={cn("font-mono text-4xl font-semibold", m.cls)}>{m.value}</dd>
                        <dt className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{m.label}</dt>
                      </div>
                    ))}
                  </dl>
                </div>

                <div ref={secWhyRef} className="rounded-2xl border border-white/[0.08] bg-[#120f1c]/75 backdrop-blur-xl p-7 shadow-[0_16px_48px_rgba(0,0,0,0.4)] transition-all hover:border-purple-500/30 hover:shadow-[0_0_35px_rgba(139,92,246,0.12)]">
                  <SectionLabel>Why teams switch</SectionLabel>
                  <ul className="mt-5 space-y-5" aria-label="Reasons to switch to ReviewX">
                    {[
                      "Catch SQL injection and unsafe auth patterns before merge",
                      "Get before/after fix guidance without reading full docs",
                      "Track risk trends across repos and company-level rules",
                      "Maintain audit trails with timestamped finding records",
                    ].map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success/15 text-success" aria-hidden="true">
                          <Check className="size-3" />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════ PRICING ═══ */}
          {/* bg: dark */}
          <section
            id="pricing"
            aria-labelledby="pricing-heading"
            className="px-5 py-24 sm:px-6 lg:px-8"
          >
            <div className="mx-auto max-w-7xl">
              <div className="mx-auto max-w-2xl text-center">
                <p ref={prLabelRef} className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  Simple pricing
                </p>
                <SectionHeading ref={prHeadRef} id="pricing-heading">
                  Build better software without slowing your team down.
                </SectionHeading>
                <p ref={prBodyRef} className="mt-4 text-sm text-muted-foreground">
                  All plans include a 14-day free trial. No credit card required.
                </p>
              </div>

              <div className="mt-12 grid gap-4 lg:grid-cols-3">
                {PLANS.map((plan, i) => (
                  <PlanCard key={plan.name} plan={plan} index={i} />
                ))}
              </div>

              <p ref={prNoteRef} className="mt-8 text-center text-xs text-muted-foreground">
                Need a custom volume plan?{" "}
                <a href="#" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Get in touch
                </a>
              </p>
            </div>
          </section>

          {/* ═══════════════════════════════════════ CTA BAND ═══ */}
          <section
            aria-labelledby="cta-heading"
            className="relative px-5 pb-24 pt-8 sm:px-6 lg:px-8 overflow-hidden"
          >
            {/* Atmospheric glow behind closing CTA */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 size-[600px] rounded-full bg-[radial-gradient(circle,rgba(217,70,239,0.15),transparent_70%)] blur-3xl"
            />
            <div className="mx-auto max-w-7xl">
              <div
                ref={ctaInnerRef}
                className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-gradient-to-br from-[#1b142e] via-[#120f1c] to-[#0a0812] px-8 py-14 sm:px-12 shadow-[0_24px_80px_rgba(0,0,0,0.6),0_0_50px_rgba(139,92,246,0.15)] backdrop-blur-xl"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-24 -top-24 size-[380px] rounded-full bg-gradient-to-br from-violet-600/20 via-pink-600/15 to-transparent blur-3xl"
                />
                <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-xl">
                    <SectionLabel>Ready to ship with confidence</SectionLabel>
                    <h2
                      id="cta-heading"
                      className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
                    >
                      Set your next release up for success.
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      Join the developers who use ReviewX to catch what manual review misses.
                      Free to start, no setup required, your code stays yours.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-3">
                    <Button asChild size="lg" className="rounded-full border-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 text-white font-medium shadow-[0_0_28px_rgba(217,70,239,0.4)] hover:from-violet-500 hover:via-fuchsia-400 hover:to-pink-400 hover:shadow-[0_0_36px_rgba(236,72,153,0.6)]">
                      <Link to="/register">
                        Start free
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-full border border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.08] hover:border-purple-500/30">
                      <Link to="/auth">Sign in</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════ FAQ ═══ */}
          {/* bg: dark — directly above footer */}
          <section
            id="faq"
            aria-labelledby="faq-heading"
            className="px-5 py-24 sm:px-6 lg:px-8"
          >
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
                <div>
                  <p ref={faqLabelRef} className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                    FAQ
                  </p>
                  <SectionHeading ref={faqHeadRef} id="faq-heading">
                    Common questions.
                  </SectionHeading>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    Can't find what you need?{" "}
                    <a href="#" className="font-medium text-foreground underline-offset-4 hover:underline">
                      Get in touch
                    </a>
                  </p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#120f1c]/70 backdrop-blur-xl divide-y divide-white/[0.06] px-6 shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
                  {FAQ.map((item, i) => (
                    <FaqRow key={item.q} item={item} delay={i * 60} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ════════════════════════════════════════════ FOOTER ═══ */}
        <footer
          aria-label="Site footer"
          className="border-t border-white/[0.08] bg-[#0a0812] px-5 py-16 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div ref={footerBrandRef} className="grid gap-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
              <div>
                <Link to="/" aria-label="ReviewX home"><Brand /></Link>
                <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
                  Automated static code review that catches what manual review misses.
                  Your code is never executed.
                </p>
                <div className="mt-5 flex items-center gap-3">
                  {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                    <a
                      key={label}
                      href={href}
                      aria-label={label}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid size-8 place-items-center rounded-full border border-white/[0.08] bg-white/[0.02] text-muted-foreground transition-all hover:border-purple-500/40 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>

              {FOOTER_LINKS.map((col) => (
                <div key={col.heading}>
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
                    {col.heading}
                  </p>
                  <ul className="space-y-3">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        {link.href.startsWith("/") ? (
                          <Link
                            to={link.href as "/privacy" | "/terms"}
                            className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {link.label}
                          </Link>
                        ) : (
                          <a
                            href={link.href}
                            className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {link.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div
              ref={footerBarRef}
              className="mt-14 flex flex-col gap-4 border-t border-border pt-8 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
            >
              <p>© {new Date().getFullYear()} ReviewX. All rights reserved.</p>
              <div className="flex flex-wrap items-center gap-5">
                <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
                <Link to="/terms"   className="transition-colors hover:text-foreground">Terms</Link>
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="size-3" aria-hidden="true" />
                  Code review, simplified
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
