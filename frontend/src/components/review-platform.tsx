import { toast } from "sonner";
import {
  useSubmitReviewMutation,
  useReviewQuery,
  useGenerateReportMutation,
  useDashboardMetricsQuery,
  useReviewsQuery,
  getReview,
  ApiClientError,
  type ReviewFinding,
  type DashboardReview,
  type DashboardFinding,
} from "@/lib/api";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Bot,
  Bug,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Code2,
  Command,
  CreditCard,
  Download,
  FileCode2,
  FileText,
  Gauge,
  History,
  Info,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Mic,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  TerminalSquare,
  Upload,
  User,
  Users,
  WandSparkles,
  X,
  Zap,
  LogOut,
} from "lucide-react";
import {
  Button,
  Input,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/components/primitives";
import { useReviewStore, type Role, type View } from "@/lib/review-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const Editor = lazy(() => import("@monaco-editor/react").then((m) => ({ default: m.Editor })));

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
type Finding = {
  id: string;
  title: string;
  severity: Severity;
  category: string;
  file: string;
  line: string;
  confidence: number;
  status: string;
  description: string;
};

function mapBackendFindingToUi(bf: ReviewFinding, index: number): Finding {
  const sevMap: Record<string, Severity> = {
    critical: "CRITICAL",
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
    info: "INFO",
  };
  const confMap: Record<string, number> = {
    high: 95,
    medium: 80,
    low: 60,
  };
  return {
    id: bf._id || bf.id || `FND-${1042 + index}`,
    title: bf.title || bf.ruleId || "Security Finding",
    severity: sevMap[bf.severity?.toLowerCase()] || "MEDIUM",
    category: bf.category ? bf.category.charAt(0).toUpperCase() + bf.category.slice(1) : "Security",
    file: bf.file || "src/code.ts",
    line: bf.line ? String(bf.line) : "1",
    confidence: confMap[bf.confidence?.toLowerCase()] || 90,
    status: bf.status ? bf.status.charAt(0).toUpperCase() + bf.status.slice(1) : "Detected",
    description: bf.description || bf.title,
  };
}

const defaultSource = "";

const severityClass: Record<Severity, string> = {
  CRITICAL: "severity-critical",
  HIGH: "severity-high",
  MEDIUM: "severity-medium",
  LOW: "severity-low",
  INFO: "severity-info",
};

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-sm border px-1.5 font-mono text-[10px] font-semibold",
        severityClass[severity],
      )}
    >
      {severity}
    </span>
  );
}

type NavGroup = { section: string; items: { view: View; label: string; icon: typeof Code2 }[] };

const personas: Record<
  Role,
  { name: string; email: string; initials: string; badge: string; context: string }
> = {
  member: {
    name: "Alex Morgan",
    email: "alex@acme.dev",
    initials: "AM",
    badge: "Member",
    context: "Acme Engineering / personal",
  },
  company: {
    name: "Dana Kim",
    email: "dana@acme.dev",
    initials: "DK",
    badge: "Company admin",
    context: "Acme Engineering / admin",
  },
  platform: {
    name: "Priya Shah",
    email: "priya@reviewx.dev",
    initials: "PS",
    badge: "Platform admin",
    context: "ReviewX / platform",
  },
};

const roleNav: Record<Role, NavGroup[]> = {
  member: [
    {
      section: "Workspace",
      items: [
        { view: "new", label: "New review", icon: Plus },
        { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { view: "history", label: "My reviews", icon: History },
      ],
    },
  ],
  company: [
    {
      section: "Workspace",
      items: [
        { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { view: "new", label: "New review", icon: Plus },
        { view: "history", label: "Company reviews", icon: History },
        { view: "rules", label: "Company rules", icon: ShieldCheck },
      ],
    },
    {
      section: "Organization",
      items: [
        { view: "company", label: "Members", icon: Users },
        { view: "billing", label: "Plans & billing", icon: CreditCard },
      ],
    },
  ],
  platform: [
    {
      section: "Platform",
      items: [
        { view: "admin", label: "Overview", icon: Activity },
        { view: "users", label: "Users", icon: Users },
        { view: "companies", label: "Companies", icon: Building2 },
        { view: "payments", label: "Payments", icon: CircleDollarSign },
        { view: "history", label: "All reviews", icon: History },
      ],
    },
    {
      section: "Preview",
      items: [
        { view: "new", label: "New review", icon: Plus },
        { view: "rules", label: "Rules engine", icon: ShieldCheck },
      ],
    },
  ],
};

export function ReviewPlatform() {
  const { view, setView, theme, setTheme, role, userName, userEmail } = useReviewStore();
  const [mobileNav, setMobileNav] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  // Derive context label and org name from role — no static personas map needed
  const roleBadge =
    role === "platform" ? "Platform admin"
    : role === "company" ? "Company admin"
    : "Member";

  const orgName =
    role === "platform" ? "ReviewX Platform" : "Acme Engineering";

  const headerSubtitle =
    role === "platform" ? "ReviewX / platform"
    : role === "company" ? "Acme Engineering / admin"
    : "Acme Engineering / personal";

  const nav = roleNav[role];
  const titles: Record<View, string> = {
    new: "New review",
    result: "Review result",
    finding: "Finding detail",
    dashboard: role === "company" ? "Company dashboard" : "Dashboard",
    history: role === "member" ? "My reviews" : "Review history",
    rules: "Company rules",
    company: "Members",
    billing: "Plans & billing",
    profile: "Profile",
    admin: "Platform overview",
    users: "Users",
    companies: "Companies",
    payments: "Payments",
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        aria-label="Site navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 border-r border-border bg-sidebar transition-transform lg:translate-x-0",
          mobileNav ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="grid size-7 place-items-center rounded bg-primary text-primary-foreground">
            <Code2 className="size-4" />
          </div>
          <span className="font-semibold">ReviewX</span>
          <span className="ml-auto rounded-sm border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
            BETA
          </span>
        </div>

        {/* Organisation context block — static per session, no switcher */}
        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2 rounded border border-border bg-surface-raised p-2">
            <div className="grid size-7 place-items-center rounded bg-accent text-xs font-semibold">
              {role === "platform" ? "RX" : "AC"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{orgName}</div>
              <div className="text-[10px] text-muted-foreground">{roleBadge}</div>
            </div>
          </div>
        </div>
        <nav className="space-y-6 p-3">
          {nav.map((group) => (
            <div key={group.section}>
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase text-muted-foreground">
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.view}
                    onClick={() => {
                      setView(item.view);
                      setMobileNav(false);
                    }}
                    className={cn(
                      "flex h-8 w-full items-center gap-2 rounded px-2 text-xs transition-colors",
                      view === item.view ||
                        (item.view === "new" && ["result", "finding"].includes(view))
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-3.5" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 flex items-center border-t border-border p-3 gap-1">
          <button
            onClick={() => setView("profile")}
            className="flex flex-1 items-center gap-2 rounded p-2 hover:bg-accent min-w-0"
          >
            <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {userName
                .split(" ")
                .map((n) => n[0] ?? "")
                .join("")
                .slice(0, 2)
                .toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-xs font-medium">{userName}</div>
              <div className="truncate text-[10px] text-muted-foreground">{userEmail}</div>
            </div>
          </button>
          <button
            type="button"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => useAuthStore.getState().logout()}
            className="grid size-8 shrink-0 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
          className="fixed inset-0 z-30 bg-overlay lg:hidden"
        />
      )}
      <main className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 lg:hidden"
            onClick={() => setMobileNav(true)}
          >
            <Menu />
          </Button>
          <div>
            <p className="text-sm font-semibold">{titles[view]}</p>
            <p className="hidden text-[10px] text-muted-foreground sm:block">{headerSubtitle}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button className="hidden h-8 w-56 items-center gap-2 rounded border border-border bg-surface px-2 text-xs text-muted-foreground md:flex">
              <Search className="size-3.5" />
              Search findings…
              <kbd className="ml-auto rounded border border-border px-1 font-mono text-[9px]">
                ⌘K
              </kbd>
            </button>
            <Button variant="ghost" size="icon" title="Notifications">
              <Bell />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] p-4 md:p-6">
          {view === "new" && <NewReview />}
          {view === "result" && <ReviewResult />}
          {view === "finding" && <FindingDetail />}
          {view === "dashboard" && (role === "company" ? <CompanyDashboard /> : <Dashboard />)}
          {view === "history" && <HistoryView />}
          {view === "rules" && <Rules />}
          {view === "company" && <Company />}
          {view === "billing" && <Billing />}
          {view === "profile" && <Profile />}
          {view === "admin" && <Admin />}
          {view === "users" && <UsersView />}
          {view === "companies" && <CompaniesView />}
          {view === "payments" && <PaymentsView />}
        </div>
      </main>
    </div>
  );
}

function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function NewReview() {
  const {
    analyzing,
    setAnalyzing,
    progress,
    setProgress,
    step,
    setStep,
    setView,
    activeReviewId,
    setActiveReviewId,
    activeReviewStatus,
    setActiveReviewStatus,
    setActiveReview,
  } = useReviewStore();

  const [language, setLanguage] = useState("typescript");
  const [fileName, setFileName] = useState("src/code.ts");
  const [code, setCode] = useState(defaultSource);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const stages = [
    "Parsing source & AST structure",
    "Running static security & bug analyzers",
    "Applying company rules & deduplication",
    "Synthesizing AI explanations & fixes",
    "Calculating score & finalizing report",
  ];

  const submitReviewMutation = useSubmitReviewMutation();

  // Resume polling on mount if an active review was in progress (survives refresh / navigate away)
  useEffect(() => {
    if (activeReviewId && activeReviewStatus && !["completed", "failed"].includes(activeReviewStatus)) {
      if (!analyzing) {
        setAnalyzing(true);
      }
    }
  }, [activeReviewId, activeReviewStatus, analyzing, setAnalyzing]);

  // Real-time polling query on getReview(activeReviewId) with 1500ms refetchInterval
  const isTerminal = activeReviewStatus === "completed" || activeReviewStatus === "failed";
  const shouldPoll = Boolean(activeReviewId) && analyzing && !isTerminal;

  const { data: polledReview, error: pollError } = useReviewQuery(activeReviewId, {
    enabled: shouldPoll,
    refetchInterval: (query) => {
      const current = query.state.data?.status;
      if (current === "completed" || current === "failed") {
        return false;
      }
      return 1500;
    },
  });

  // Map real backend status directly to the 5-step progress UI and percentage
  useEffect(() => {
    if (!polledReview) return;

    const currentStatus = polledReview.status;
    setActiveReviewStatus(currentStatus);

    switch (currentStatus) {
      case "pending":
        setStep(0);
        setProgress(5);
        break;
      case "parsing":
        setStep(0);
        setProgress(20);
        break;
      case "analyzing":
        setStep(1);
        setProgress(40);
        break;
      case "applying_rules":
        setStep(2);
        setProgress(60);
        break;
      case "generating_ai":
        setStep(3);
        setProgress(80);
        break;
      case "scoring":
        setStep(4);
        setProgress(95);
        break;
      case "completed":
        setStep(5);
        setProgress(100);
        setActiveReview(polledReview);
        toast.success("Code review completed!");
        const timer = window.setTimeout(() => {
          setAnalyzing(false);
          setView("result");
        }, 350);
        return () => clearTimeout(timer);
      case "failed":
        setPipelineError(polledReview.errorMessage || "The review pipeline failed during analysis.");
        toast.error(polledReview.errorMessage || "Review failed.");
        break;
      default:
        break;
    }
  }, [polledReview, setActiveReviewStatus, setStep, setProgress, setActiveReview, setAnalyzing, setView]);

  // Handle polling network error if any
  useEffect(() => {
    if (pollError) {
      const msg = pollError instanceof Error ? pollError.message : "Failed to fetch review status";
      setPipelineError(msg);
      toast.error(msg);
    }
  }, [pollError]);

  // Submit review: calls submitReview() via mutation
  const begin = async () => {
    setPipelineError(null);
    setAnalyzing(true);
    setProgress(5);
    setStep(0);

    if (!code.trim()) {
      toast.error("Please enter or upload code to analyze.");
      setAnalyzing(false);
      return;
    }

    try {
      const initial = await submitReviewMutation.mutateAsync({
        code,
        language,
        fileName,
      });

      // On 202 Accepted, store returned reviewId and status: "pending"
      setActiveReviewId(initial.reviewId);
      setActiveReviewStatus(initial.status || "pending");
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : "Failed to submit review request";
      setPipelineError(msg);
      toast.error(msg);
      setAnalyzing(false);
    }
  };

  const upload = (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "py") setLanguage("python");
    else if (ext === "js" || ext === "jsx") setLanguage("javascript");
    else if (ext === "ts" || ext === "tsx") setLanguage("typescript");
    else if (ext === "java") setLanguage("java");
    else if (ext === "php") setLanguage("php");
    file.text().then(setCode);
  };

  const handleRetry = () => {
    setPipelineError(null);
    setActiveReviewId(null);
    setActiveReviewStatus(null);
    setAnalyzing(false);
    setProgress(0);
    setStep(0);
  };

  if (analyzing) {
    if (pipelineError || activeReviewStatus === "failed") {
      return (
        <div className="mx-auto max-w-4xl py-8">
          <PageHeading
            title="Review Failed"
            subtitle="An error occurred while analyzing your source code."
          />
          <div className="panel p-6">
            <div className="flex items-start gap-4">
              <div className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground">Analysis Error</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pipelineError || polledReview?.errorMessage || "An unexpected error occurred in the analysis pipeline."}
                </p>
                <div className="mt-5 flex gap-3">
                  <Button onClick={handleRetry} variant="default">
                    Try again
                  </Button>
                  <Button
                    onClick={() => {
                      handleRetry();
                      setView("dashboard");
                    }}
                    variant="outline"
                  >
                    Back to dashboard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-4xl py-8">
        <PageHeading
          title="Review in progress"
          subtitle={`Analyzing ${fileName} against security, bugs, and company rules.`}
        />
        <div className="panel overflow-hidden">
          <div className="border-b border-border bg-editor px-5 py-3 font-mono text-xs text-code-muted">
            <span className="text-success">●</span> review://{fileName}
          </div>
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-5 text-right font-mono text-[10px] text-code-muted">
                    {i + 1}
                  </span>
                  <div
                    className={cn(
                      "skeleton h-3",
                      i % 3 === 0 ? "w-3/4" : i % 2 === 0 ? "w-1/2" : "w-5/6",
                    )}
                  />
                </div>
              ))}
            </div>
            <div>
              <div className="mb-5 flex items-center gap-3">
                <div className="relative grid size-12 place-items-center rounded-full border border-primary/30 bg-primary/10">
                  <LoaderCircle className="size-5 animate-spin text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Analyzing your code</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {progress}% complete
                  </p>
                </div>
              </div>
              <Progress value={progress} aria-label="Code analysis progress" className="mb-6 h-1" />
              <div className="space-y-1">
                {stages.map((s, i) => (
                  <div
                    key={s}
                    className={cn(
                      "flex items-center gap-3 rounded px-2 py-2.5 text-xs",
                      i === step && "bg-accent",
                      i > step && "text-muted-foreground",
                    )}
                  >
                    <div
                      className={cn(
                        "grid size-5 place-items-center rounded-full border",
                        i < step
                          ? "border-success bg-success text-success-foreground"
                          : i === step
                            ? "border-primary text-primary"
                            : "border-border",
                      )}
                    >
                      {i < step ? (
                        <Check className="size-3" />
                      ) : (
                        <span className="font-mono text-[9px]">{i + 1}</span>
                      )}
                    </div>
                    {s}
                    {i === step && (
                      <span className="ml-auto size-1.5 animate-pulse rounded-full bg-primary" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeading
        title="Start a code review"
        subtitle="Paste a source file or upload one to scan for security, correctness, quality, and performance."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <div className="flex items-center gap-2 font-mono text-xs">
              <FileCode2 className="size-3.5 text-muted-foreground" />
              <input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="bg-transparent text-foreground border-none outline-none font-mono text-xs w-48 hover:underline focus:underline"
                placeholder="file.ext"
              />
              {code.trim().length > 0 && <span className="size-1.5 rounded-full bg-warning" />}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Select value={language} onValueChange={(val) => {
                setLanguage(val);
                const ext = val === "python" ? "py" : val === "javascript" ? "js" : val === "java" ? "java" : val === "php" ? "php" : "ts";
                if (fileName.startsWith("src/code.")) {
                  setFileName(`src/code.${ext}`);
                }
              }}>
                <SelectTrigger className="h-7 w-32 font-mono text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="php">PHP</SelectItem>
                </SelectContent>
              </Select>
              <input
                ref={input}
                type="file"
                className="hidden"
                accept=".js,.ts,.py,.java,.php"
                onChange={(e) => upload(e.target.files?.[0])}
              />
              <Button variant="outline" size="sm" onClick={() => input.current?.click()}>
                <Upload />
                Upload file
              </Button>
            </div>
          </div>
          <div className="h-[560px] bg-editor">
            <Suspense
              fallback={
                <div className="grid h-full place-items-center text-xs text-muted-foreground">
                  Loading editor…
                </div>
              }
            >
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={(v) => setCode(v ?? "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontFamily: "JetBrains Mono",
                  fontSize: 13,
                  lineHeight: 22,
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: "on",
                }}
              />
            </Suspense>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="font-mono text-[10px] text-muted-foreground">
              UTF-8 · LF · {code.split("\n").length} lines
            </span>
            <Button onClick={begin} disabled={!code.trim()}>
              <WandSparkles />
              Start review
            </Button>
          </div>
        </section>
        <aside className="space-y-4">
          <div className="panel p-4">
            <h2 className="text-xs font-semibold">Review configuration</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase text-muted-foreground">
                  Ruleset
                </label>
                <Select defaultValue="acme">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acme">Acme production</SelectItem>
                    <SelectItem value="standard">ReviewX standard</SelectItem>
                    <SelectItem value="strict">OWASP strict</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <CheckRow label="Security analysis" />
              <CheckRow label="Bug detection" />
              <CheckRow label="Code quality" />
              <CheckRow label="Performance" />
            </div>
          </div>
          <div className="panel p-4">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <ShieldCheck className="size-4 text-success" />
              Private by default
            </div>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              Source is processed for this review only and isn’t used for model training.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function CheckRow({ label }: { label: string }) {
  return (
    <label className="flex items-center justify-between text-xs">
      <span>{label}</span>
      <Switch defaultChecked />
    </label>
  );
}

function ScoreRing({ score = 78, size = "large" }: { score?: number; size?: "large" | "small" }) {
  const r = size === "large" ? 48 : 28;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative", size === "large" ? "size-32" : "size-18")}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={size === "large" ? 8 : 6}
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--score)"
          strokeWidth={size === "large" ? 8 : 6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div
            className={cn("font-mono font-semibold", size === "large" ? "text-3xl" : "text-base")}
          >
            {score}
          </div>
          {size === "large" && (
            <div className="text-[9px] uppercase text-muted-foreground">Overall</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewResult() {
  const { severity, setSeverity, setSelectedFinding, setView, activeReview } = useReviewStore();
  const generateReportMutation = useGenerateReportMutation();

  const allFindings = useMemo(() => {
    if (activeReview?.findings && activeReview.findings.length > 0) {
      return activeReview.findings.map(mapBackendFindingToUi);
    }
    return [];
  }, [activeReview]);

  const visible = severity === "All" ? allFindings : allFindings.filter((f) => f.severity === severity);

  const handleDownloadReport = async (type: "json" | "pdf") => {
    if (!activeReview?.reviewId) {
      toast.info(`Generating ${type.toUpperCase()} report...`);
      const blob = new Blob([JSON.stringify(allFindings, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `review-report.${type}`;
      a.click();
      return;
    }

    try {
      toast.info(`Generating ${type.toUpperCase()} report...`);
      const report = await generateReportMutation.mutateAsync({
        reviewId: activeReview.reviewId,
        type,
      });

      if (report.storageUrl) {
        window.open(report.storageUrl, "_blank");
        toast.success(`${type.toUpperCase()} report ready!`);
      } else {
        toast.success(`Report generated`);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : "Failed to generate report";
      toast.error(msg);
    }
  };

  const reviewScore = activeReview?.score?.overall ?? activeReview?.score?.score ?? 0;
  const fileName = activeReview?.review?.fileName || activeReview?.fileName || "Code Review Result";
  const language = activeReview?.review?.language ? activeReview.review.language.charAt(0).toUpperCase() + activeReview.review.language.slice(1) : "Source";
  const reviewId = activeReview?.reviewId ? activeReview.reviewId.slice(-8).toUpperCase() : "REV";

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            onClick={() => setView("new")}
            className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            New review
          </button>
          <h1 className="text-xl font-semibold">{fileName}</h1>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            {reviewId} · {language} · completed · {allFindings.length} {allFindings.length === 1 ? "finding" : "findings"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Mic />
            Ask Voxide
          </Button>
          <Button variant="outline" onClick={() => handleDownloadReport("json")}>
            <FileText />
            JSON
          </Button>
          <Button variant="outline" onClick={() => handleDownloadReport("pdf")}>
            <Download />
            PDF Report
          </Button>
        </div>
      </div>

      <section className="panel mb-4 grid gap-6 p-5 lg:grid-cols-[150px_1fr_260px]">
        <div className="flex items-center justify-center">
          <ScoreRing score={reviewScore} />
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 self-center">
          <Metric label="Security" value={activeReview?.score?.security ?? (activeReview ? "--" : 0)} barValue={activeReview?.score?.security ?? 0} icon={ShieldAlert} />
          <Metric label="Bugs" value={activeReview?.score?.bugs ?? (activeReview ? "--" : 0)} barValue={activeReview?.score?.bugs ?? 0} icon={Bug} />
          <Metric label="Quality" value={activeReview?.score?.quality ?? (activeReview ? "--" : 0)} barValue={activeReview?.score?.quality ?? 0} icon={Code2} />
          <Metric label="Performance" value={activeReview?.score?.performance ?? (activeReview ? "--" : 0)} barValue={activeReview?.score?.performance ?? 0} icon={Zap} />
        </div>
        <div className="border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            Review summary
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <SummaryCount n={String(activeReview?.summary?.critical ?? 0)} label="Critical" s="CRITICAL" />
            <SummaryCount n={String(activeReview?.summary?.high ?? 0)} label="High" s="HIGH" />
            <SummaryCount n={String((activeReview?.summary?.medium ?? 0) + (activeReview?.summary?.low ?? 0))} label="Other" s="LOW" />
          </div>
          <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
            {activeReview?.aiAnalysis?.summary || (allFindings.length > 0 ? `${allFindings.length} findings detected across ${new Set(allFindings.map((f) => f.category)).size} categories.` : "Clean analysis. No findings detected.")}
          </p>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <h2 className="mr-3 text-sm font-semibold">
            Findings <span className="text-muted-foreground">{visible.length}</span>
          </h2>
          {["All", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={cn(
                "rounded border px-2 py-1 font-mono text-[10px]",
                severity === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
          <button className="ml-auto flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-muted-foreground">
            <BarChart3 className="size-3" />
            Category
          </button>
        </div>

        <div>
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="size-8 text-success mb-2" />
              <p className="font-semibold text-foreground">
                {allFindings.length === 0 ? "Clean bill of health!" : "No matching findings"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {allFindings.length === 0
                  ? "No security vulnerabilities, bugs, or performance issues detected."
                  : `No findings matching severity "${severity}".`}
              </p>
            </div>
          ) : (
            visible.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFinding(f.id)}
                className="group flex w-full items-start gap-3 border-b border-border px-4 py-4 text-left last:border-0 hover:bg-accent/40"
              >
                <span className={cn("mt-1 h-9 w-0.5 rounded-full", severityClass[f.severity])} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={f.severity} />
                    <span className="text-sm font-medium group-hover:text-primary">{f.title}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted-foreground">
                    <span>{f.category}</span>
                    <span>
                      {f.file}:{f.line}
                    </span>
                    <span>{f.confidence}% confidence</span>
                  </div>
                </div>
                <ChevronDown className="mt-2 size-4 -rotate-90 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </section>
    </>
  );
}

function Metric({
  label,
  value,
  barValue,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  barValue?: number;
  icon: typeof Code2;
}) {
  const barPct = typeof barValue === "number" ? barValue : typeof value === "number" ? value : 0;
  return (
    <div>
      <div className="mb-2 flex items-center text-xs">
        <Icon className="mr-2 size-3.5 text-muted-foreground" />
        {label}
        <span className="ml-auto font-mono font-semibold">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-score transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(barPct, 100))}%` }}
        />
      </div>
    </div>
  );
}

function SummaryCount({ n, label, s }: { n: string; label: string; s: Severity }) {
  return (
    <div>
      <div className={cn("font-mono text-lg font-semibold", severityClass[s])}>{n}</div>
      <div className="text-[9px] text-muted-foreground">{label}</div>
    </div>
  );
}

function CodeEvidence({ rawFinding, finding }: { rawFinding?: any; finding: Finding }) {
  const snippet = rawFinding?.evidence?.snippet || rawFinding?.snippet;
  const startLine = Number(rawFinding?.location?.startLine || finding.line || 1);

  if (snippet) {
    const lines = String(snippet).split("\n");
    return (
      <section className="panel overflow-hidden">
        <div className="border-b border-border px-4 py-3 text-xs font-semibold">Offending code</div>
        <div className="bg-editor py-3 font-mono text-xs">
          {lines.map((lineText: string, idx: number) => (
            <div key={idx} className="code-line code-critical">
              <span>{startLine + idx}</span>
              <code> {lineText}</code>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-border px-4 py-3 text-xs font-semibold">Code location</div>
      <div className="bg-editor px-4 py-3 font-mono text-xs text-muted-foreground">
        <span>{finding.file} : line {finding.line}</span>
      </div>
    </section>
  );
}

function FindingDetail() {
  const { selectedFinding, setView, findingStatuses, setFindingStatus, activeReview } = useReviewStore();
  const allFindings = useMemo(() => {
    if (activeReview?.findings && activeReview.findings.length > 0) {
      return activeReview.findings.map(mapBackendFindingToUi);
    }
    return [];
  }, [activeReview]);

  const f = allFindings.find((x) => x.id === selectedFinding) ?? allFindings[0];
  if (!f) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No finding selected.</p>
        <Button onClick={() => setView("result")} variant="outline" className="mt-4">
          <ArrowLeft className="size-3 mr-1" />
          Back to review result
        </Button>
      </div>
    );
  }

  const rawFinding: any = activeReview?.findings?.find((rf: any) => (rf._id || rf.id) === f.id);
  const status = findingStatuses[f.id] ?? f.status;
  const setStatus = (s: string) => setFindingStatus(f.id, s);

  const aiExplanation = rawFinding?.aiAnalysis?.explanation || rawFinding?.explanation || f.description;
  const fixDiff = rawFinding?.aiAnalysis?.fix || rawFinding?.aiAnalysis?.improvedCode || rawFinding?.fix || rawFinding?.suggestedFix;
  const rule = rawFinding?.ruleId || f.id;
  const cwe = rawFinding?.cwe || rawFinding?.cweId || null;
  const owasp = rawFinding?.owasp || null;

  return (
    <>
      <button
        onClick={() => setView("result")}
        className="mb-4 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Back to all findings
      </button>

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <section className="panel p-5">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={f.severity} />
              <span className="font-mono text-[10px] text-muted-foreground">{f.id}</span>
              <span className="ml-auto status-dot">{status}</span>
            </div>
            <h1 className="mt-4 text-xl font-semibold">{f.title}</h1>
            <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] text-muted-foreground">
              <span>
                {f.file}:{f.line}
              </span>
              <span>{f.category}</span>
              <span>{f.confidence}% confidence</span>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">{f.description}</p>
          </section>

          <CodeEvidence rawFinding={rawFinding} finding={f} />

          <section className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Bot className="size-4 text-ai" />
              <h2 className="text-xs font-semibold">Explanation</h2>
              {rawFinding?.aiAnalysis && (
                <span className="rounded border border-ai/30 bg-ai/10 px-1.5 py-0.5 text-[9px] text-ai">
                  AI-GENERATED
                </span>
              )}
            </div>
            <div className="p-5 text-sm leading-6 text-muted-foreground">
              <p>{aiExplanation}</p>
            </div>
          </section>

          {fixDiff && (
            <section className="panel overflow-hidden">
              <div className="flex items-center border-b border-border px-4 py-3">
                <h2 className="text-xs font-semibold">Suggested fix</h2>
              </div>
              <div className="h-52 bg-editor">
                <Suspense
                  fallback={
                    <div className="grid h-full place-items-center text-xs text-muted-foreground">
                      Loading editor…
                    </div>
                  }
                >
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language="typescript"
                    value={typeof fixDiff === "string" ? fixDiff : JSON.stringify(fixDiff, null, 2)}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontFamily: "JetBrains Mono",
                      fontSize: 12,
                      lineHeight: 21,
                      lineNumbers: "off",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </Suspense>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border p-3">
                <Button variant="outline" onClick={() => setStatus("False Positive")}>
                  <X />
                  Reject
                </Button>
                <Button onClick={() => setStatus("Accepted")}>
                  <Check />
                  Accept fix
                </Button>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="panel p-4">
            <h2 className="text-xs font-semibold">Finding status</h2>
            <div className="mt-3 space-y-2">
              {["Detected", "Accepted", "Resolved", "False Positive"].map((x) => (
                <button
                  onClick={() => setStatus(x)}
                  key={x}
                  className={cn(
                    "flex w-full items-center gap-2 rounded border px-3 py-2 text-xs",
                    status === x
                      ? "border-primary bg-primary/10"
                      : "border-border text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      status === x ? "bg-primary" : "bg-muted-foreground/30",
                    )}
                  />
                  {x}
                </button>
              ))}
            </div>
          </div>

          <button className="panel w-full p-4 text-left transition-colors hover:border-ai/50">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Mic className="size-4 text-ai" />
              Ask about this finding
            </div>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              Use Voxide to ask a voice question about the risk or suggested fix.
            </p>
          </button>

          <div className="panel p-4">
            <h2 className="text-xs font-semibold">Evidence & Rules</h2>
            <dl className="mt-3 space-y-3 text-[11px]">
              <div>
                <dt className="text-muted-foreground">Rule</dt>
                <dd className="mt-1 font-mono">{rule}</dd>
              </div>
              {cwe && (
                <div>
                  <dt className="text-muted-foreground">CWE</dt>
                  <dd className="mt-1 font-mono text-primary">{cwe}</dd>
                </div>
              )}
              {owasp && (
                <div>
                  <dt className="text-muted-foreground">OWASP</dt>
                  <dd className="mt-1 font-mono">{owasp}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Category</dt>
                <dd className="mt-1 font-mono">{f.category}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}


/* ─────────────────────── member dashboard data ─────────────────────── */

/** score → colour token */
function scoreColor(s: number) {
  if (s >= 80) return "text-success";
  if (s >= 60) return "text-warning";
  return "text-critical";
}
function scoreBg(s: number) {
  if (s >= 80) return "bg-success/10 text-success border-success/30";
  if (s >= 60) return "bg-warning/10 text-warning border-warning/30";
  return "bg-critical/10 text-critical border-critical/30";
}

/** Severity summary chips: "1 Critical · 2 High" inline. */
function SeveritySummary({
  counts,
}: {
  counts?: { critical: number; high: number; medium: number; low: number } | null;
}) {
  const parts: React.ReactNode[] = [];
  if (counts.critical > 0)
    parts.push(
      <span key="c" className="text-critical">
        {counts.critical} Critical
      </span>,
    );
  if (counts.high > 0)
    parts.push(
      <span key="h" className="text-high">
        {counts.high} High
      </span>,
    );
  if (counts.medium > 0)
    parts.push(
      <span key="m" className="text-medium">
        {counts.medium} Med
      </span>,
    );
  if (counts.low > 0)
    parts.push(
      <span key="l" className="text-low">
        {counts.low} Low
      </span>,
    );
  if (parts.length === 0)
    return <span className="text-success">No findings</span>;

  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px]">
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-muted-foreground">·</span>}
          {p}
        </React.Fragment>
      ))}
    </span>
  );
}

/** Full "Recent reviews" card for the Member dashboard. */
function RecentReviewsCard({
  reviews,
  onSelectReview,
}: {
  reviews: DashboardReview[];
  onSelectReview?: (id: string) => void;
}) {
  const { setView } = useReviewStore();
  return (
    <section className="panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Recent reviews</h2>
        <button
          type="button"
          onClick={() => setView("history")}
          className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          View all
        </button>
      </div>

      {/* Empty state */}
      {reviews.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <FileCode2 className="size-8 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No reviews yet</p>
          <Button size="sm" onClick={() => setView("new")}>
            <Plus />
            New review
          </Button>
        </div>
      ) : (
        /* Review rows */
        <div className="divide-y divide-border">
          {reviews.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-label={`Open review for ${r.name}, score ${r.score}`}
              onClick={() => (onSelectReview ? onSelectReview(r.id) : setView("result"))}
              className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/40"
            >
              {/* Language badge */}
              <span className="inline-flex h-6 min-w-[2.4rem] shrink-0 items-center justify-center rounded border border-border bg-surface font-mono text-[10px] font-semibold text-muted-foreground">
                {r.langBadge}
              </span>

              {/* File name + meta */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs font-medium text-foreground group-hover:text-primary">
                  {r.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {/* Severity summary */}
                  <SeveritySummary counts={r.severityCounts} />
                  {/* Separator dot */}
                  <span className="text-[10px] text-muted-foreground">·</span>
                  {/* Relative date */}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {r.relativeDate}
                  </span>
                </div>
              </div>

              {/* Score chip — right-aligned, color-coded */}
              <span
                className={cn(
                  "inline-flex h-7 min-w-[2.4rem] shrink-0 items-center justify-center rounded border font-mono text-xs font-semibold",
                  scoreBg(r.score),
                )}
              >
                {r.score}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Dashboard() {
  const { setView, setSelectedFinding, setActiveReview, userName } = useReviewStore();
  const { data: metricsData, isLoading } = useDashboardMetricsQuery();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const handleSelectReview = async (reviewId: string) => {
    try {
      const full = await getReview(reviewId);
      setActiveReview(full);
      setView("result");
    } catch {
      toast.error("Failed to load review details");
    }
  };

  const totalFindings = metricsData?.totalFindings ?? 0;
  const criticalCount = metricsData?.criticalCount ?? 0;
  const highCount     = metricsData?.highCount ?? 0;
  const mediumCount   = metricsData?.mediumCount ?? 0;
  const lowCount      = metricsData?.lowCount ?? 0;
  const resolvedPct   = metricsData?.resolvedPercentage ?? 100;
  const avgScore      = metricsData?.averageScore ?? 0;
  const totalReviews  = metricsData?.totalReviews ?? 0;
  const scoreTrendData = metricsData?.scoreTrend ?? [];
  const catHealth     = metricsData?.categoryHealth ?? { security: 100, bugs: 100, quality: 100, performance: 100 };
  const recentReviews = metricsData?.recentReviews ?? [];
  const openFindings  = metricsData?.openFindings ?? [];

  return (
    <>
      <PageHeading
        title={`${greeting}, ${(userName || "there").split(" ")[0]}`}
        subtitle="Real-time code health overview, open findings, and review analysis."
        action={
          <Button onClick={() => setView("new")}>
            <Plus />
            New review
          </Button>
        }
      />

      {/* ── KPI Grid ── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Gauge className="size-3.5" />Avg score</span>
            <span className="font-mono text-[10px] text-success">
              {avgScore > 0 ? "Overall health" : "No reviews yet"}
            </span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">
            {avgScore > 0 ? avgScore : "--"}
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-score transition-all duration-500"
              style={{ width: `${Math.min(avgScore, 100)}%` }}
            />
          </div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><FileText className="size-3.5" />My reviews</span>
            <span className="font-mono text-[10px] text-muted-foreground">Total</span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">
            {totalReviews}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {totalReviews === 1 ? "1 review analyzed" : `${totalReviews} reviews analyzed`}
          </div>
        </div>

        {/* Open Findings card — clickable, severity bar, empty state */}
        {totalFindings === 0 ? (
          /* Empty state — all clear */
          <div className="panel flex flex-col items-center justify-center gap-2 p-4 text-center">
            <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground">All clear</span>
            <span className="text-[10px] text-muted-foreground">No open findings</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setView("history")}
            className="panel group w-full p-4 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {/* Header row */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" />
                Open findings
              </span>
              <span className="font-mono text-[10px] text-critical">{criticalCount} critical</span>
            </div>

            {/* Big number */}
            <div className="mt-3 font-mono text-3xl font-semibold text-foreground">
              {totalFindings}
            </div>

            {/* Concise severity text — top 2 urgent only */}
            <div className="mt-1 flex items-center gap-2 text-[10px]">
              {criticalCount > 0 && (
                <span className="text-critical">{criticalCount} critical</span>
              )}
              {criticalCount > 0 && highCount > 0 && (
                <span className="text-muted-foreground">·</span>
              )}
              {highCount > 0 && (
                <span className="text-high">{highCount} high</span>
              )}
              {criticalCount === 0 && highCount === 0 && mediumCount > 0 && (
                <span className="text-medium">{mediumCount} medium</span>
              )}
            </div>

            {/* Segmented severity bar — full distribution */}
            <div className="mt-3 flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full">
              {criticalCount > 0 && (
                <div
                  className="h-full bg-critical"
                  style={{ width: `${(criticalCount / totalFindings) * 100}%` }}
                />
              )}
              {highCount > 0 && (
                <div
                  className="h-full bg-high"
                  style={{ width: `${(highCount / totalFindings) * 100}%` }}
                />
              )}
              {mediumCount > 0 && (
                <div
                  className="h-full bg-medium"
                  style={{ width: `${(mediumCount / totalFindings) * 100}%` }}
                />
              )}
              {lowCount > 0 && (
                <div
                  className="h-full bg-low"
                  style={{ width: `${(lowCount / totalFindings) * 100}%` }}
                />
              )}
            </div>
          </button>
        )}

        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5" />Resolved</span>
            <span className="font-mono text-[10px] text-success">
              {resolvedPct !== null ? "Resolution rate" : "No findings yet"}
            </span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">
            {resolvedPct !== null ? `${resolvedPct}%` : "--"}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {resolvedPct !== null ? "of detected findings" : "Awaiting review findings"}
          </div>
        </div>
      </div>

      {/* ── Score trend + Category health ── */}
      <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_300px]">
        <section className="panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Score trend</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {scoreTrendData.length > 0 ? `Last ${scoreTrendData.length} analyzed reviews` : "Recent reviews"}
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-semibold text-foreground">
                {avgScore > 0 ? avgScore : "--"}
              </div>
              <div className="text-[10px] text-success">
                {avgScore > 0 ? "Average" : "Awaiting reviews"}
              </div>
            </div>
          </div>
          {scoreTrendData.length === 0 ? (
            <div className="mt-6 flex h-40 flex-col items-center justify-center text-center text-xs text-muted-foreground">
              <FileCode2 className="mb-2 size-6 text-muted-foreground/40" />
              <span>No score history yet.</span>
              <span className="text-[10px]">Submit a code review to see trends here.</span>
            </div>
          ) : (
            <div className="mt-6 flex h-40 items-end gap-3">
              {scoreTrendData.map((d, i) => {
                const isLast = i === scoreTrendData.length - 1;
                return (
                  <div key={`${d.label}-${i}`} className="group flex flex-1 flex-col items-center gap-2">
                    <span className={cn(
                      "font-mono text-[9px] transition-colors",
                      isLast ? "text-primary" : "text-transparent group-hover:text-muted-foreground",
                    )}>
                      {d.score}
                    </span>
                    <div className="flex h-32 w-full items-end">
                      <div
                        className={cn(
                          "w-full rounded-t-sm transition-colors",
                          isLast ? "bg-primary" : "bg-primary/25 group-hover:bg-primary/50",
                        )}
                        style={{ height: `${Math.max(d.score, 4)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[9px] text-muted-foreground">{d.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Category health</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {catHealth ? "Across all your analyzed reviews" : "No review data yet"}
          </p>
          <div className="mt-5 space-y-4">
            <Metric label="Security"    value={catHealth ? catHealth.security : "--"} barValue={catHealth ? catHealth.security : 0} icon={ShieldAlert} />
            <Metric label="Bugs"        value={catHealth ? catHealth.bugs : "--"} barValue={catHealth ? catHealth.bugs : 0} icon={Bug} />
            <Metric label="Quality"     value={catHealth ? catHealth.quality : "--"} barValue={catHealth ? catHealth.quality : 0} icon={Code2} />
            <Metric label="Performance" value={catHealth ? catHealth.performance : "--"} barValue={catHealth ? catHealth.performance : 0} icon={Zap} />
          </div>
        </section>
      </div>

      {/* ── Recent Reviews card (full width, below score trend) ── */}
      <div className="mb-6">
        <RecentReviewsCard reviews={recentReviews} onSelectReview={handleSelectReview} />
      </div>

      {/* ── Open findings + Recent activity ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">
              Open findings
              <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                {openFindings.length}
              </span>
            </h2>
            <span className={cn(
              "inline-flex h-5 items-center rounded-sm border px-1.5 font-mono text-[9px] font-semibold",
              "severity-critical",
            )}>
              {criticalCount} CRITICAL
            </span>
          </div>
          <div className="divide-y divide-border">
            {openFindings.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="mb-2 size-6 text-success" />
                <span>No open findings detected</span>
              </div>
            ) : (
              openFindings.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedFinding(f.id);
                    if (f.reviewId) {
                      handleSelectReview(f.reviewId);
                    }
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                >
                  <SeverityBadge severity={f.severity} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{f.title}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {f.file} · {f.category}
                    </p>
                  </div>
                  <ChevronDown className="mt-0.5 size-3.5 shrink-0 -rotate-90 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <Button variant="ghost" size="sm" onClick={() => setView("history")}>
              View all
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                <FileCode2 className="mb-2 size-6 text-muted-foreground/40" />
                <span>No recent review activity</span>
              </div>
            ) : (
              recentReviews.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectReview(r.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                >
                  <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-medium text-foreground">{r.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {r.lang} · {r.date} · {r.findings} findings
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === "Needs attention" && (
                      <span className="hidden rounded-full bg-warning/10 px-2 py-0.5 text-[9px] font-medium text-warning sm:inline">
                        Attention
                      </span>
                    )}
                    <span className={cn(
                      "inline-flex h-6 min-w-[2.2rem] items-center justify-center rounded border font-mono text-xs font-semibold",
                      scoreBg(r.score),
                    )}>
                      {r.score}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  icon: typeof Code2;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center text-[11px] text-muted-foreground">
        <Icon className="mr-2 size-3.5" />
        {label}
      </div>
      <div className="mt-4 font-mono text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">{delta}</div>
    </div>
  );
}

function ReviewTable() {
  const { setView, setActiveReview } = useReviewStore();
  const { data: reviews = [], isLoading } = useReviewsQuery(50);

  const handleSelect = async (reviewId: string) => {
    try {
      const full = await getReview(reviewId);
      setActiveReview(full);
      setView("result");
    } catch {
      toast.error("Failed to load review details");
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Language</th>
            <th>Score</th>
            <th>Status</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {reviews.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                {isLoading ? "Loading reviews..." : "No reviews found. Submit your first code review to populate this list."}
              </td>
            </tr>
          ) : (
            reviews.map((r) => (
              <tr
                key={r.id}
                tabIndex={0}
                role="button"
                aria-label={`Open review for ${r.name}`}
                onClick={() => handleSelect(r.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleSelect(r.id)}
                className="cursor-pointer hover:bg-accent/30 transition-colors"
              >
                <td>
                  <span className="flex items-center gap-2 font-mono text-xs">
                    <FileCode2 className="size-3.5 text-muted-foreground" />
                    {r.name}
                  </span>
                </td>
                <td>{r.lang}</td>
                <td>
                  <span className={cn("font-mono font-semibold", scoreColor(r.score))}>{r.score}</span>
                </td>
                <td><span className="status-dot">{r.status}</span></td>
                <td>{r.date}</td>
                <td><ChevronDown className="size-3.5 -rotate-90 text-muted-foreground" /></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────── company admin dashboard data ─────────────────────── */

const members = [
  { name: "Alex Morgan",  email: "alex@acme.dev",  role: "Member",        reviews: 23, avg: 82, open: 7,  trend: "up"   },
  { name: "Dana Kim",     email: "dana@acme.dev",  role: "Company admin", reviews: 11, avg: 88, open: 2,  trend: "up"   },
  { name: "Sam Osei",     email: "sam@acme.dev",   role: "Member",        reviews: 31, avg: 76, open: 12, trend: "down" },
  { name: "Lena Park",    email: "lena@acme.dev",  role: "Member",        reviews: 18, avg: 91, open: 3,  trend: "up"   },
  { name: "Omar Faruk",   email: "omar@acme.dev",  role: "Member",        reviews: 9,  avg: 69, open: 10, trend: "down" },
];

const companyOpenFindings = [
  { member: "Sam Osei",  title: "Unsafe deserialization in upload handler", severity: "CRITICAL" as Severity, file: "upload.ts"    },
  { member: "Omar Faruk", title: "Hardcoded API key in config",             severity: "HIGH"     as Severity, file: "config.php"   },
  { member: "Omar Faruk", title: "Missing rate limiting on auth endpoint",  severity: "HIGH"     as Severity, file: "auth.ts"      },
  { member: "Alex Morgan", title: "Unsanitized input in SQL query",         severity: "CRITICAL" as Severity, file: "src/auth.ts" },
  { member: "Sam Osei",  title: "Unhandled promise rejection",              severity: "MEDIUM"   as Severity, file: "worker.ts"    },
];

const companyReviews = [
  { name: "billing/webhook.ts",  member: "Dana Kim",    lang: "TypeScript", score: 91, date: "Today, 14:32" },
  { name: "auth/session.py",     member: "Alex Morgan", lang: "Python",     score: 64, date: "Today, 10:08" },
  { name: "UserService.java",    member: "Lena Park",   lang: "Java",       score: 82, date: "Yesterday"    },
  { name: "upload.ts",           member: "Sam Osei",    lang: "TypeScript", score: 71, date: "Sep 16"       },
  { name: "config.php",          member: "Omar Faruk",  lang: "PHP",        score: 58, date: "Sep 15"       },
];

function CompanyDashboard() {
  const { setView } = useReviewStore();
  const critCount = companyOpenFindings.filter((f) => f.severity === "CRITICAL").length;

  return (
    <>
      <PageHeading
        title="Acme Engineering"
        subtitle="Team-wide code health, rule enforcement, and member activity."
        action={
          <Button onClick={() => setView("new")}>
            <Plus />
            New review
          </Button>
        }
      />

      {/* ── KPI cards ── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Gauge className="size-3.5" />Team avg score</span>
            <span className="font-mono text-[10px] text-success">↑ +3 this month</span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">80</div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-[80%] rounded-full bg-score" />
          </div>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><FileText className="size-3.5" />Team reviews</span>
            <span className="font-mono text-[10px] text-success">↑ 14 this week</span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">92</div>
          <div className="mt-1 text-[10px] text-muted-foreground">{members.length} active members</div>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><AlertTriangle className="size-3.5" />Open findings</span>
            <span className="font-mono text-[10px] text-critical">{critCount} critical</span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">34</div>
          <div className="mt-1 text-[10px] text-muted-foreground">across all members</div>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" />Active rules</span>
            <span className="font-mono text-[10px] text-muted-foreground">2 custom</span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">4</div>
          <div className="mt-1 text-[10px] text-muted-foreground">enforced on every review</div>
        </div>
      </div>

      {/* ── Member activity + Rule compliance ── */}
      <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_280px]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Member activity</h2>
            <Button variant="ghost" size="sm" onClick={() => setView("company")}>
              Manage
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Reviews</th>
                  <th>Avg score</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.email}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                          {m.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-foreground">{m.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{m.role}</td>
                    <td className="font-mono">{m.reviews}</td>
                    <td>
                      <span className={cn("font-mono font-semibold", scoreColor(m.avg))}>{m.avg}</span>
                    </td>
                    <td>
                      <span className={cn(
                        "font-mono text-xs font-semibold",
                        m.open >= 10 ? "text-critical" : m.open >= 5 ? "text-warning" : "text-success",
                      )}>
                        {m.open}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Rule compliance</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Pass rate across team reviews</p>
          <div className="mt-5 space-y-4">
            <Metric label="Security"    value={92} icon={ShieldAlert} />
            <Metric label="Bugs"        value={84} icon={Bug} />
            <Metric label="Quality"     value={88} icon={Code2} />
            <Metric label="Performance" value={71} icon={Zap} />
          </div>
          <Button variant="outline" size="sm" className="mt-5 w-full" onClick={() => setView("rules")}>
            <ShieldCheck />
            Manage rules
          </Button>
        </section>
      </div>

      {/* ── Critical findings + Recent reviews ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">
              Top open findings
              <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                {companyOpenFindings.length}
              </span>
            </h2>
            <span className={cn(
              "inline-flex h-5 items-center rounded-sm border px-1.5 font-mono text-[9px] font-semibold",
              "severity-critical",
            )}>
              {critCount} CRITICAL
            </span>
          </div>
          <div className="divide-y divide-border">
            {companyOpenFindings.map((f, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <SeverityBadge severity={f.severity} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{f.title}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {f.file} · {f.member}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent team reviews</h2>
            <Button variant="ghost" size="sm" onClick={() => setView("history")}>View all</Button>
          </div>
          <div className="divide-y divide-border">
            {companyReviews.map((r) => (
              <button
                key={r.name}
                onClick={() => setView("result")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
              >
                <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs font-medium text-foreground">{r.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {r.member} · {r.lang} · {r.date}
                  </p>
                </div>
                <span className={cn(
                  "inline-flex h-6 min-w-[2.2rem] items-center justify-center rounded border font-mono text-xs font-semibold",
                  scoreBg(r.score),
                )}>
                  {r.score}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

const platformUsers = [
  {
    name: "Alex Morgan",
    email: "alex@acme.dev",
    company: "Acme Engineering",
    plan: "Company",
    status: "Active",
  },
  {
    name: "Dana Kim",
    email: "dana@acme.dev",
    company: "Acme Engineering",
    plan: "Company",
    status: "Active",
  },
  {
    name: "Ravi Patel",
    email: "ravi@orbitlabs.io",
    company: "Orbit Labs",
    plan: "Pro",
    status: "Active",
  },
  { name: "Maya Chen", email: "maya@freelance.dev", company: "—", plan: "Free", status: "Active" },
  {
    name: "Jonas Weber",
    email: "jonas@pixelhaus.de",
    company: "Pixelhaus",
    plan: "Pro",
    status: "Suspended",
  },
];

function UsersView() {
  return (
    <>
      <PageHeading
        title="Users"
        subtitle="Every account on the platform, across all companies."
        action={
          <Button variant="outline">
            <Download />
            Export
          </Button>
        }
      />
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-border p-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search users or emails…" />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="company">Company</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Company</th>
                <th>Plan</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {platformUsers.map((u) => (
                <tr key={u.email}>
                  <td>
                    <div className="text-xs font-medium">{u.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{u.email}</div>
                  </td>
                  <td>{u.company}</td>
                  <td>
                    <span className="code-chip">{u.plan}</span>
                  </td>
                  <td>
                    <span className="status-dot">{u.status}</span>
                  </td>
                  <td>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const platformCompanies = [
  { name: "Acme Engineering", plan: "Company", members: 5, reviews: 92, mrr: "$79" },
  { name: "Orbit Labs", plan: "Pro", members: 2, reviews: 41, mrr: "$24" },
  { name: "Pixelhaus", plan: "Pro", members: 3, reviews: 27, mrr: "$24" },
  { name: "Northwind Traders", plan: "Company", members: 14, reviews: 210, mrr: "$79" },
];

function CompaniesView() {
  return (
    <>
      <PageHeading
        title="Companies"
        subtitle="Workspaces, seats, and subscription value."
        action={
          <Button>
            <Plus />
            Add company
          </Button>
        }
      />
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Plan</th>
                <th>Members</th>
                <th>Reviews</th>
                <th>MRR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {platformCompanies.map((c) => (
                <tr key={c.name}>
                  <td>
                    <span className="flex items-center gap-2 text-xs font-medium">
                      <Building2 className="size-3.5 text-muted-foreground" />
                      {c.name}
                    </span>
                  </td>
                  <td>
                    <span className="code-chip">{c.plan}</span>
                  </td>
                  <td className="font-mono">{c.members}</td>
                  <td className="font-mono">{c.reviews}</td>
                  <td className="font-mono font-semibold">{c.mrr}</td>
                  <td>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const platformPayments = [
  {
    id: "INV-2091",
    company: "Acme Engineering",
    amount: "$79.00",
    method: "Chapa",
    status: "Success",
    date: "Sep 18",
  },
  {
    id: "INV-2090",
    company: "Orbit Labs",
    amount: "$24.00",
    method: "Chapa",
    status: "Success",
    date: "Sep 17",
  },
  {
    id: "INV-2089",
    company: "Pixelhaus",
    amount: "$24.00",
    method: "Chapa",
    status: "Pending",
    date: "Sep 17",
  },
  {
    id: "INV-2088",
    company: "Northwind Traders",
    amount: "$79.00",
    method: "Chapa",
    status: "Success",
    date: "Sep 15",
  },
  {
    id: "INV-2087",
    company: "Pixelhaus",
    amount: "$24.00",
    method: "Chapa",
    status: "Failed",
    date: "Sep 12",
  },
];

function PaymentsView() {
  return (
    <>
      <PageHeading
        title="Payments"
        subtitle="Chapa transactions across every subscription."
        action={
          <Button variant="outline">
            <Download />
            Export
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="MRR" value="$206" delta="+$24 this week" icon={CircleDollarSign} />
        <Stat label="Successful" value="41" delta="last 30 days" icon={CheckCircle2} />
        <Stat label="Pending" value="2" delta="awaiting webhook" icon={Clock3} />
        <Stat label="Failed" value="3" delta="1 retry scheduled" icon={AlertTriangle} />
      </div>
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Company</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {platformPayments.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.id}</td>
                  <td>{p.company}</td>
                  <td className="font-mono font-semibold">{p.amount}</td>
                  <td>{p.method}</td>
                  <td>
                    <span className="status-dot">{p.status}</span>
                  </td>
                  <td>{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function HistoryView() {
  const { setView } = useReviewStore();
  return (
    <>
      <PageHeading
        title="Review history"
        subtitle="Browse, compare, and export every code review."
        action={
          <Button onClick={() => setView("new")}>
            <Plus />
            New review
          </Button>
        }
      />
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-border p-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search files or review ID…" />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All languages</SelectItem>
              <SelectItem value="ts">TypeScript</SelectItem>
              <SelectItem value="py">Python</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download />
            Export
          </Button>
        </div>
        <ReviewTable />
      </div>
    </>
  );
}
function Rules() {
  const [items, setItems] = useState([
    {
      name: "No raw SQL interpolation",
      cat: "Security",
      severity: "CRITICAL" as Severity,
      on: true,
    },
    {
      name: "Require structured logging",
      cat: "Quality",
      severity: "MEDIUM" as Severity,
      on: true,
    },
    { name: "Maximum function complexity", cat: "Quality", severity: "LOW" as Severity, on: false },
    {
      name: "Disallow synchronous I/O",
      cat: "Performance",
      severity: "HIGH" as Severity,
      on: true,
    },
  ]);
  return (
    <>
      <PageHeading
        title="Company rules"
        subtitle="Enforce engineering standards across every review."
        action={
          <Button>
            <Plus />
            Create rule
          </Button>
        }
      />
      <div className="panel overflow-hidden">
        <div className="border-b border-border p-3">
          <Input placeholder="Search rules…" className="max-w-sm" />
        </div>
        {items.map((r, i) => (
          <div
            key={r.name}
            className="flex flex-wrap items-center gap-3 border-b border-border p-4 last:border-0"
          >
            <Switch
              checked={r.on}
              onCheckedChange={(checked: boolean) =>
                setItems((items) =>
                  items.map((item, index) => (index === i ? { ...item, on: checked } : item)),
                )
              }
            />
            <div className="min-w-52 flex-1">
              <p className="text-sm font-medium">{r.name}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{r.cat} · Updated 3 days ago</p>
            </div>
            <SeverityBadge severity={r.severity} />
            <Button variant="ghost" size="icon">
              <MoreHorizontal />
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
function Company() {
  return (
    <>
      <PageHeading
        title="Acme Engineering"
        subtitle="Organization-wide review activity and member access."
        action={
          <Button>
            <User />
            Invite member
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Active members" value="18" delta="2 seats available" icon={Users} />
        <Stat label="Reviews this month" value="342" delta="+18% vs last month" icon={Activity} />
        <Stat label="Critical open" value="7" delta="Across 4 repositories" icon={ShieldAlert} />
      </div>
      <section className="panel mt-4 overflow-hidden">
        <div className="border-b border-border p-4 text-sm font-semibold">Members</div>
        {["Alex Morgan", "Maya Chen", "Theo James", "Nina Patel"].map((n, i) => (
          <div className="flex items-center gap-3 border-b border-border p-4 last:border-0" key={n}>
            <div className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold">
              {n
                .split(" ")
                .map((x) => x[0])
                .join("")}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium">{n}</p>
              <p className="text-[10px] text-muted-foreground">
                {n.toLowerCase().replace(" ", ".")}@acme.dev
              </p>
            </div>
            <span className="rounded border border-border px-2 py-1 text-[10px]">
              {i === 0 ? "Owner" : i === 1 ? "Admin" : "Member"}
            </span>
            <span className="status-dot">Active</span>
          </div>
        ))}
      </section>
    </>
  );
}
function Billing() {
  const [state, setState] = useState("idle");
  const plans = [
    {
      name: "Free",
      price: "$0",
      text: "For trying automated reviews",
      features: ["10 reviews / month", "Standard rules", "PDF reports"],
    },
    {
      name: "Pro",
      price: "$24",
      text: "For individual developers",
      features: ["Unlimited reviews", "Custom rules", "Priority analysis"],
    },
    {
      name: "Company",
      price: "$79",
      text: "For engineering teams",
      features: ["20 members included", "Shared dashboards", "Admin controls"],
    },
  ];
  return (
    <>
      <PageHeading
        title="Plans & billing"
        subtitle="Choose the review capacity that fits your team."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p, i) => (
          <div key={p.name} className={cn("panel p-5", i === 1 && "border-primary")}>
            <div className="flex items-center">
              <h2 className="font-semibold">{p.name}</h2>
              {i === 1 && (
                <span className="ml-auto rounded bg-primary px-2 py-0.5 text-[9px] font-semibold text-primary-foreground">
                  CURRENT
                </span>
              )}
            </div>
            <div className="mt-4">
              <span className="font-mono text-3xl font-semibold">{p.price}</span>
              <span className="text-xs text-muted-foreground"> / month</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{p.text}</p>
            <ul className="my-5 space-y-2">
              {p.features.map((x) => (
                <li key={x} className="flex items-center gap-2 text-xs">
                  <Check className="size-3.5 text-success" />
                  {x}
                </li>
              ))}
            </ul>
            <Button
              variant={i === 1 ? "outline" : "default"}
              className="w-full"
              onClick={() => setState(i === 1 ? "idle" : "pending")}
            >
              {i === 1 ? "Current plan" : "Choose plan"}
            </Button>
          </div>
        ))}
      </div>
      {state !== "idle" && (
        <div className="panel mt-4 flex items-center gap-4 p-5">
          <div className="grid size-10 place-items-center rounded-full bg-warning/10 text-warning">
            <Clock3 />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Payment pending</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Complete your secure Chapa checkout to activate the plan.
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => setState("idle")}>
              Cancel
            </Button>
            <Button onClick={() => setState("success")}>
              {state === "success" ? (
                <>
                  <Check />
                  Payment successful
                </>
              ) : (
                "Open Chapa"
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
function Profile() {
  const { userName, userEmail, role } = useReviewStore();
  const initials = userName
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
  const roleLabel =
    role === "platform" ? "Platform admin" : role === "company" ? "Company admin" : "Member";
  return (
    <>
      <PageHeading
        title="Profile"
        subtitle="Manage your personal details and review preferences."
      />
      <div className="grid max-w-4xl gap-4 md:grid-cols-[220px_1fr]">
        <div className="panel p-5 text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
            {initials}
          </div>
          <h2 className="mt-3 text-sm font-semibold">{userName}</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">{roleLabel}</p>
          <Button variant="outline" size="sm" className="mt-4">
            Change photo
          </Button>
        </div>
        <div className="panel p-5">
          <h2 className="text-sm font-semibold">Personal information</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={userName} />
            <Field label="Email" value={userEmail} />
            <Field label="Role" value={roleLabel} />
            <Field label="Default language" value="TypeScript" />
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20"
              onClick={() => useAuthStore.getState().logout()}
            >
              <LogOut className="mr-1.5 size-3.5" />
              Sign out
            </Button>
            <Button>Save changes</Button>
          </div>
        </div>
      </div>
    </>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="text-[11px] text-muted-foreground">
      {label}
      <Input defaultValue={value} className="mt-1.5 text-foreground" />
    </label>
  );
}
function Admin() {
  const { setView } = useReviewStore();

  const systemEvents = [
    { text: "Acme Engineering upgraded to Company plan",  time: "2m ago",  icon: "up"  },
    { text: "Review REV-8E21A completed · score 78",      time: "10m ago", icon: "rev" },
    { text: "New company registered: Northstar Labs",     time: "34m ago", icon: "co"  },
    { text: "Chapa payment confirmed · INV-2091 · ETB 10,270", time: "1h ago", icon: "pay" },
    { text: "Priya Shah signed in",                       time: "2h ago",  icon: "usr" },
    { text: "5 new users registered this morning",        time: "3h ago",  icon: "usr" },
  ];

  const topCompanies = [
    { name: "Northwind Traders", plan: "Company", members: 14, reviews: 210, health: 88 },
    { name: "Acme Engineering",  plan: "Company", members: 5,  reviews: 92,  health: 80 },
    { name: "Orbit Labs",        plan: "Pro",     members: 2,  reviews: 41,  health: 76 },
    { name: "Pixelhaus",         plan: "Pro",     members: 3,  reviews: 27,  health: 72 },
  ];

  const revenueData = [
    { month: "Apr", value: 58 },
    { month: "May", value: 63 },
    { month: "Jun", value: 71 },
    { month: "Jul", value: 68 },
    { month: "Aug", value: 79 },
    { month: "Sep", value: 84 },
  ];

  return (
    <>
      <PageHeading
        title="Platform overview"
        subtitle="System health, revenue, accounts, and recent activity."
      />

      {/* ── Platform KPIs ── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users className="size-3.5" />Total users</span>
            <span className="font-mono text-[10px] text-success">↑ +411 this month</span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">12.4k</div>
          <div className="mt-1 text-[10px] text-muted-foreground">328 companies</div>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><FileText className="size-3.5" />Reviews processed</span>
            <span className="font-mono text-[10px] text-success">99.97% completion</span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">482k</div>
          <div className="mt-1 text-[10px] text-muted-foreground">all time</div>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><CircleDollarSign className="size-3.5" />Monthly revenue</span>
            <span className="font-mono text-[10px] text-success">↑ +12.4%</span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">ETB 84k</div>
          <div className="mt-1 text-[10px] text-muted-foreground">19 paid companies</div>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Activity className="size-3.5" />System status</span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-success">
              <span className="size-1.5 rounded-full bg-success" />
              Operational
            </span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">100%</div>
          <div className="mt-1 text-[10px] text-muted-foreground">uptime this month</div>
        </div>
      </div>

      {/* ── Revenue trend + Quick actions ── */}
      <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_240px]">
        <section className="panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Revenue trend</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">ETB · last 6 months</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-semibold text-foreground">ETB 84k</div>
              <div className="text-[10px] text-success">Sep · current</div>
            </div>
          </div>
          <div className="mt-6 flex h-32 items-end gap-3">
            {revenueData.map((d, i) => {
              const isLast = i === revenueData.length - 1;
              const maxVal = Math.max(...revenueData.map((x) => x.value));
              return (
                <div key={d.month} className="group flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-24 w-full items-end">
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-colors",
                        isLast ? "bg-primary" : "bg-primary/25 group-hover:bg-primary/50",
                      )}
                      style={{ height: `${(d.value / maxVal) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground">{d.month}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Quick actions</h2>
          <div className="mt-4 space-y-2">
            {[
              { label: "View all users",     view: "users"     as const, icon: Users           },
              { label: "View companies",     view: "companies" as const, icon: Building2        },
              { label: "Payment history",    view: "payments"  as const, icon: CircleDollarSign },
              { label: "All reviews",        view: "history"   as const, icon: History          },
            ].map(({ label, view, icon: Icon }) => (
              <button
                key={view}
                onClick={() => setView(view)}
                className="flex w-full items-center gap-2.5 rounded border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground"
              >
                <Icon className="size-3.5 shrink-0" />
                {label}
                <ChevronDown className="-rotate-90 ml-auto size-3 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ── Top companies + Activity feed ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Top companies</h2>
            <Button variant="ghost" size="sm" onClick={() => setView("companies")}>View all</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Plan</th>
                  <th>Members</th>
                  <th>Reviews</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {topCompanies.map((c) => (
                  <tr key={c.name}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">{c.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="code-chip">{c.plan}</span>
                    </td>
                    <td className="font-mono">{c.members}</td>
                    <td className="font-mono">{c.reviews}</td>
                    <td>
                      <span className={cn("font-mono font-semibold text-xs", scoreColor(c.health))}>
                        {c.health}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <span className="flex items-center gap-1 text-[10px] text-success">
              <span className="size-1.5 rounded-full bg-success" />
              All systems operational
            </span>
          </div>
          <div className="divide-y divide-border">
            {systemEvents.map((e) => (
              <div key={e.text} className="flex items-center gap-3 px-4 py-3">
                <div className="grid size-7 shrink-0 place-items-center rounded bg-accent">
                  <Activity className="size-3.5" />
                </div>
                <span className="flex-1 text-xs text-foreground">{e.text}</span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{e.time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
