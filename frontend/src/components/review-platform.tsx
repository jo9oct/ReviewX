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
  Github,
  History,
  Info,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Mic,
  Moon,
  MoreHorizontal,
  Plus,
  RefreshCw,
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
import {
  createReview,
  createReport,
  getApiErrorResponse,
  getApiHealth,
  getGithubConnectUrl,
  getGithubConnectionUser,
  getGithubRepository,
  getReport,
  listGithubBranches,
  listGithubRepositories,
  formatFindingLine,
  getReview,
  listProjects,
  listAllReviews,
  listReviewReports,
  listScheduledReviews,
  getScheduledReview,
  createScheduledReview,
  cancelScheduledReview,
  type CreateReviewPayload,
  normalizeCategory,
  normalizeConfidence,
  normalizeSeverity,
  type ReviewDetails,
  type ReviewFinding,
  type ReviewReport,
  type ScheduledReview,
  type ProjectRecord,
  type ReviewIndexRecord,
  TIER_POLICIES,
  type SubscriptionTier,
} from "@/lib/review-api";
import { useReviewStore, type Role, type View } from "@/lib/review-store";
import { STORAGE_KEYS } from "@/lib/constants";
import { readSourceFilesFromZip } from "@/lib/zip-archive";
import { cn } from "@/lib/utils";

const Editor = lazy(() => import("@monaco-editor/react").then((m) => ({ default: m.Editor })));

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

function getEffectiveTier(role: Role, selectedTier: SubscriptionTier): SubscriptionTier {
  return role === "member" ? selectedTier : "enterprise";
}

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

const source = `import express from 'express';
import mysql from 'mysql2';

const app = express();
const db = mysql.createConnection(process.env.DATABASE_URL);

app.get('/api/users', async (req, res) => {
  const userId = req.query.id;
  const query = \`SELECT * FROM users WHERE id = \${userId}\`;
  const [rows] = await db.promise().query(query);
  res.json(rows);
});

app.post('/api/session', (req, res) => {
  const token = Buffer.from(req.body.password).toString('base64');
  res.cookie('session', token);
  res.sendStatus(201);
});

app.listen(3000);`;

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
        { view: "integrations", label: "Integrations", icon: Github },
        { view: "schedules", label: "Schedules", icon: Clock3 },
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
        { view: "integrations", label: "Integrations", icon: Github },
        { view: "schedules", label: "Schedules", icon: Clock3 },
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
        { view: "integrations", label: "Integrations", icon: Github },
        { view: "schedules", label: "Schedules", icon: Clock3 },
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
  const { view, setView, theme, setTheme, role, userName, userEmail, subscriptionTier, setSubscriptionTier } = useReviewStore();
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
    integrations: "Integrations",
    schedules: "Scheduled reviews",
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
          <img src="/my-icon.png" alt="" className="size-7 rounded object-contain" />
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
        <div className="absolute inset-x-0 bottom-0 border-t border-border p-3">
          <button
            onClick={() => setView("profile")}
            className="flex w-full items-center gap-2 rounded p-2 hover:bg-accent"
          >
            <div className="grid size-7 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
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
            <MoreHorizontal className="size-4 text-muted-foreground" />
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
            {role === "member" ? (
              <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="hidden sm:inline">Plan</span>
                <select
                  aria-label="Plan"
                  value={subscriptionTier}
                  onChange={(event) => setSubscriptionTier(event.target.value as SubscriptionTier)}
                  className="h-8 rounded border border-border bg-surface px-2 text-xs capitalize text-foreground"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
            ) : (
              <span className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground">Enterprise access</span>
            )}
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
        <div className="mx-auto max-w-375 p-4 md:p-6">
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
          {view === "integrations" && <Integrations />}
          {view === "schedules" && <Schedules />}
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

function apiFailure(error: unknown, fallback: string) {
  const details = getApiErrorResponse(error);
  return {
    error: error instanceof Error ? error.message : fallback,
    ...(details !== undefined ? { errorResponse: details } : {}),
  };
}

const mockRules = [
  { name: "OWASP Top 10", status: "Enabled", summary: "Covers injection, auth, and sensitive data exposure." },
  { name: "Security review", status: "Enabled", summary: "Runs with strict SQL and command injection checks." },
  { name: "Code quality", status: "Draft", summary: "Includes naming, duplication, and complexity guidance." },
];

const mockTeamMembers = [
  { name: "Alex Morgan", role: "Engineer", score: 88 },
  { name: "Dana Kim", role: "Security", score: 92 },
  { name: "Priya Shah", role: "Platform", score: 84 },
];

function Dashboard() {
  const { reviews, projects, setProjects, setActiveReview, setActiveReviewId, setReviews, setSelectedFinding, setView } = useReviewStore();
  const [reviewIndex, setReviewIndex] = useState<ReviewIndexRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latestReview = reviews[0];
  const latestFindings = latestReview?.findings.slice(0, 5) ?? [];
  const findingCount = reviews.reduce((total, item) => total + item.findings.length, 0);
  const completedCount = reviewIndex.filter((item) => item.status === "completed").length;
  const scoredReviews = reviewIndex.filter((item) => typeof item.score === "number");
  const averageScore = scoredReviews.length
    ? Math.round(scoredReviews.reduce((sum, item) => sum + Number(item.score), 0) / scoredReviews.length)
    : null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.allSettled([listProjects(), listAllReviews()])
      .then(([projectResult, reviewResult]) => {
        if (!active) return;
        const failures: string[] = [];
        if (projectResult.status === "fulfilled") setProjects(projectResult.value);
        else failures.push(projectResult.reason instanceof Error ? projectResult.reason.message : "Unable to load projects");
        if (reviewResult.status === "fulfilled") setReviewIndex(reviewResult.value.reviews);
        else failures.push(reviewResult.reason instanceof Error ? reviewResult.reason.message : "Unable to load reviews");
        if (failures.length) setError(failures.join(" · "));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setProjects]);

  const openReview = async (reviewId: string) => {
    try {
      setError(null);
      const detail = await getReview(reviewId);
      setActiveReviewId(reviewId);
      setActiveReview(detail);
      setReviews((current) => [detail, ...current.filter((item) => item.review.id !== reviewId)]);
      setView("result");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to open this review");
    }
  };

  const recentReviews = reviewIndex.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeading title="Dashboard" subtitle="Summary from reviews loaded from the backend during this session." />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Reviews", value: String(reviewIndex.length), detail: `${completedCount} completed` },
          { label: "Findings", value: String(findingCount), detail: "From loaded review details" },
          { label: "Average score", value: averageScore === null ? "—" : String(averageScore), detail: "Backend review scores" },
        ].map((item) => (
          <div key={item.label} className="panel p-4">
            <p className="text-[10px] uppercase text-muted-foreground">{item.label}</p>
            <div className="mt-3 text-2xl font-semibold">{item.value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent reviews</h2>
            <button type="button" onClick={() => setView("history")} className="text-[10px] text-muted-foreground">View all</button>
          </div>
          {error && <p role="alert" className="mb-3 rounded border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}</p>}
          {loading ? (
            <p className="rounded border border-border p-4 text-xs text-muted-foreground">Loading recent reviews…</p>
          ) : recentReviews.length === 0 ? (
            <p className="rounded border border-border p-4 text-xs text-muted-foreground">No review records are available yet.</p>
          ) : (
            <div className="space-y-3">
              {recentReviews.map((item) => {
                const reviewId = String(item.reviewId ?? item.id ?? item._id ?? "");
                const project = projects.find((record) => record.id === item.projectId);
                return (
                <button
                  key={reviewId}
                  type="button"
                  onClick={() => void openReview(reviewId)}
                  disabled={!reviewId}
                  className="flex w-full items-center justify-between rounded border border-border p-3 text-left hover:bg-accent/40"
                >
                  <div>
                    <div className="font-medium">{project?.name ?? "Project review"}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Date unavailable"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold">{item.score ?? "—"}</div>
                    <div className="text-[10px] capitalize text-muted-foreground">{item.status ?? "unknown"}</div>
                  </div>
                </button>
              );})}
            </div>
          )}
        </div>
        <div className="panel p-4">
          <h2 className="text-sm font-semibold">Recent findings</h2>
          <div className="mt-4 space-y-3">
            {latestFindings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No findings are available from a loaded review.</p>
            ) : latestFindings.map((finding, index) => {
              const severity = normalizeSeverity(finding.severity);
              const findingId = String(finding._id ?? finding.id ?? `${latestReview?.review.id ?? "review"}-${index}`);
              return (
                <button
                  key={findingId}
                  type="button"
                  onClick={() => {
                    if (!latestReview) return;
                    setActiveReviewId(latestReview.review.id);
                    setActiveReview(latestReview);
                    setSelectedFinding(findingId);
                  }}
                  className="w-full rounded border border-border p-3 text-left hover:bg-accent/40"
                >
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={severity} />
                    <span className="text-xs font-medium">{finding.title ?? "Review finding"}</span>
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground">{finding.filePath ?? "unknown"}:{formatFindingLine(finding.lineStart, finding.lineEnd)}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyDashboard() {
  return <Dashboard />;
}

function HistoryView() {
  const { projects, setProjects, setActiveReview, setActiveReviewId, setReviews, setSelectedFinding, setView, setApiResponse } = useReviewStore();
  const [reviewIndex, setReviewIndex] = useState<ReviewIndexRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.allSettled([listProjects(), listAllReviews()])
      .then(([projectResult, reviewResult]) => {
        if (!active) return;
        const messages: string[] = [];
        if (projectResult.status === "fulfilled") {
          setProjects(projectResult.value);
          setApiResponse("projects-list", { response: projectResult.value });
        } else {
          const message = projectResult.reason instanceof Error ? projectResult.reason.message : "Unable to load projects";
          messages.push(message);
          setApiResponse("projects-list", apiFailure(projectResult.reason, message));
        }
        if (reviewResult.status === "fulfilled") {
          setReviewIndex(reviewResult.value.reviews);
          setApiResponse("reviews-list", { response: reviewResult.value });
        } else {
          const message = reviewResult.reason instanceof Error ? reviewResult.reason.message : "Unable to load reviews";
          messages.push(message);
          setApiResponse("reviews-list", apiFailure(reviewResult.reason, message));
        }
        if (messages.length) setError(messages.join(" · "));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setApiResponse, setProjects]);

  const openProject = async (project: ProjectRecord) => {
    const latestReview = reviewIndex.find((review) => String(review.projectId ?? "") === project.id);
    const reviewId = String(latestReview?.reviewId ?? latestReview?.id ?? latestReview?._id ?? "");
    if (!reviewId) {
      setError("This project does not have a review record yet.");
      return;
    }
    try {
      setError(null);
      const nextReview = await getReview(reviewId);
      setApiResponse("GET /reviews/:reviewId", { request: { reviewId }, response: nextReview });
      setActiveReviewId(reviewId);
      setActiveReview(nextReview);
      setReviews((current) => [nextReview, ...current.filter((item) => item.review.id !== reviewId)]);
      setSelectedFinding("");
      setView("result");
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load selected review details";
      setError(message);
      setApiResponse("GET /reviews/:reviewId", { request: { reviewId }, ...apiFailure(loadError, message) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading title="My reviews" subtitle="Projects and their latest reviews loaded from your database." />
      {error && <div role="alert" className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</div>}
      {loading ? (
        <div className="panel p-8 text-center text-sm text-muted-foreground">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="panel p-8 text-center text-sm text-muted-foreground">No projects were returned from your database.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const projectReviews = reviewIndex.filter((review) => String(review.projectId ?? "") === project.id);
            const latest = projectReviews[0];
            const latestId = String(latest?.reviewId ?? latest?.id ?? latest?._id ?? "");
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => void openProject(project)}
                disabled={!latestId}
                className="panel space-y-3 p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">{project.name}</h2>
                  </div>
                  <span className="rounded border border-border px-2 py-0.5 text-[10px] capitalize">{project.sourceType}</span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                  <dt className="text-muted-foreground">Repository</dt><dd className="truncate">{project.repository?.owner && project.repository.name ? `${project.repository.owner}/${project.repository.name}` : "—"}</dd>
                  <dt className="text-muted-foreground">Default branch</dt><dd>{project.repository?.defaultBranch ?? "—"}</dd>
                  <dt className="text-muted-foreground">Created</dt><dd>{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "—"}</dd>
                  <dt className="text-muted-foreground">Updated</dt><dd>{project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : "—"}</dd>
                  <dt className="text-muted-foreground">Reviews</dt><dd>{projectReviews.length}</dd>
                </dl>
                <div className="border-t border-border pt-2 text-[10px] text-muted-foreground">
                  {latest ? `Latest review · ${latest.status ?? "unknown"}` : "No review for this project"}
                  <span className="float-right text-primary">{latestId ? "Open review →" : "No review yet"}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GitHubIntegrationWorkspace() {
  const { setActiveReview, setActiveReviewId, setView, setApiResponse } = useReviewStore();
  const [connectionId, setConnectionId] = useState(() =>
    typeof window === "undefined" ? "" : window.sessionStorage.getItem(STORAGE_KEYS.GITHUB_CONNECTION_ID) ?? "",
  );
  const [callbackJson, setCallbackJson] = useState("");
  const [githubUser, setGithubUser] = useState<{ login: string; name?: string | null } | null>(null);
  const [repositories, setRepositories] = useState<Awaited<ReturnType<typeof listGithubRepositories>>["repositories"]>([]);
  const [selectedRepository, setSelectedRepository] = useState("");
  const [branches, setBranches] = useState<Awaited<ReturnType<typeof listGithubBranches>>["branches"]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [repositoryInfo, setRepositoryInfo] = useState<Awaited<ReturnType<typeof getGithubRepository>>["repository"] | null>(null);
  const [health, setHealth] = useState<{ status: string; service: string; version: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    void getApiHealth()
      .then((result) => {
        if (active) {
          setHealth(result);
          setApiResponse("GET /health", { request: {}, response: result });
        }
      })
      .catch((healthError) => {
        if (active) {
          const message = healthError instanceof Error ? healthError.message : "Unable to reach the backend";
          setError(message);
          setApiResponse("GET /health", { request: {}, ...apiFailure(healthError, message) });
        }
      });
    return () => {
      active = false;
    };
  }, [setApiResponse]);

  useEffect(() => {
    if (!connectionId) {
      setGithubUser(null);
      setRepositories([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void getGithubConnectionUser(connectionId)
      .then((userResponse) => {
        if (!active) return;
        setGithubUser(userResponse.githubUser);
        setApiResponse("GET /github/connections/:connectionId/user", {
          request: { connectionId },
          response: userResponse,
        });
      })
      .catch((loadError) => {
        if (active) {
          const message = loadError instanceof Error ? loadError.message : "Unable to load GitHub user";
          setError(message);
          setApiResponse("GET /github/connections/:connectionId/user", { request: { connectionId }, ...apiFailure(loadError, message) });
        }
      })
    void listGithubRepositories(connectionId)
      .then((repositoryResponse) => {
        if (!active) return;
        setRepositories(repositoryResponse.repositories);
        setApiResponse("GET /github/connections/:connectionId/repositories", {
          request: { connectionId },
          response: repositoryResponse,
        });
      })
      .catch((loadError) => {
        if (active) {
          const message = loadError instanceof Error ? loadError.message : "Unable to load GitHub repositories";
          setError(message);
          setApiResponse("GET /github/connections/:connectionId/repositories", {
            request: { connectionId },
            ...apiFailure(loadError, message),
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [connectionId, refreshKey, setApiResponse]);

  const repository = repositories.find((item) => `${item.owner ?? ""}/${item.name}` === selectedRepository);

  useEffect(() => {
    if (!connectionId || !repository?.owner || !repository.name) {
      setBranches([]);
      setRepositoryInfo(null);
      return;
    }
    let active = true;
    setSelectedBranch(repository.defaultBranch ?? "");
    setRepositoryInfo(null);
    void listGithubBranches(connectionId, repository.owner, repository.name)
      .then((response) => {
        if (active) {
          setBranches(response.branches);
          setApiResponse("GET /github/connections/:connectionId/repositories/:owner/:name/branches", {
            request: { connectionId, owner: repository.owner, name: repository.name },
            response,
          });
        }
      })
      .catch((branchError) => {
        if (active) {
          const message = branchError instanceof Error ? branchError.message : "Unable to load repository branches";
          setError(message);
          setApiResponse("GET /github/connections/:connectionId/repositories/:owner/:name/branches", {
            request: { connectionId, owner: repository.owner, name: repository.name },
            ...apiFailure(branchError, message),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [connectionId, repository, setApiResponse]);

  const importCallbackResponse = () => {
    try {
      const parsed = JSON.parse(callbackJson) as {
        success?: boolean;
        data?: { connectionId?: string };
        connectionId?: string;
      };
      const id = parsed.data?.connectionId ?? parsed.connectionId;
      if (!parsed.success || !id) throw new Error("Callback JSON must contain success:true and data.connectionId.");
      window.sessionStorage.setItem(STORAGE_KEYS.GITHUB_CONNECTION_ID, id);
      setConnectionId(id);
      setSelectedRepository("");
      setError(null);
      setApiResponse("GET /github/callback", { request: { callbackResponse: parsed }, response: parsed });
    } catch (callbackError) {
      const message = callbackError instanceof Error ? callbackError.message : "Invalid GitHub callback response";
      setError(message);
      setApiResponse("GET /github/callback", { request: { callbackResponse: callbackJson }, ...apiFailure(callbackError, message) });
    }
  };

  const loadRepositoryDetails = async () => {
    const owner = repository?.owner ?? "";
    const name = repository?.name ?? "";
    const ref = selectedBranch || repository?.defaultBranch || "";
    if (!connectionId || !owner || !name) {
      setError("Connect GitHub and choose a repository.");
      return;
    }
    try {
      setError(null);
      const request = { connectionId, owner, name, ...(ref ? { ref } : {}) };
      const response = await getGithubRepository(connectionId, owner, name, ref || undefined);
      setApiResponse("GET /github/connections/:connectionId/repositories/:owner/:name", { request, response });
      setRepositoryInfo(response.repository);
    } catch (repositoryError) {
      const message = repositoryError instanceof Error ? repositoryError.message : "Unable to load repository details";
      setError(message);
      setApiResponse("GET /github/connections/:connectionId/repositories/:owner/:name", {
        request: { connectionId, owner, name, ...(ref ? { ref } : {}) },
        ...apiFailure(repositoryError, message),
      });
    }
  };

  const reviewRepository = async () => {
    const owner = repository?.owner ?? "";
    const name = repository?.name ?? "";
    const ref = selectedBranch || repository?.defaultBranch || "";
    if (!connectionId || !owner || !name) {
      setError("Connection ID, repository owner, and repository name are required.");
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const payload: CreateReviewPayload = {
        projectName: `${owner}/${name}`,
        source: {
          type: "github",
          connectionId,
          repository: {
            owner,
            name,
            ...(ref ? { ref } : {}),
          },
        },
        options: {
          securityAnalysis: true,
          bugDetection: true,
          codeQuality: true,
          performance: true,
        },
      };
      const result = await createReview(payload);
      setApiResponse("POST /reviews (GitHub source)", { request: payload, response: result });
      setActiveReviewId(result.review.id);
      setActiveReview(null);
      setView("result");
    } catch (reviewError) {
      const message = reviewError instanceof Error ? reviewError.message : "Unable to start a GitHub review";
      setError(message);
      setApiResponse("POST /reviews (GitHub source)", { ...apiFailure(reviewError, message) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading title="Integrations" subtitle="Connect GitHub and inspect repositories using the backend integration APIs." />
      {error && <div role="alert" className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</div>}
      <section className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Github className="size-5" />
            <div>
              <h2 className="text-sm font-semibold">GitHub</h2>
              <p className="text-xs text-muted-foreground">
                {githubUser ? `Connected as ${githubUser.login}` : "Authorize a short-lived backend connection to browse repositories."}
              </p>
            </div>
          </div>
          <a
            href={getGithubConnectUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            <Github className="size-4" /> Connect GitHub
          </a>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          The backend callback returns connection JSON in the authorization tab. Paste that response here to load its repositories.
        </p>
        <label className="block space-y-1 text-xs">
          <span className="text-muted-foreground">GitHub connection response</span>
          <textarea
            value={callbackJson}
            onChange={(event) => setCallbackJson(event.target.value)}
            placeholder={'Paste the callback response, e.g. {"success":true,"data":{"connectionId":"..."}}'}
            className="min-h-24 w-full rounded-md border border-input bg-background p-3 font-mono text-[10px]"
          />
        </label>
        <Button variant="outline" onClick={importCallbackResponse}>Use callback response</Button>
        <div className="flex flex-wrap gap-2">
          {connectionId && (
            <Button variant="outline" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>
              <RefreshCw /> Refresh
            </Button>
          )}
        </div>
      </section>
      <section className="panel space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Repositories</h2>
            <p className="text-xs text-muted-foreground">List repositories, branches, and repository source details from GitHub.</p>
          </div>
          <Button variant="outline" onClick={() => setRefreshKey((value) => value + 1)} disabled={!connectionId || loading}>Refresh repositories</Button>
          <span className="text-xs text-muted-foreground">{loading ? "Loading…" : `${repositories.length} loaded`}</span>
        </div>
        {!connectionId ? (
          <p className="text-xs text-muted-foreground">Connect GitHub to load repositories.</p>
        ) : repositories.length === 0 ? (
          <p className="text-xs text-muted-foreground">No repositories are available for this connection.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Repository</span>
              <select
                aria-label="GitHub repository"
                value={selectedRepository}
                onChange={(event) => setSelectedRepository(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3"
              >
                <option value="">Choose a repository</option>
                {repositories.map((item) => (
                  <option key={item.id ?? `${item.owner}/${item.name}`} value={`${item.owner ?? ""}/${item.name}`}>
                    {item.fullName ?? `${item.owner}/${item.name}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Branch</span>
              <select
                aria-label="GitHub branch"
                value={selectedBranch}
                onChange={(event) => setSelectedBranch(event.target.value)}
                disabled={!branches.length}
                className="h-9 w-full rounded-md border border-input bg-background px-3"
              >
                <option value="">Default branch</option>
                {branches.map((branch) => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
              </select>
            </label>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void loadRepositoryDetails()} disabled={!connectionId || !repository || loading}>Load repository details</Button>
          <Button onClick={() => void reviewRepository()} disabled={!connectionId || !repository || loading}>
          Start GitHub review
          </Button>
        </div>
        {repositoryInfo && (
          <div className="rounded border border-border p-3 text-xs">
            <div className="font-medium">{repositoryInfo.fullName ?? repositoryInfo.name}</div>
            {repositoryInfo.description && <p className="mt-1 text-muted-foreground">{repositoryInfo.description}</p>}
            <div className="mt-2 font-mono text-[10px] text-muted-foreground">
              {repositoryInfo.defaultBranch ? `Default branch: ${repositoryInfo.defaultBranch}` : "Repository details loaded"}
            </div>
          </div>
        )}
      </section>
      <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-xs font-semibold">Backend health</h2>
          <p className="text-xs text-muted-foreground">
            {health ? `${health.service} ${health.version} · ${health.status}` : "Health status unavailable"}
          </p>
        </div>
        <Button variant="outline" onClick={() => void getApiHealth().then((result) => {
          setHealth(result);
          setApiResponse("GET /health", { request: {}, response: result });
        }).catch((healthError) => {
          const message = healthError instanceof Error ? healthError.message : "Health check failed";
          setError(message);
          setApiResponse("GET /health", { request: {}, ...apiFailure(healthError, message) });
        })}>
          Check health
        </Button>
      </section>
      <section className="space-y-2">
      </section>
    </div>
  );
}

function Integrations() {
  const { role, subscriptionTier } = useReviewStore();
  const githubAllowed = TIER_POLICIES[getEffectiveTier(role, subscriptionTier)].githubIntegration;
  return (
    <section className="panel flex min-h-16 items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-3">
        <Github className="size-5 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold">GitHub</h2>
          <p className="text-xs text-muted-foreground">Authorize a short-lived backend connection to browse repositories.</p>
        </div>
      </div>
      {githubAllowed ? (
        <a
          href={getGithubConnectUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          <Github className="size-4" /> Connect GitHub
        </a>
      ) : (
        <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground" aria-label="Enterprise plan required for GitHub">
          <Github className="size-4" /> Enterprise plan required
        </span>
      )}
    </section>
  );
}

function Schedules() {
  const { scheduledReviews, setScheduledReviews, projects, setProjects, role, subscriptionTier, setApiResponse } = useReviewStore();
  const [reviewIndex, setReviewIndex] = useState<ReviewIndexRecord[]>([]);
  const [reviewId, setReviewId] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState("3600");
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const policy = TIER_POLICIES[getEffectiveTier(role, subscriptionTier)];
  const schedulesAllowed = policy.scheduledReviews;

  useEffect(() => {
    if (!schedulesAllowed) {
      setScheduledReviews([]);
      return;
    }
    let active = true;
    void listScheduledReviews()
      .then((items) => {
        if (active) {
          setScheduledReviews(items);
          setApiResponse("GET /scheduled-reviews", { response: items });
        }
      })
      .catch((loadError) => {
        if (active) {
          const message = loadError instanceof Error ? loadError.message : "Unable to load scheduled reviews";
          setError(message);
          setApiResponse("GET /scheduled-reviews", apiFailure(loadError, message));
        }
      });
    return () => {
      active = false;
    };
  }, [schedulesAllowed, setScheduledReviews, setApiResponse]);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([listAllReviews(), listProjects()])
      .then(([reviewsResult, projectsResult]) => {
        if (!active) return;
        if (reviewsResult.status === "fulfilled") setReviewIndex(reviewsResult.value.reviews);
        else setError(reviewsResult.reason instanceof Error ? reviewsResult.reason.message : "Unable to load reviews");
        if (projectsResult.status === "fulfilled") setProjects(projectsResult.value);
        else setError(projectsResult.reason instanceof Error ? projectsResult.reason.message : "Unable to load projects");
      });
    return () => {
      active = false;
    };
  }, [setProjects]);

  const createSchedule = async () => {
    if (!reviewId) {
      setError("Choose a review before creating a schedule.");
      return;
    }
    const interval = Number(intervalSeconds);
    if (!Number.isInteger(interval) || interval < 60) {
      setError("Schedule interval must be at least 60 seconds.");
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const request = { reviewId, intervalSeconds: interval };
      const created = await createScheduledReview(request);
      setApiResponse("POST /scheduled-reviews", { request, response: created });
      setScheduledReviews((current) => [created, ...current]);
      setSelectedSchedule(created);
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Unable to create scheduled review";
      setError(message);
      setApiResponse("POST /scheduled-reviews", { request: { reviewId, intervalSeconds: interval }, ...apiFailure(createError, message) });
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async (scheduleId: string) => {
    try {
      setError(null);
      const schedule = await getScheduledReview(scheduleId);
      setApiResponse("GET /scheduled-reviews/:scheduleId", { request: { scheduleId }, response: schedule });
      setSelectedSchedule(schedule);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load schedule details";
      setError(message);
      setApiResponse("GET /scheduled-reviews/:scheduleId", { request: { scheduleId }, ...apiFailure(loadError, message) });
    }
  };

  const cancelSchedule = async (scheduleId: string) => {
    const confirmed = window.confirm("Disable this schedule? It will remain in your schedule list as inactive.");
    if (!confirmed) return;
    try {
      setError(null);
      setLoading(true);
      const cancelled = await cancelScheduledReview(scheduleId);
      setApiResponse("DELETE /scheduled-reviews/:scheduleId", { request: { scheduleId }, response: cancelled });
      setScheduledReviews((current) => current.map((item) => item.scheduleId === scheduleId ? cancelled : item));
      setSelectedSchedule(cancelled);
    } catch (cancelError) {
      const message = cancelError instanceof Error ? cancelError.message : "Unable to cancel scheduled review";
      setError(message);
      setApiResponse("DELETE /scheduled-reviews/:scheduleId", { request: { scheduleId }, ...apiFailure(cancelError, message) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading title="Scheduled reviews" subtitle="Create, inspect, list, and disable recurring reviews from your backend data." />
      {error && <div role="alert" className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</div>}
      {!schedulesAllowed ? (
        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Enterprise feature</h2>
          <p className="mt-2 text-xs text-muted-foreground">Scheduled reviews are not included in the selected plan. Select Enterprise from the plan menu to preview this interface. The backend still enforces your account's actual plan.</p>
        </section>
      ) : (
      <>
      <section className="panel space-y-4 p-5">
        <h2 className="text-sm font-semibold">Create a schedule</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Review</span>
            <select value={reviewId} onChange={(event) => setReviewId(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3" aria-label="Review to schedule">
              <option value="">Choose a review</option>
              {reviewIndex.map((item) => {
                const id = String(item.reviewId ?? item.id ?? item._id ?? "");
                const project = projects.find((record) => record.id === item.projectId);
                return id ? <option key={id} value={id}>{project?.name ?? "Project"} · {item.status ?? "unknown"}</option> : null;
              })}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Interval (seconds)</span>
            <Input type="number" min={1} step={1} value={intervalSeconds} onChange={(event) => setIntervalSeconds(event.target.value)} />
          </label>
          <Button onClick={() => void createSchedule()} disabled={loading || !reviewId} className="self-end">Create schedule</Button>
        </div>
      </section>
      <section className="panel overflow-hidden">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Schedules ({scheduledReviews.length})</div>
        {scheduledReviews.length === 0 ? (
          <p className="p-5 text-xs text-muted-foreground">No scheduled reviews were returned.</p>
        ) : scheduledReviews.map((schedule) => (
          <div key={schedule.scheduleId} className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0", !schedule.enabled && "bg-destructive/5")}>
            <div>
              <div className={cn("text-xs font-medium", !schedule.enabled && "text-destructive")}>{!schedule.enabled && "INACTIVE"}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {projects.find((project) => project.id === reviewIndex.find((review) => (review.reviewId ?? review.id ?? review._id) === schedule.reviewId)?.projectId)?.name ?? "Project"} · every {schedule.intervalSeconds ?? "—"} seconds · {schedule.enabled ? "enabled" : "disabled"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void loadSchedule(schedule.scheduleId ?? "")} disabled={!schedule.scheduleId}>Details</Button>
              {schedule.enabled && <Button variant="outline" size="sm" onClick={() => void cancelSchedule(schedule.scheduleId ?? "")} disabled={loading || !schedule.scheduleId}>Disable</Button>}
            </div>
          </div>
        ))}
      </section>
      {selectedSchedule && (
        <section className="panel p-4">
          <h2 className="text-xs font-semibold">Schedule details</h2>
          <dl className="mt-2 grid gap-2 text-[10px] sm:grid-cols-2">
            <dt>Project</dt><dd>{projects.find((project) => project.id === reviewIndex.find((review) => (review.reviewId ?? review.id ?? review._id) === selectedSchedule.reviewId)?.projectId)?.name ?? "Project"}</dd>
            <dt>Interval</dt><dd>{selectedSchedule.intervalSeconds ?? "—"} seconds</dd>
            <dt>Next run</dt><dd>{selectedSchedule.nextRunAt ? new Date(selectedSchedule.nextRunAt).toLocaleString() : "—"}</dd>
            <dt>Last run</dt><dd>{selectedSchedule.lastRunAt ? new Date(selectedSchedule.lastRunAt).toLocaleString() : "—"}</dd>
            <dt>Status</dt><dd className={!selectedSchedule.enabled ? "text-destructive" : ""}>{selectedSchedule.enabled ? "Enabled" : "Inactive"}</dd>
            <dt>Created</dt><dd>{selectedSchedule.createdAt ? new Date(selectedSchedule.createdAt).toLocaleString() : "—"}</dd>
            <dt>Updated</dt><dd>{selectedSchedule.updatedAt ? new Date(selectedSchedule.updatedAt).toLocaleString() : "—"}</dd>
          </dl>
        </section>
      )}
      </>
      )}
    </div>
  );
}

function Rules() {
  return (
    <div className="space-y-6">
      <PageHeading title="Company rules" subtitle="Rules are shown from the latest active configuration. Mock data is used where the API is unavailable." />
      <div className="grid gap-4 md:grid-cols-3">
        {mockRules.map((rule) => (
          <div key={rule.name} className="panel p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{rule.name}</h3>
              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{rule.status}</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{rule.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Company() {
  return (
    <div className="space-y-6">
      <PageHeading title="Members" subtitle="Organization roster placeholder for unimplemented API-backed membership data." />
      <div className="panel overflow-hidden">
        {mockTeamMembers.map((member) => (
          <div key={member.name} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-accent text-xs font-semibold">{member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
              <div>
                <div className="text-sm font-medium">{member.name}</div>
                <div className="text-[10px] text-muted-foreground">{member.role}</div>
              </div>
            </div>
            <div className="font-mono text-sm font-semibold">{member.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Billing() {
  return (
    <div className="space-y-6">
      <PageHeading title="Plans & billing" subtitle="Billing and account information is currently served from local fallback data." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-4">
          <p className="text-[10px] uppercase text-muted-foreground">Current plan</p>
          <div className="mt-3 text-xl font-semibold">Business</div>
          <p className="mt-2 text-sm text-muted-foreground">Unlimited reviews and audit logs for the team.</p>
        </div>
        <div className="panel p-4">
          <p className="text-[10px] uppercase text-muted-foreground">Next invoice</p>
          <div className="mt-3 text-xl font-semibold">$149</div>
          <p className="mt-2 text-sm text-muted-foreground">Billed on Nov 12, 2026.</p>
        </div>
      </div>
    </div>
  );
}

function Profile() {
  return (
    <div className="space-y-6">
      <PageHeading title="Profile" subtitle="Profile data is shown with a local fallback while synced identity data is unavailable." />
      <div className="panel p-5">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">AM</div>
          <div>
            <div className="text-lg font-semibold">Alex Morgan</div>
            <div className="text-sm text-muted-foreground">alex@acme.dev</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Admin() {
  return (
    <div className="space-y-6">
      <PageHeading title="Platform overview" subtitle="Platform admin metrics currently use a mock fallback until API coverage is added." />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Active companies", value: "146" },
          { label: "Total reviews", value: "3.4k" },
          { label: "Success rate", value: "98.1%" },
        ].map((item) => (
          <div key={item.label} className="panel p-4">
            <p className="text-[10px] uppercase text-muted-foreground">{item.label}</p>
            <div className="mt-3 text-2xl font-semibold">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersView() {
  return <Company />;
}

function CompaniesView() {
  return <Company />;
}

function PaymentsView() {
  return <Billing />;
}

function NewReview() {
  const {
    analyzing,
    setAnalyzing,
    setView,
    setActiveReviewId,
    setActiveReview,
    setApiResponse,
    role,
    subscriptionTier,
  } = useReviewStore();
  const tier = getEffectiveTier(role, subscriptionTier);
  const policy = TIER_POLICIES[tier];
  const [language, setLanguage] = useState("typescript");
  const [code, setCode] = useState(source);
  const [projectName, setProjectName] = useState("api/users");
  const [filename, setFilename] = useState("api/users.ts");
  const [sourceMode, setSourceMode] = useState<"paste" | "upload" | "archive" | "github">("paste");
  const [githubConnectionId, setGithubConnectionId] = useState(() =>
    typeof window === "undefined" ? "" : window.sessionStorage.getItem(STORAGE_KEYS.GITHUB_CONNECTION_ID) ?? "",
  );
  const [githubRepositories, setGithubRepositories] = useState<Awaited<ReturnType<typeof listGithubRepositories>>["repositories"]>([]);
  const [githubBranches, setGithubBranches] = useState<Awaited<ReturnType<typeof listGithubBranches>>["branches"]>([]);
  const [selectedGithubRepository, setSelectedGithubRepository] = useState("");
  const [selectedGithubBranch, setSelectedGithubBranch] = useState("");
  const [githubCallbackResponse, setGithubCallbackResponse] = useState("");
  const [archiveFilename, setArchiveFilename] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Array<{ filename: string; content: string }>>([]);
  const [options, setOptions] = useState({
    securityAnalysis: true,
    bugDetection: true,
    codeQuality: true,
    performance: true,
  });
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const githubRepository = githubRepositories.find((item) => `${item.owner ?? ""}/${item.name}` === selectedGithubRepository);

  const importGithubConnection = () => {
    try {
      const parsed = JSON.parse(githubCallbackResponse) as { success?: boolean; data?: { connectionId?: string }; connectionId?: string };
      const connectionId = parsed.data?.connectionId ?? parsed.connectionId;
      if (!parsed.success || !connectionId) throw new Error("Paste the successful GitHub callback response.");
      window.sessionStorage.setItem(STORAGE_KEYS.GITHUB_CONNECTION_ID, connectionId);
      setGithubConnectionId(connectionId);
      setSelectedGithubRepository("");
      setError(null);
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : "Unable to use GitHub connection");
    }
  };

  useEffect(() => {
    if (sourceMode !== "github" || !githubConnectionId) return;
    let active = true;
    void listGithubRepositories(githubConnectionId)
      .then((response) => {
        if (active) {
          setGithubRepositories(response.repositories);
          setApiResponse("GET /github/connections/:connectionId/repositories", {
            request: { connectionId: githubConnectionId },
            response,
          });
        }
      })
      .catch((loadError) => {
        if (active) {
          const message = loadError instanceof Error ? loadError.message : "Unable to load GitHub repositories";
          setError(message);
          setApiResponse("GET /github/connections/:connectionId/repositories", {
            request: { connectionId: githubConnectionId },
            ...apiFailure(loadError, message),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [sourceMode, githubConnectionId, setApiResponse]);

  useEffect(() => {
    if (sourceMode !== "github" || !githubConnectionId || !githubRepository?.owner) {
      setGithubBranches([]);
      setSelectedGithubBranch("");
      return;
    }
    let active = true;
    setSelectedGithubBranch(githubRepository.defaultBranch ?? "");
    void listGithubBranches(githubConnectionId, githubRepository.owner, githubRepository.name)
      .then((response) => {
        if (active) {
          setGithubBranches(response.branches);
          setApiResponse("GET /github/connections/:connectionId/repositories/:owner/:name/branches", {
            request: { connectionId: githubConnectionId, owner: githubRepository.owner, name: githubRepository.name },
            response,
          });
        }
      })
      .catch((loadError) => {
        if (active) {
          const message = loadError instanceof Error ? loadError.message : "Unable to load GitHub branches";
          setError(message);
          setApiResponse("GET /github/connections/:connectionId/repositories/:owner/:name/branches", {
            request: { connectionId: githubConnectionId, owner: githubRepository.owner, name: githubRepository.name },
            ...apiFailure(loadError, message),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [sourceMode, githubConnectionId, githubRepository, setApiResponse]);

  const begin = async () => {
    if (sourceMode === "archive" && selectedFiles.length === 0) {
      setError("Choose a ZIP archive containing source files.");
      return;
    }
    if (sourceMode === "paste" && !code.trim()) {
      setError("Paste source code before starting the review.");
      return;
    }
    if (sourceMode === "upload" && selectedFiles.length === 0) {
      setError("Select at least one source file before starting the review.");
      return;
    }
    if (sourceMode === "github" && (!githubConnectionId || !githubRepository)) {
      setError("Connect GitHub and choose a repository before starting the review.");
      return;
    }
    const fileLimit = policy.maxFilesPerReview;
    const lineLimit = policy.maxLinesPerReview;
    const sourceFiles = sourceMode === "paste" ? [{ content: code }] : selectedFiles;
    const requestedLines = sourceFiles.reduce((total, file) => total + file.content.split(/\r\n|\r|\n/).length, 0);
    const fileCount = sourceMode === "github" ? 0 : sourceFiles.length;
    if (fileCount > fileLimit || requestedLines > lineLimit) {
      setError(`The selected ${tier} plan allows ${Number.isFinite(fileLimit) ? fileLimit : "unlimited"} files and ${Number.isFinite(lineLimit) ? lineLimit : "unlimited"} lines.`);
      return;
    }
    if (sourceMode === "archive" && !policy.archiveUpload) {
      setError("ZIP archive reviews are available on Pro and Enterprise plans.");
      return;
    }
    if (sourceMode === "github" && !policy.githubIntegration) {
      setError("GitHub reviews are available on the Enterprise plan.");
      return;
    }
    const requestFiles =
      sourceMode === "paste"
        ? [{ filename, path: filename, content: code }]
        : sourceMode === "github"
          ? []
          : sourceMode === "archive"
            ? selectedFiles.map((file) => ({ filename: file.filename, path: file.filename, content: file.content }))
            : selectedFiles.map((file, index) => ({
                filename: file.filename,
                path: file.filename,
                content: index === 0 ? code : file.content,
              }));
    if (!projectName.trim() || projectName.trim().length > 200 || filename.length > 512) {
      setError("Project name is required and must be 200 characters or fewer; source paths must be 512 characters or fewer.");
      return;
    }
    setError(null);
    setAnalyzing(true);

    try {
      const payload: CreateReviewPayload = {
        projectName,
        source:
          sourceMode === "paste"
            ? { type: "paste", content: code, filename, path: filename }
            : sourceMode === "github" && githubRepository
              ? {
                  type: "github",
                  connectionId: githubConnectionId,
                  repository: {
                    owner: githubRepository.owner ?? "",
                    name: githubRepository.name,
                    ...((selectedGithubBranch || githubRepository.defaultBranch) ? { ref: selectedGithubBranch || githubRepository.defaultBranch! } : {}),
                  },
                }
            : { type: sourceMode, filename: sourceMode === "archive" ? archiveFilename : filename, files: requestFiles },
        options,
      };
      const requestSize = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
      if (requestSize > 9 * 1024 * 1024) {
        throw new Error("The review request is too large for the backend's default 10 MB HTTP body limit. Reduce the source size.");
      }

      const result = await createReview(payload);
      setActiveReviewId(result.review.id);
      setActiveReview(null);
      setAnalyzing(false);
      setView("result");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start review";
      setError(message);
      setAnalyzing(false);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      if (sourceMode === "archive") {
        if (files.length !== 1 || !files[0]?.name.toLowerCase().endsWith(".zip")) {
          throw new Error("Select one .zip archive.");
        }
        const archive = files[0];
        const contents = await readSourceFilesFromZip(archive);
        setSelectedFiles(contents);
        setArchiveFilename(archive.name);
        setError(null);
        return;
      }
      const contents = await Promise.all(Array.from(files).map(async (file) => ({
        filename: file.webkitRelativePath || file.name,
        content: await file.text(),
      })));
      setSelectedFiles(contents);
      if (sourceMode === "upload") {
        setCode(contents[0]?.content ?? "");
        setFilename(contents[0]?.filename ?? "source");
      }
      setError(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to read the selected file");
    }
  };

  if (analyzing)
    return (
      <div className="mx-auto max-w-3xl py-12">
        <section className="panel flex items-center gap-4 p-8">
          <LoaderCircle className="size-7 animate-spin text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Submitting review</h1>
            <p className="mt-1 text-sm text-muted-foreground">Waiting for the backend to accept the review request. Analysis progress will follow the review status returned by the backend.</p>
          </div>
        </section>
      </div>
    );

  return (
    <>
      <PageHeading
        title="Start a code review"
        subtitle="Provide the project, source code, and analysis options. The backend enforces your plan limits."
      />
      {error && (
        <div className="mb-4 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
        <section className="panel overflow-hidden">
          <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Project name (required, up to 200 characters)</span>
              <Input required maxLength={200} value={projectName} onChange={(event) => setProjectName(event.target.value)} />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Source type</span>
              <select
                value={sourceMode}
                onChange={(event) => {
                  setSourceMode(event.target.value as typeof sourceMode);
                  setSelectedFiles([]);
                  setArchiveFilename("");
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3"
              >
                <option value="paste">Paste a single file</option>
                <option value="upload">Upload source files</option>
                <option value="archive" disabled={!policy.archiveUpload}>ZIP archive {!policy.archiveUpload ? "(Pro/Enterprise)" : ""}</option>
                <option value="github" disabled={!policy.githubIntegration}>GitHub repository {!policy.githubIntegration ? "(Enterprise)" : ""}</option>
              </select>
            </label>
          </div>
          <input
            ref={input}
            type="file"
            className="hidden"
            multiple={sourceMode === "upload"}
            accept={sourceMode === "archive" ? ".zip,application/zip" : ".js,.jsx,.ts,.tsx,.py,.java,.php,.go,.rs,.cs,.cpp,.c,.h,.rb,.swift,.kt,.sql,.json,.html,.css"}
            onChange={(event) => {
              void upload(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
          {sourceMode === "github" ? (
            <div className="space-y-4 p-4">
              {!githubConnectionId ? (
                <div className="space-y-3 rounded border border-border p-4">
                  <p className="text-xs text-muted-foreground">Authorize GitHub, then paste the callback response to load your repositories.</p>
                  <a href={getGithubConnectUrl()} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"><Github className="size-4" /> Connect GitHub</a>
                  <textarea value={githubCallbackResponse} onChange={(event) => setGithubCallbackResponse(event.target.value)} placeholder="Paste GitHub callback response" aria-label="GitHub callback response" className="min-h-20 w-full rounded-md border border-input bg-background p-3 font-mono text-xs" />
                  <Button variant="outline" onClick={importGithubConnection} disabled={!githubCallbackResponse.trim()}>Use connection</Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs">
                    <span className="text-muted-foreground">Repository</span>
                    <select
                      aria-label="GitHub repository for review"
                      value={selectedGithubRepository}
                      onChange={(event) => setSelectedGithubRepository(event.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3"
                    >
                      <option value="">Choose a repository</option>
                      {githubRepositories.map((item) => (
                        <option key={item.id ?? `${item.owner}/${item.name}`} value={`${item.owner ?? ""}/${item.name}`}>
                          {item.fullName ?? `${item.owner}/${item.name}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-muted-foreground">Branch</span>
                    <select
                      aria-label="GitHub branch for review"
                      value={selectedGithubBranch}
                      onChange={(event) => setSelectedGithubBranch(event.target.value)}
                      disabled={!githubBranches.length}
                      className="h-9 w-full rounded-md border border-input bg-background px-3"
                    >
                      <option value="">Use default branch</option>
                      {githubBranches.map((branch) => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
                    </select>
                  </label>
                </div>
              )}
              <div className="flex justify-end border-t border-border pt-3">
                <Button onClick={begin} disabled={!githubConnectionId || !githubRepository}>
                  <WandSparkles />
                  Start review
                </Button>
              </div>
            </div>
          ) : sourceMode === "archive" ? (
            <div className="space-y-4 p-5">
              <div className="rounded border border-dashed border-border p-6 text-center">
                <p className="text-sm font-medium">Select a ZIP archive</p>
                <p className="mt-1 text-xs text-muted-foreground">Source files are extracted and sent to the backend; the archive is not shown in the code editor.</p>
                <Button variant="outline" className="mt-3" onClick={() => input.current?.click()}>Choose .zip file</Button>
              </div>
              {archiveFilename && <p className="text-xs text-muted-foreground">{archiveFilename} · {selectedFiles.length} source files extracted</p>}
              {selectedFiles.length > 0 && (
                <ul className="max-h-48 space-y-1 overflow-auto rounded border border-border p-3 text-xs text-muted-foreground">
                  {selectedFiles.map((file) => <li key={file.filename} className="flex justify-between gap-3"><span className="truncate">{file.filename}</span><span>{file.content.split(/\r\n|\r|\n/).length} lines</span></li>)}
                </ul>
              )}
              <div className="flex justify-end">
                <Button onClick={begin} disabled={!selectedFiles.length}><WandSparkles />Start review</Button>
              </div>
            </div>
          ) : (
            <>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <div className="flex items-center gap-2 font-mono text-xs">
              <FileCode2 className="size-3.5 text-muted-foreground" />
              {filename}
              <span className="size-1.5 rounded-full bg-warning" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-7 w-32 font-mono text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="php">c++</SelectItem>
                </SelectContent>
              </Select>
              {sourceMode === "upload" && <Button variant="outline" size="sm" onClick={() => input.current?.click()}>
                <Upload />
                Select source files
              </Button>}
            </div>
          </div>
          <div className="h-140 bg-editor">
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
            <Button onClick={begin} disabled={sourceMode === "paste" ? !code.trim() : !selectedFiles.length}>
              <WandSparkles />
              Start review
            </Button>
          </div>
            </>
          )}
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
              <CheckRow label="Security analysis" checked={options.securityAnalysis} onCheckedChange={(checked) => setOptions((current) => ({ ...current, securityAnalysis: checked }))} />
              <CheckRow label="Bug detection" checked={options.bugDetection} onCheckedChange={(checked) => setOptions((current) => ({ ...current, bugDetection: checked }))} />
              <CheckRow label="Code quality" checked={options.codeQuality} onCheckedChange={(checked) => setOptions((current) => ({ ...current, codeQuality: checked }))} />
              <CheckRow label="Performance" checked={options.performance} onCheckedChange={(checked) => setOptions((current) => ({ ...current, performance: checked }))} />
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
      {sourceMode !== "paste" && selectedFiles.length > 0 && (
        <section className="panel mt-4 p-4">
          <h2 className="text-xs font-semibold">Selected source files ({selectedFiles.length})</h2>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {selectedFiles.map((file) => <li key={file.filename} className="flex justify-between gap-3"><span className="truncate">{file.filename}</span><span>{file.content.split(/\r\n|\r|\n/).length} lines</span></li>)}
          </ul>
        </section>
      )}
    </>
  );
}

function ReviewResult() {
  const {
    severity,
    setSeverity,
    setSelectedFinding,
    setView,
    activeReviewId,
    activeReview,
    setActiveReview,
    setReviews,
    reportList,
    setActiveReport,
    setReportList,
    setApiResponse,
    projects,
    setProjects,
    role,
    subscriptionTier,
  } = useReviewStore();
  const policy = TIER_POLICIES[getEffectiveTier(role, subscriptionTier)];
  const [reportFormat, setReportFormat] = useState<NonNullable<ReviewReport["format"]>>("json");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [projectListLoaded, setProjectListLoaded] = useState(false);

  const generateReport = async () => {
    const targetReviewId = activeReviewId;
    if (!targetReviewId) {
      setReportError("A review must be loaded before requesting a report.");
      return;
    }
    setReportError(null);
    setReportBusy(true);
    const request = { reviewId: targetReviewId, format: reportFormat };
    try {
      const created = await createReport(targetReviewId, reportFormat);
      setApiResponse("POST /reviews/:reviewId/reports", { request, response: created });
      setActiveReport(created);

      try {
        const reports = await listReviewReports(targetReviewId);
        setApiResponse("GET /reviews/:reviewId/reports", { request: { reviewId: targetReviewId }, response: reports });
        setReportList(reports);
        setActiveReport(reports[0] ?? created);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to list reports";
        setReportError(message);
        setApiResponse("GET /reviews/:reviewId/reports", {
          request: { reviewId: targetReviewId },
          ...apiFailure(error, message),
        });
      }

      if (created.reportId) {
        try {
          const latest = await getReport(created.reportId);
          setApiResponse("GET /reports/:reportId", { request: { reportId: created.reportId }, response: latest });
          setActiveReport(latest);
          setReportList((current) => current.some((item) => item.reportId === latest.reportId)
            ? current.map((item) => item.reportId === latest.reportId ? latest : item)
            : [latest, ...current]);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to load report details";
          setReportError(message);
          setApiResponse("GET /reports/:reportId", {
            request: { reportId: created.reportId },
            ...apiFailure(error, message),
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create report";
      setReportError(message);
      setApiResponse("POST /reviews/:reviewId/reports", {
        request,
        ...apiFailure(error, message),
      });
    } finally {
      setReportBusy(false);
    }
  };

  useEffect(() => {
    if (!activeReviewId) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const nextReview = await getReview(activeReviewId);
        if (cancelled) return;
        setApiResponse("GET /reviews/:reviewId", { request: { reviewId: activeReviewId }, response: nextReview });

        setActiveReview(nextReview);
        setReviews((prev) => {
          const exists = prev.some((review) => review.review.id === nextReview.review.id);
          return exists ? prev.map((review) => (review.review.id === nextReview.review.id ? nextReview : review)) : [nextReview, ...prev];
        });

        try {
          const nextReports = await listReviewReports(activeReviewId);
          if (!cancelled) {
            setApiResponse("GET /reviews/:reviewId/reports", { request: { reviewId: activeReviewId }, response: nextReports });
            setReportList(nextReports);
            setActiveReport(nextReports[0] ?? null);
          }
        } catch (reportError) {
          if (!cancelled) {
            setApiResponse("GET /reviews/:reviewId/reports", {
              request: { reviewId: activeReviewId },
              ...apiFailure(reportError, "Unable to load review reports"),
            });
            console.warn("No report available for this review yet.", reportError);
            setReportList([]);
            setActiveReport(null);
          }
        }

        if (nextReview.review.status !== "completed" && nextReview.review.status !== "failed") {
          window.setTimeout(poll, 1200);
          return;
        }
      } catch (error) {
        if (!cancelled) {
          setApiResponse("GET /reviews/:reviewId", {
            request: { reviewId: activeReviewId },
            ...apiFailure(error, "Unable to load review data"),
          });
          console.error("Unable to load review data", error);
        }
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [activeReviewId, setActiveReview, setReviews, setActiveReport, setReportList, setApiResponse]);

  useEffect(() => {
    if (projectListLoaded) return;
    let active = true;
    void listProjects()
      .then((items) => {
        if (active) {
          setProjects(items);
          setProjectListLoaded(true);
        }
      })
      .catch((loadError) => {
        if (active) {
          setProjectListLoaded(true);
          setReportError(loadError instanceof Error ? loadError.message : "Unable to load the project name");
        }
      });
    return () => {
      active = false;
    };
  }, [projectListLoaded, setProjects]);

  useEffect(() => {
    if ((reportFormat === "html" && !policy.htmlReport) || (reportFormat === "pdf" && !policy.pdfReport)) {
      setReportFormat("json");
    }
  }, [policy.htmlReport, policy.pdfReport, reportFormat]);

  const loadReportById = async (reportId: string) => {
    if (!reportId) {
      return;
    }
    try {
      setReportError(null);
      const report = await getReport(reportId);
      setApiResponse("GET /reports/:reportId", { request: { reportId }, response: report });
      setActiveReport(report);
      setReportList((current) => current.some((item) => item.reportId === report.reportId)
        ? current.map((item) => item.reportId === report.reportId ? report : item)
        : [report, ...current]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load report";
      setReportError(message);
      setApiResponse("GET /reports/:reportId", { request: { reportId }, ...apiFailure(error, message) });
    }
  };

  const reviewFindings = useMemo(() => {
    if (!activeReview) return [] as Finding[];
    return activeReview.findings.map((finding, index) => ({
      id: String(finding._id ?? finding.id ?? `${activeReview.review.id}-${index}`),
      title: finding.title ?? "Review finding",
      severity: normalizeSeverity(finding.severity) as Severity,
      category: normalizeCategory(finding.category),
      file: finding.filePath ?? "unknown",
      line: formatFindingLine(finding.lineStart, finding.lineEnd),
      confidence: normalizeConfidence(finding.confidence),
      status: finding.status ?? "open",
      description: finding.description ?? "No description available.",
    }));
  }, [activeReview]);

  const visible = severity === "All" ? reviewFindings : reviewFindings.filter((f) => f.severity === severity);
  const scoreValue = Math.round(Number(activeReview?.score?.overall ?? 0) || 0);
  const securityScore = Math.round(Number(activeReview?.score?.security ?? 0) || 0);
  const bugScore = Math.round(Number(activeReview?.score?.bugs ?? 0) || 0);
  const qualityScore = Math.round(Number(activeReview?.score?.quality ?? 0) || 0);
  const performanceScore = Math.round(Number(activeReview?.score?.performance ?? 0) || 0);
  const counts = reviewFindings.reduce(
    (acc, finding) => {
      acc[finding.severity] += 1;
      return acc;
    },
    { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 } as Record<Severity, number>,
  );
  const otherCount = reviewFindings.length - counts.CRITICAL - counts.HIGH - counts.MEDIUM - counts.LOW - counts.INFO;
  const criticalCount = activeReview?.review.findingCounts?.["critical"] ?? counts.CRITICAL;
  const highCount = activeReview?.review.findingCounts?.["high"] ?? counts.HIGH;
  const mediumCount = activeReview?.review.findingCounts?.["medium"] ?? counts.MEDIUM;
  const lowCount = activeReview?.review.findingCounts?.["low"] ?? counts.LOW;
  const infoCount = activeReview?.review.findingCounts?.["info"] ?? counts.INFO;
  const projectName = projects.find((project) => project.id === activeReview?.review.projectId)?.name ?? "Project review";
  const aiEntries = activeReview?.aiAnalysis ?? [];
  const aiSummary = aiEntries.map((entry) => entry.result?.summary?.summary).find((summary) => Boolean(summary?.trim()));
  const aiRiskAreas = [...new Set(aiEntries.flatMap((entry) => [...(entry.result?.summary?.riskAreas ?? []), ...(entry.result?.riskAreas ?? [])]))];
  const aiPriorities = [...new Set(aiEntries.flatMap((entry) => [...(entry.result?.summary?.priorities ?? []), ...(entry.result?.priorities ?? [])]))];

  if (!activeReview) {
    return (
      <div className="panel p-10 text-center text-sm text-muted-foreground">
        Loading review results…
      </div>
    );
  }

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
          <h1 className="text-xl font-semibold">{projectName}</h1>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {activeReview.review.sourceType ?? "Source"} · {activeReview.review.status ?? "Unknown"} · {activeReview.review.totalFiles ?? 0} files · {activeReview.review.totalLines ?? 0} lines
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Mic />
            Ask Voxide
          </Button>
          <select
            aria-label="Report format"
            value={reportFormat}
            onChange={(event) => setReportFormat(event.target.value as NonNullable<ReviewReport["format"]>)}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="json">JSON</option>
            <option value="html" disabled={!policy.htmlReport}>HTML {!policy.htmlReport ? "(Pro/Enterprise)" : ""}</option>
            <option value="pdf" disabled={!policy.pdfReport}>PDF {!policy.pdfReport ? "(Enterprise)" : ""}</option>
          </select>
          <Button
            variant="outline"
            onClick={() => void generateReport()}
            disabled={
              reportBusy ||
              (reportFormat === "html" && !policy.htmlReport) ||
              (reportFormat === "pdf" && !policy.pdfReport) ||
              activeReview.review.status !== "completed"
            }
          >
            <Download />
            {reportBusy ? "Generating…" : "Generate report"}
          </Button>
        </div>
      </div>
      {reportError && <div role="alert" className="mb-4 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{reportError}</div>}
      {activeReview && (
        <section className="panel mb-4 p-4" aria-live="polite">
          <div className="flex items-center gap-2 text-xs font-medium">
            {(activeReview.review.status === "pending" || activeReview.review.status === "queued" || activeReview.review.status === "running") && <LoaderCircle className="size-4 animate-spin text-primary" />}
            <span className="capitalize">Backend status: {activeReview.review.status ?? "unknown"}</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {["queued", "running", "completed"].map((stage, index) => {
              const status = activeReview.review.status ?? "";
              const current = status === "pending" || status === "queued" ? 0 : status === "running" ? 1 : status === "completed" ? 2 : -1;
              return <div key={stage} className={cn("rounded border px-3 py-2 text-xs capitalize", index <= current ? "border-primary/40 bg-primary/5" : "border-border text-muted-foreground")}>{stage}</div>;
            })}
          </div>
          {activeReview.review.status === "failed" && activeReview.review.errorCode && <p role="alert" className="mt-3 text-xs text-destructive">The review failed: {activeReview.review.errorCode}</p>}
        </section>
      )}
      <section className="panel mb-4 grid gap-6 p-5 lg:grid-cols-[150px_1fr_260px]">
        <div className="flex items-center justify-center">
          <ScoreRing score={scoreValue} />
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 self-center">
          <Metric label="Security" value={securityScore} icon={ShieldAlert} />
          <Metric label="Bugs" value={bugScore} icon={Bug} />
          <Metric label="Quality" value={qualityScore} icon={Code2} />
          <Metric label="Performance" value={performanceScore} icon={Zap} />
        </div>
        <div className="border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            Review summary
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <SummaryCount n={String(criticalCount)} label="Critical" s="CRITICAL" />
            <SummaryCount n={String(highCount)} label="High" s="HIGH" />
            <SummaryCount n={String(mediumCount + lowCount + infoCount + otherCount)} label="Other" s="LOW" />
          </div>
          <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
            {reviewFindings.length} findings across {new Set(reviewFindings.map((f) => f.category)).size} categories.
          </p>
        </div>
      </section>
      <section className="panel mb-4 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Review overview</h2>
          <span className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs capitalize">
            {(activeReview.review.status === "queued" || activeReview.review.status === "pending" || activeReview.review.status === "running") && <LoaderCircle className="size-3 animate-spin" />}
            {activeReview.review.status ?? "unknown"}
          </span>
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-muted-foreground">Languages</dt><dd className="mt-1">{activeReview.review.languages?.join(", ") || "Not reported"}</dd></div>
          <div><dt className="text-muted-foreground">Files reviewed</dt><dd className="mt-1">{activeReview.review.totalFiles ?? 0}</dd></div>
          <div><dt className="text-muted-foreground">Lines reviewed</dt><dd className="mt-1">{activeReview.review.totalLines ?? 0}</dd></div>
          <div><dt className="text-muted-foreground">Started</dt><dd className="mt-1">{activeReview.review.startedAt ? new Date(activeReview.review.startedAt).toLocaleString() : "Not reported"}</dd></div>
          <div><dt className="text-muted-foreground">Completed</dt><dd className="mt-1">{activeReview.review.completedAt ? new Date(activeReview.review.completedAt).toLocaleString() : "In progress"}</dd></div>
          <div><dt className="text-muted-foreground">Last updated</dt><dd className="mt-1">{activeReview.review.updatedAt ? new Date(activeReview.review.updatedAt).toLocaleString() : "Not reported"}</dd></div>
        </dl>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(["critical", "high", "medium", "low", "info"] as const).map((severityName) => (
            <div key={severityName} className="rounded border border-border p-3">
              <p className="text-[10px] uppercase text-muted-foreground">{severityName}</p>
              <p className="mt-1 font-mono text-lg font-semibold">{activeReview.review.findingCounts?.[severityName] ?? counts[severityName.toUpperCase() as Severity]}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="panel mb-4 p-5">
        <h2 className="text-sm font-semibold">AI analysis</h2>
        {aiEntries.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">AI analysis was not included in this review result.</p> : (
          <div className="mt-3 space-y-4">
            {aiSummary && <p className="text-sm leading-6 text-muted-foreground">{aiSummary}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              {aiRiskAreas.length > 0 && <div><h3 className="text-xs font-semibold">Risk areas</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{aiRiskAreas.map((area) => <li key={area}>{area}</li>)}</ul></div>}
              {aiPriorities.length > 0 && <div><h3 className="text-xs font-semibold">Priorities</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{aiPriorities.map((priority) => <li key={priority}>{priority}</li>)}</ul></div>}
            </div>
            {aiEntries.map((entry, index) => (
              <div key={`${entry.provider ?? "analysis"}-${entry.analysisType ?? index}`} className="flex flex-wrap gap-2 border-t border-border pt-3 text-[10px] text-muted-foreground">
                <span>{entry.provider ?? "AI provider"}</span><span>{entry.model ?? "Model unavailable"}</span><span className="capitalize">{entry.status ?? entry.result?.status ?? "unknown"}</span><span>{entry.usage?.totalTokens != null ? `${entry.usage.totalTokens} tokens` : "Token usage unavailable"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="panel mb-4 space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Reports</h2>
          <Button variant="outline" size="sm" disabled={!activeReviewId || reportBusy} onClick={() => {
            if (!activeReviewId) return;
            void listReviewReports(activeReviewId).then((reports) => {
              setReportList(reports);
              setActiveReport(reports[0] ?? null);
            }).catch((error) => setReportError(error instanceof Error ? error.message : "Unable to refresh reports"));
          }}>Refresh</Button>
        </div>
        {reportList.length === 0 ? <p className="text-xs text-muted-foreground">No reports have been generated for this review.</p> : reportList.map((report) => (
          <div key={report.reportId} className="rounded border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-medium text-xs">{(report.format ?? "json").toUpperCase()} report <span className="ml-2 capitalize text-muted-foreground">{report.status ?? "unknown"}</span></div>
              <div className="flex gap-3">
                {report.reportId && <button type="button" onClick={() => void loadReportById(report.reportId!)} className="text-xs text-primary underline">Refresh details</button>}
                {report.secureUrl && <a href={report.secureUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Open report</a>}
              </div>
            </div>
            <dl className="mt-3 grid gap-x-4 gap-y-2 text-[10px] sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Storage</dt><dd>{report.storageProvider ?? "Not reported"}</dd></div>
              <div><dt className="text-muted-foreground">Resource type</dt><dd>{report.resourceType ?? "Not reported"}</dd></div>
              <div><dt className="text-muted-foreground">Created</dt><dd>{report.createdAt ? new Date(report.createdAt).toLocaleString() : "Not reported"}</dd></div>
              <div><dt className="text-muted-foreground">Updated</dt><dd>{report.updatedAt ? new Date(report.updatedAt).toLocaleString() : "Not reported"}</dd></div>
              {report.errorCode && <div><dt className="text-muted-foreground">Issue</dt><dd>{report.errorCode}</dd></div>}
            </dl>
          </div>
        ))}
      </section>
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <h2 className="mr-3 text-sm font-semibold">
            Findings <span className="text-muted-foreground">{visible.length}</span>
          </h2>
          {['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={cn(
                'rounded border px-2 py-1 font-mono text-[10px]',
                severity === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div>
          {visible.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">No findings match this filter.</div>
          ) : (
            visible.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFinding(f.id)}
                className="group flex w-full items-start gap-3 border-b border-border px-4 py-4 text-left last:border-0 hover:bg-accent/40"
              >
                <span className={cn('mt-1 h-9 w-0.5 rounded-full', severityClass[f.severity])} />
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

function CodeEvidence({ file, line, description }: { file: string; line: string; description: string }) {
  const codeBlock = [`${file}:${line}`, description].filter(Boolean).join("\n");

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-border px-4 py-3 text-xs font-semibold">Offending code</div>
      <div className="bg-editor px-4 py-3 font-mono text-xs text-code-muted">
        <pre className="whitespace-pre-wrap break-words">{codeBlock}</pre>
      </div>
    </section>
  );
}

function getRemediationText(remediation: unknown): string {
  if (typeof remediation === "string" && remediation.trim()) return remediation.trim();

  if (Array.isArray(remediation)) {
    const joined = remediation
      .map((item) => getRemediationText(item))
      .filter(Boolean)
      .join("\n");
    if (joined) return joined;
  }

  if (remediation && typeof remediation === "object") {
    const obj = remediation as Record<string, unknown>;
    const candidateKeys = ["text", "message", "summary", "description", "recommendation", "fix", "plan"];
    for (const key of candidateKeys) {
      const value = obj[key];
      const text = getRemediationText(value);
      if (text) return text;
    }
  }

  return "No remediation guidance is included in the backend response for this finding.";
}

function FindingDetail() {
  const { selectedFinding, setView, findingStatuses, setFindingStatus, activeReview } = useReviewStore();
  const reviewFindings = useMemo(() => {
    if (!activeReview) return [] as Finding[];
    return activeReview.findings.map((finding, index) => ({
      id: String(finding._id ?? finding.id ?? `${activeReview.review.id}-${index}`),
      title: finding.title ?? "Review finding",
      severity: normalizeSeverity(finding.severity) as Severity,
      category: normalizeCategory(finding.category),
      file: finding.filePath ?? "unknown",
      line: formatFindingLine(finding.lineStart, finding.lineEnd),
      confidence: normalizeConfidence(finding.confidence),
      status: finding.status ?? "open",
      description: finding.description ?? "No description available.",
    }));
  }, [activeReview]);

  if (!activeReview || reviewFindings.length === 0) {
    return (
      <div className="panel p-10 text-center text-sm text-muted-foreground">
        Review findings are not available yet.
      </div>
    );
  }

  const f = reviewFindings.find((x) => x.id === selectedFinding) ?? reviewFindings[0];
  if (!f) {
    return (
      <div className="panel p-10 text-center text-sm text-muted-foreground">
        Review finding details are not available.
      </div>
    );
  }

  const backendFinding = activeReview.findings.find((finding) => {
    const candidateId = String(finding._id ?? finding.id ?? "");
    return candidateId === f.id;
  }) ?? activeReview.findings[0];

  const status = findingStatuses[f.id] ?? f.status;
  const setStatus = (s: string) => setFindingStatus(f.id, s);
  const aiInsight = backendFinding?.ruleId
    ? activeReview.aiAnalysis?.flatMap((analysis) => analysis.result?.findings ?? []).find((insight) => insight.ruleId === backendFinding.ruleId)
    : undefined;
  const aiImprovement = backendFinding?.ruleId
    ? activeReview.aiAnalysis?.flatMap((analysis) => analysis.result?.improvements ?? []).find((improvement) => improvement.ruleId === backendFinding.ruleId)
    : undefined;
  const remediationText = getRemediationText(aiInsight?.remediation ?? backendFinding?.remediation ?? aiImprovement?.suggestion);
  const aiProviderDetails = activeReview.aiAnalysis ?? [];
  const codeValue = `// ${f.file}:${f.line}\n${backendFinding?.description ?? f.description}`;

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
              <span className="ml-auto status-dot">{status}</span>
            </div>
            <h1 className="mt-4 text-xl font-semibold">{f.title}</h1>
            <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] text-muted-foreground">
              <span>
                {f.file}:{f.line}
              </span>
              {backendFinding?.ruleId && <span>Rule {backendFinding.ruleId}</span>}
              <span>{f.category}</span>
              <span>{f.confidence}% confidence</span>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">{f.description}</p>
            <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-3 text-[10px] text-muted-foreground">
              <span>Created {backendFinding?.createdAt ? new Date(backendFinding.createdAt).toLocaleString() : "date unavailable"}</span>
              <span>Updated {backendFinding?.updatedAt ? new Date(backendFinding.updatedAt).toLocaleString() : "date unavailable"}</span>
            </div>
          </section>
          <CodeEvidence file={f.file} line={f.line} description={backendFinding?.description ?? f.description} />
          <section className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Bot className="size-4 text-ai" />
              <h2 className="text-xs font-semibold">AI explanation</h2>
              <span className="rounded border border-ai/30 bg-ai/10 px-1.5 py-0.5 text-[9px] text-ai">
                AI-GENERATED
              </span>
            </div>
            <div className="space-y-3 p-5">
              {aiInsight?.assessment && <p className="text-xs font-semibold">Assessment: <span className="font-normal text-muted-foreground">{aiInsight.assessment}</span></p>}
              {aiInsight?.explanation ? <p className="text-sm leading-6 text-muted-foreground">{aiInsight.explanation}</p> : (
                <p className="text-sm leading-6 text-muted-foreground">No AI assessment was returned for this finding.</p>
              )}
              {aiImprovement?.reason && <div className="rounded border border-border p-3"><h3 className="text-xs font-semibold">Why this matters</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{aiImprovement.reason}</p></div>}
              {aiImprovement?.suggestion && <div className="rounded border border-border p-3"><h3 className="text-xs font-semibold">AI improvement</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{aiImprovement.suggestion}</p></div>}
              {aiProviderDetails.length > 0 && <div className="flex flex-wrap gap-3 border-t border-border pt-3 text-[10px] text-muted-foreground">{aiProviderDetails.map((analysis, index) => <span key={`${analysis.provider ?? "provider"}-${analysis.analysisType ?? index}`}>{analysis.provider ?? "AI"}{analysis.model ? ` · ${analysis.model}` : ""} · {analysis.status ?? analysis.result?.status ?? "unknown"}</span>)}</div>}
              {aiProviderDetails.flatMap((analysis) => analysis.result?.errors ?? []).map((message, index) => <p key={`${index}-${message}`} className="rounded border border-warning/30 bg-warning/5 p-2 text-xs text-warning">{message}</p>)}
            </div>
          </section>
          <section className="panel overflow-hidden">
            <div className="flex items-center border-b border-border px-4 py-3">
              <h2 className="text-xs font-semibold">Suggested fix</h2>
              <span className="ml-auto text-[10px] text-muted-foreground">Backend guidance</span>
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
                  value={codeValue + `\n\n// Suggested fix\n${remediationText}`}
                  options={{
                    readOnly: true,
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
          </section>
        </div>

        <aside className="space-y-4">
          <div className="panel p-4">
            <h2 className="text-xs font-semibold">Finding status</h2>
            <div className="mt-4 space-y-3">
              {['Open', 'In review', 'Fixed', 'Ignored'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={cn(
                    'flex w-full items-center justify-between rounded border px-3 py-2 text-left text-xs',
                    status === item ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span>{item}</span>
                  {status === item && <Check className="size-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function CheckRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between text-xs">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
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

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Code2;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center text-xs">
        <Icon className="mr-2 size-3.5 text-muted-foreground" />
        {label}
        <span className="ml-auto font-mono font-semibold">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-score" style={{ width: `${value}%` }} />
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
