import { toast } from "sonner";
// import VoxideAssistant from "./ai/VoxideAssistant";
import {
  ApiClientError,
  type ReviewResult,
  type ReviewFinding,
  type DashboardReview,
  useCompanyRulesQuery,
  useCreateCompanyRuleMutation,
  useUpdateCompanyRuleMutation,
  useToggleCompanyRuleMutation,
  useDeleteCompanyRuleMutation,
  type CompanyRuleItem,
  useAdminStatsQuery,
  useAdminUsersQuery,
  useUpdateAdminUserRoleMutation,
  useToggleAdminUserStatusMutation,
  type AdminUserItem,
  type AdminSystemEvent,
  useAdminCompaniesQuery,
  type AdminCompanyItem,
  useCompanyMembersQuery,
  useInviteCompanyMemberMutation,
  type CompanyMember,
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
  LogOut,
  Pencil,
  Trash2,
  AlertCircle,
  Filter,
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
  getGithubConnectionUser,
  getGithubRepository,
  getReport,
  listGithubBranches,
  listGithubRepositories,
  formatFindingLine,
  listProjects,
  listAllReviews,
  getReview as getReviewDetails,
  useDashboardMetricsQuery,
  useReviewsQuery,
  useSubscriptionQuery,
  listScheduledReviews,
  getScheduledReview,
  createScheduledReview,
  cancelScheduledReview,
  startGithubConnect,
  initiateSubscriptionPayment,
  type CreateReviewPayload,
  type ScheduledReview,
  type ProjectRecord,
  type ReviewIndexRecord,
  type ReviewDetails,
  TIER_POLICIES,
  type SubscriptionTier,
} from "@/lib/review-api";
import { useReviewStore, type Role, type View } from "@/lib/review-store";
import { STORAGE_KEYS } from "@/lib/constants";
import { readSourceFilesFromZip } from "@/lib/zip-archive";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const Editor = lazy(() => import("@monaco-editor/react").then((m) => ({ default: m.Editor })));

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

function apiFailure(error: unknown, fallback: string) {
  const details = error instanceof ApiClientError ? error.details : getApiErrorResponse(error);
  return {
    error: error instanceof Error ? error.message : fallback,
    ...(details !== undefined ? { errorResponse: details } : {}),
  };
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

function toUiReviewResult(details: ReviewDetails): ReviewResult {
  const reviewId = details.review.id;
  const score = details.score as
    | (NonNullable<ReviewDetails["score"]> & {
        overall?: number | null;
        security?: number | null;
        bugs?: number | null;
        quality?: number | null;
        performance?: number | null;
      })
    | null;
  const findings: ReviewFinding[] = details.findings.map((finding) => {
    const category = String(finding.category ?? "quality").toLowerCase();
    const confidence = String(finding.confidence ?? "medium").toLowerCase();
    const status = String(finding.status ?? "detected").toLowerCase();
    const severity = String(finding.severity ?? "info").toLowerCase();
    return {
      ...(finding._id ? { _id: finding._id } : {}),
      ...(finding.id ? { id: finding.id } : {}),
      category:
        category === "security" || category === "bug" || category === "quality" || category === "performance"
          ? category
          : "quality",
      type: finding.ruleId ?? category,
      ruleId: finding.ruleId ?? "review-finding",
      title: finding.title ?? finding.ruleId ?? "Review finding",
      description: finding.description ?? "",
      severity: ["critical", "high", "medium", "low", "info"].includes(severity)
        ? (severity as ReviewFinding["severity"])
        : "info",
      confidence: confidence === "high" || confidence === "low" ? confidence : "medium",
      status: ["detected", "verified", "false_positive", "accepted", "resolved"].includes(status)
        ? (status as ReviewFinding["status"])
        : "detected",
      file: finding.filePath ?? null,
      line: finding.lineStart ?? null,
      column: null,
      code: null,
      recommendation: finding.remediation ?? null,
      analyzer: "backend",
      fingerprint: String(finding._id ?? finding.id ?? `${reviewId}-${finding.ruleId ?? "finding"}`),
    };
  });
  const countSeverity = (severity: string) =>
    findings.filter((finding) => finding.severity === severity).length;
  const aiAnalysis = details.aiAnalysis?.find((analysis) => analysis.status === "completed");

  return {
    reviewId,
    status: details.review.status === "failed" ? "failed" : "completed",
    summary: {
      totalFindings: findings.length,
      critical: countSeverity("critical"),
      high: countSeverity("high"),
      medium: countSeverity("medium"),
      low: countSeverity("low"),
      info: countSeverity("info"),
    },
    score: {
      score: score?.overall ?? details.review.score ?? 0,
      breakdown: {
        security: score?.security ?? 0,
        bugs: score?.bugs ?? 0,
        quality: score?.quality ?? 0,
        performance: score?.performance ?? 0,
      },
    },
    findings,
    aiAnalysis: aiAnalysis
      ? {
          status: aiAnalysis.status ?? "completed",
          provider: aiAnalysis.provider ?? null,
          model: aiAnalysis.model ?? null,
          summary: aiAnalysis.result?.summary?.summary ?? null,
          recommendations:
            aiAnalysis.result?.improvements?.map((item) => item.suggestion ?? "").filter(Boolean) ?? [],
        }
      : null,
    errorMessage: details.review.errorCode ?? null,
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
    email: "alex@reviewx.dev",
    initials: "AM",
    badge: "Member",
    context: "Team workspace / personal",
  },
  company: {
    name: "Dana Kim",
    email: "dana@reviewx.dev",
    initials: "DK",
    badge: "Company admin",
    context: "Team workspace / admin",
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
        { view: "billing", label: "Upgrade plan", icon: CreditCard },
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
  const { view, setView, theme, setTheme, role, userName, userEmail } = useReviewStore();
  const [mobileNav, setMobileNav] = useState(false);
  const { user } = useAuthStore();
  const subscriptionQuery = useSubscriptionQuery(user?.id);
  const subscriptionTier = subscriptionQuery.data?.plan ?? "free";
  const setSubscriptionTier = useReviewStore((state) => state.setSubscriptionTier);
  const activeReviewId = useReviewStore((state) => state.activeReviewId);
  const setActiveReview = useReviewStore((state) => state.setActiveReview);
  const setActiveReviewStatus = useReviewStore((state) => state.setActiveReviewStatus);
  const setAnalyzing = useReviewStore((state) => state.setAnalyzing);
  const setApiResponse = useReviewStore((state) => state.setApiResponse);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    if (subscriptionQuery.data) {
      setSubscriptionTier(subscriptionQuery.data.plan);
    }
  }, [setSubscriptionTier, subscriptionQuery.data]);

  useEffect(() => {
    if (!activeReviewId) return;
    let cancelled = false;
    let timer: number | undefined;
    let errorReported = false;

    const refreshReview = async () => {
      try {
        const details = await getReviewDetails(activeReviewId);
        if (cancelled) return;
        setApiResponse("GET /reviews/:reviewId", {
          request: { reviewId: activeReviewId },
          response: details,
        });
        const status = String(details.review.status ?? "pending").toLowerCase();
        if (status === "completed" || status === "failed") {
          setActiveReview(toUiReviewResult(details));
          setAnalyzing(false);
          return;
        }
        setActiveReviewStatus(status);
        timer = window.setTimeout(() => void refreshReview(), 1500);
      } catch (reviewError) {
        if (cancelled) return;
        const message = reviewError instanceof Error ? reviewError.message : "Unable to load review status";
        setApiResponse("GET /reviews/:reviewId", {
          request: { reviewId: activeReviewId },
          ...apiFailure(reviewError, message),
        });
        setActiveReviewStatus(`Retrying: ${message}`);
        if (!errorReported) {
          toast.error(message);
          errorReported = true;
        }
        timer = window.setTimeout(() => void refreshReview(), 5000);
      }
    };

    void refreshReview();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [activeReviewId, setActiveReview, setActiveReviewStatus, setAnalyzing, setApiResponse]);

  // Derive context label and org name from role — no static personas map needed
  const roleBadge =
    role === "platform" ? "Platform admin"
    : role === "company" ? "Company admin"
    : "Member";

  const orgName =
    role === "platform"
      ? "ReviewX Platform"
      : user?.company && typeof user.company === "string" && !user.company.match(/^[a-f\d]{24}$/i)
      ? user.company
      : `${userName ? `${userName}'s Workspace` : "Personal Workspace"}`;

  const orgInitials =
    role === "platform"
      ? "RX"
      : orgName
          .split(" ")
          .map((n) => n[0] ?? "")
          .join("")
          .slice(0, 2)
          .toUpperCase() || "PW";

  const headerSubtitle =
    role === "platform"
      ? "ReviewX / platform"
      : role === "company"
      ? `${orgName} / admin`
      : `${orgName} / personal`;

  const nav = roleNav[role];
  const titles: Record<View, string> = {
    new: "New review",
    result: "Review result",
    finding: "Finding detail",
    dashboard: role === "company" ? "Company dashboard" : "Dashboard",
    history: role === "member" ? "My reviews" : "Review history",
    rules: "Company rules",
    company: "Members",
    billing: role === "member" ? "Upgrade plan" : "Plans & billing",
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
              {orgInitials}
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
            <span
              className="rounded border border-border px-2 py-1 text-[10px] capitalize text-muted-foreground"
              aria-label="Subscription plan"
              title={
                subscriptionQuery.isError
                  ? "Unable to retrieve your subscription from the backend"
                  : subscriptionQuery.data?.status ?? "Loading subscription"
              }
            >
              {subscriptionQuery.isLoading
                ? "Loading plan…"
                : subscriptionQuery.isError
                  ? "Plan unavailable"
                  : `${subscriptionTier} plan`}
            </span>
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
      setActiveReview(null);
      setActiveReviewId(result.review.id);
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
          <Button onClick={() => void startGithubConnect().catch((connectError) => {
            const message = connectError instanceof Error ? connectError.message : "Unable to start GitHub authorization";
            setError(message);
          })}>
            <Github className="size-4" /> Connect GitHub
          </Button>
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
  const { subscriptionTier } = useReviewStore();
  const githubAllowed = TIER_POLICIES[subscriptionTier].githubIntegration;
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
        <Button onClick={() => void startGithubConnect().catch((error) => {
          toast.error(error instanceof Error ? error.message : "Unable to start GitHub authorization");
        })}>
          <Github className="size-4" /> Connect GitHub
        </Button>
      ) : (
        <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground" aria-label="Enterprise plan required for GitHub">
          <Github className="size-4" /> Enterprise plan required
        </span>
      )}
    </section>
  );
}

function Schedules() {
  const { scheduledReviews, setScheduledReviews, projects, setProjects, subscriptionTier, setApiResponse } = useReviewStore();
  const [reviewIndex, setReviewIndex] = useState<ReviewIndexRecord[]>([]);
  const [reviewId, setReviewId] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState("3600");
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const policy = TIER_POLICIES[subscriptionTier];
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
        if (reviewsResult.status === "fulfilled") {
          setReviewIndex(reviewsResult.value.reviews);
          setApiResponse("GET /reviews/all", { response: reviewsResult.value });
        } else {
          const message = reviewsResult.reason instanceof Error ? reviewsResult.reason.message : "Unable to load reviews";
          setError(message);
          setApiResponse("GET /reviews/all", { ...apiFailure(reviewsResult.reason, message) });
        }
        if (projectsResult.status === "fulfilled") {
          setProjects(projectsResult.value);
          setApiResponse("GET /projects", { response: projectsResult.value });
        } else {
          const message = projectsResult.reason instanceof Error ? projectsResult.reason.message : "Unable to load projects";
          setError(message);
          setApiResponse("GET /projects", { ...apiFailure(projectsResult.reason, message) });
        }
      });
    return () => {
      active = false;
    };
  }, [setProjects, setApiResponse]);

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
          <p className="mt-2 text-xs text-muted-foreground">
            Scheduled reviews are not enabled for the {subscriptionTier} subscription assigned to this account. The backend remains authoritative for feature access.
          </p>
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
  const tier = subscriptionTier;
  const policy = TIER_POLICIES[tier];
  const [language, setLanguage] = useState("typescript");
  const [code, setCode] = useState(defaultSource);
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
      setApiResponse("POST /reviews", { request: payload, response: result });
      setActiveReview(null);
      setActiveReviewId(result.review.id);
      setAnalyzing(false);
      setView("result");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start review";
      setError(message);
      setApiResponse("POST /reviews", { request: { projectName, sourceMode }, ...apiFailure(err, message) });
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
                  <Button
                    onClick={() => void startGithubConnect().catch((connectError) => {
                      const message = connectError instanceof Error ? connectError.message : "Unable to start GitHub authorization";
                      setError(message);
                    })}
                  >
                    <Github className="size-4" /> Connect GitHub
                  </Button>
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
              <input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="bg-transparent text-foreground border-none outline-none font-mono text-xs w-48 hover:underline focus:underline"
                placeholder="file.ext"
              />
              {code.trim().length > 0 && <span className="size-1.5 rounded-full bg-warning" />}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Select value={language} onValueChange={(val) => {
                setLanguage(val);
                const ext = val === "python" ? "py" : val === "javascript" ? "js" : val === "java" ? "java" : val === "php" ? "php" : "ts";
                if (filename.startsWith("src/code.")) {
                  setFilename(`src/code.${ext}`);
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
                <Select defaultValue="standard">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">ReviewX standard</SelectItem>
                    <SelectItem value="company">Company rules</SelectItem>
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

function ReviewResult() {
  const { severity, setSeverity, setSelectedFinding, setView, activeReview, activeReviewId, activeReviewStatus, setApiResponse, subscriptionTier } = useReviewStore();
  const [generatingReport, setGeneratingReport] = useState<"json" | "html" | "pdf" | null>(null);
  const [reportLinks, setReportLinks] = useState<Partial<Record<"json" | "html" | "pdf", string>>>({});

  const allFindings = useMemo(() => {
    if (activeReview?.findings && activeReview.findings.length > 0) {
      return activeReview.findings.map(mapBackendFindingToUi);
    }
    return [];
  }, [activeReview]);

  const visible = severity === "All" ? allFindings : allFindings.filter((f) => f.severity === severity);

  const handleGenerateReport = async (type: "json" | "html" | "pdf") => {
    if (!activeReview?.reviewId) {
      toast.error("The backend review result is not available yet.");
      return;
    }

    try {
      setGeneratingReport(type);
      setReportLinks((links) => ({ ...links, [type]: undefined }));
      toast.info(`Generating ${type.toUpperCase()} report...`);
      const request = { reviewId: activeReview.reviewId, format: type };
      let report = await createReport(activeReview.reviewId, type);
      setApiResponse(`POST /reviews/${activeReview.reviewId}/reports`, { request, response: report });

      if (!report.reportId && report.status !== "completed") {
        throw new Error("The backend did not return an ID for the generated report.");
      }

      for (let attempt = 0; report.status !== "completed" && report.status !== "failed" && report.reportId && attempt < 30; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        report = await getReport(report.reportId);
      }

      if (report.status === "failed") {
        throw new Error(report.errorCode ?? "The backend could not generate this report.");
      }
      if (report.secureUrl) {
        setReportLinks((links) => ({ ...links, [type]: report.secureUrl ?? undefined }));
        toast.success(`${type.toUpperCase()} report ready!`);
      } else if (report.status === "completed") {
        throw new Error("The backend completed the report but did not return a download URL.");
      } else {
        toast.info("The report is still being generated. Check again shortly.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate report";
      toast.error(msg);
    } finally {
      setGeneratingReport(null);
    }
  };

  const reviewScore = activeReview?.score?.score ?? 0;
  const fileName = "Code Review Result";
  const language = "Source";
  const reviewId = activeReview?.reviewId ? activeReview.reviewId.slice(-8).toUpperCase() : "REV";
  const scoreBreakdown = activeReview?.score?.breakdown;

  if (!activeReview) {
    return (
      <section className="panel mx-auto max-w-3xl p-8 text-center">
        <LoaderCircle className="mx-auto size-6 animate-spin text-primary" />
        <h1 className="mt-4 text-lg font-semibold">Loading backend review result</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {activeReviewStatus ? `Current status: ${activeReviewStatus}` : "Waiting for the review status response."}
        </p>
        {activeReviewId && <p className="mt-2 font-mono text-xs text-muted-foreground">{activeReviewId}</p>}
      </section>
    );
  }

  return (
    <>
      {activeReview.status === "failed" && (
        <div role="alert" className="mb-4 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Review failed: {activeReview.errorMessage ?? "The backend could not complete this review."}
        </div>
      )}
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
            {reviewId} · {language} · {activeReview.status} · {allFindings.length} {allFindings.length === 1 ? "finding" : "findings"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["json", "html", "pdf"] as const).map((format) => {
            const allowed = TIER_POLICIES[subscriptionTier][`${format}Report`];
            const reportUrl = reportLinks[format];
            const label = `${format.toUpperCase()} report`;

            return (
              <div key={format} className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={!allowed || generatingReport !== null || activeReview.status !== "completed"}
                  title={
                    !allowed
                      ? `${format.toUpperCase()} reports are not included in your ${subscriptionTier} plan.`
                      : activeReview.status !== "completed"
                        ? "Reports are available after the review is completed."
                        : undefined
                  }
                  onClick={() => void handleGenerateReport(format)}
                >
                  {generatingReport === format ? (
                    <LoaderCircle className="animate-spin" />
                  ) : format === "pdf" ? (
                    <Download />
                  ) : (
                    <FileText />
                  )}
                  {generatingReport === format ? "Generating…" : format.toUpperCase()}
                </Button>
                {reportUrl && (
                  <a
                    href={reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    View full {label}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <section className="panel mb-4 grid gap-6 p-5 lg:grid-cols-[150px_1fr_260px]">
        <div className="flex items-center justify-center">
          <ScoreRing score={reviewScore} />
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 self-center">
          <Metric label="Security" value={scoreBreakdown?.security ?? (activeReview ? "--" : 0)} barValue={scoreBreakdown?.security ?? 0} icon={ShieldAlert} />
          <Metric label="Bugs" value={scoreBreakdown?.bugs ?? (activeReview ? "--" : 0)} barValue={scoreBreakdown?.bugs ?? 0} icon={Bug} />
          <Metric label="Quality" value={scoreBreakdown?.quality ?? (activeReview ? "--" : 0)} barValue={scoreBreakdown?.quality ?? 0} icon={Code2} />
          <Metric label="Performance" value={scoreBreakdown?.performance ?? (activeReview ? "--" : 0)} barValue={scoreBreakdown?.performance ?? 0} icon={Zap} />
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
            {activeReview.status === "failed"
              ? activeReview.errorMessage ?? "The backend could not complete this review."
              : activeReview.aiAnalysis?.summary ||
                (allFindings.length > 0
                  ? `${allFindings.length} findings detected across ${new Set(allFindings.map((f) => f.category)).size} categories.`
                  : "Clean analysis. No findings detected.")}
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
  if ((counts?.critical ?? 0) > 0)
    parts.push(
      <span key="c" className="text-critical">
        {counts?.critical} Critical
      </span>,
    );
  if ((counts?.high ?? 0) > 0)
    parts.push(
      <span key="h" className="text-high">
        {counts?.high} High
      </span>,
    );
  if ((counts?.medium ?? 0) > 0)
    parts.push(
      <span key="m" className="text-medium">
        {counts?.medium} Med
      </span>,
    );
  if ((counts?.low ?? 0) > 0)
    parts.push(
      <span key="l" className="text-low">
        {counts?.low} Low
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
  const user = useAuthStore((s) => s.user);
  const metricsQuery = useDashboardMetricsQuery(user?.id);
  const { data: metricsData } = metricsQuery;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const handleSelectReview = async (reviewId: string) => {
    try {
      const full = await getReviewDetails(reviewId);
      if (full.review.status === "completed" || full.review.status === "failed") {
        setActiveReview(toUiReviewResult(full));
      } else {
        const store = useReviewStore.getState();
        store.setActiveReview(null);
        store.setActiveReviewStatus(full.review.status ?? "pending");
        store.setActiveReviewId(reviewId);
      }
      setView("result");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load review details");
    }
  };

  const totalFindings = metricsData?.totalFindings ?? 0;
  const criticalCount = metricsData?.criticalCount ?? 0;
  const highCount     = metricsData?.highCount ?? 0;
  const mediumCount   = metricsData?.mediumCount ?? 0;
  const lowCount      = metricsData?.lowCount ?? 0;
  const resolvedPct   = metricsData?.resolvedPercentage ?? null;
  const avgScore      = metricsData?.averageScore ?? 0;
  const totalReviews  = metricsData?.totalReviews ?? 0;
  const scoreTrendData = metricsData?.scoreTrend ?? [];
  const catHealth     = metricsData?.categoryHealth;
  const recentReviews = metricsData?.recentReviews ?? [];
  const openFindings  = metricsData?.openFindings ?? [];

  return (
    <>
      <PageHeading
        title={`${greeting}, ${(userName || "there").split(" ")[0]}`}
        subtitle="Backend review scores, finding summaries, and recent activity."
        action={
          <Button onClick={() => setView("new")}>
            <Plus />
            New review
          </Button>
        }
      />
      {metricsQuery.isError && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span>{metricsQuery.error instanceof Error ? metricsQuery.error.message : "Unable to load dashboard data."}</span>
          <Button variant="outline" size="sm" onClick={() => void metricsQuery.refetch()}>Retry</Button>
        </div>
      )}

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
            <span className="text-[10px] text-muted-foreground">No findings detected</span>
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
                Findings
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
              {resolvedPct !== null ? "Resolution rate" : totalFindings === 0 ? "No findings yet" : "Rate unavailable"}
            </span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">
            {resolvedPct !== null ? `${resolvedPct}%` : "--"}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {resolvedPct !== null
              ? "of detected findings"
              : totalFindings === 0
                ? "Awaiting review findings"
                : "The API does not expose aggregate resolved counts"}
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

      {/* ── Recent open findings + Recent activity ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">
              Recent open findings
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
                <span>No open findings in the latest reviews</span>
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
  const user = useAuthStore((s) => s.user);
  const reviewsQuery = useReviewsQuery(50, user?.id);
  const { data: reviews = [], isLoading } = reviewsQuery;

  const handleSelect = async (reviewId: string) => {
    try {
      const full = await getReviewDetails(reviewId);
      if (full.review.status === "completed" || full.review.status === "failed") {
        setActiveReview(toUiReviewResult(full));
      } else {
        const store = useReviewStore.getState();
        store.setActiveReview(null);
        store.setActiveReviewStatus(full.review.status ?? "pending");
        store.setActiveReviewId(reviewId);
      }
      setView("result");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load review details");
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
                {isLoading
                  ? "Loading reviews..."
                  : reviewsQuery.isError
                    ? reviewsQuery.error instanceof Error
                      ? reviewsQuery.error.message
                      : "Unable to load reviews."
                    : "No reviews found. Submit your first code review to populate this list."}
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

/* ─────────────── company admin dashboard (Live Backend Data) ────────── */

function CompanyDashboard() {
  const { setView, setActiveReview } = useReviewStore();
  const user = useAuthStore((s) => s.user);
  const metricsQuery = useDashboardMetricsQuery(user?.id);
  const { data: metricsData } = metricsQuery;
  const { data: rules = [] } = useCompanyRulesQuery();
  const { data: members = [], isLoading: membersLoading } = useCompanyMembersQuery(user?.id);

  const teamAvg = metricsData?.averageScore ?? 0;
  const teamReviews = metricsData?.totalReviews ?? 0;
  const totalFindings = metricsData?.totalFindings ?? 0;
  const critCount = metricsData?.criticalCount ?? 0;
  const activeRulesCount = rules.filter((r) => r.enabled).length;
  const catHealth = metricsData?.categoryHealth;
  const recentReviews = metricsData?.recentReviews ?? [];
  const openFindings = metricsData?.openFindings ?? [];

  const handleSelectReview = async (reviewId: string) => {
    try {
      const full = await getReviewDetails(reviewId);
      if (full.review.status === "completed" || full.review.status === "failed") {
        setActiveReview(toUiReviewResult(full));
      } else {
        const store = useReviewStore.getState();
        store.setActiveReview(null);
        store.setActiveReviewStatus(full.review.status ?? "pending");
        store.setActiveReviewId(reviewId);
      }
      setView("result");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load review details");
    }
  };

  return (
    <>
      <PageHeading
        title="Team & Members"
        subtitle="Team-wide code health, rule enforcement, and member activity."
        action={
          <Button onClick={() => setView("new")}>
            <Plus />
            New review
          </Button>
        }
      />
      {metricsQuery.isError && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span>{metricsQuery.error instanceof Error ? metricsQuery.error.message : "Unable to load team review data."}</span>
          <Button variant="outline" size="sm" onClick={() => void metricsQuery.refetch()}>Retry</Button>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Gauge className="size-3.5" />Team avg score</span>
            <span className="font-mono text-[10px] text-success">
              {teamAvg > 0 ? "Overall health" : "No team reviews yet"}
            </span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">
            {teamAvg > 0 ? teamAvg : "--"}
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-score transition-all duration-500"
              style={{ width: `${Math.min(teamAvg, 100)}%` }}
            />
          </div>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><FileText className="size-3.5" />Team reviews</span>
            <span className="font-mono text-[10px] text-muted-foreground">Total</span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">{teamReviews}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {members.length === 1 ? "1 active member" : `${members.length} active members`}
          </div>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><AlertTriangle className="size-3.5" />Findings</span>
            <span className="font-mono text-[10px] text-critical">{critCount} critical</span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">{totalFindings}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">across all members</div>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" />Active rules</span>
            <span className="font-mono text-[10px] text-muted-foreground">{rules.length} custom</span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">{activeRulesCount}</div>
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
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      {membersLoading ? "Loading members..." : "No members found in this workspace."}
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id || m.email}>
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
                        <span className={cn("font-mono font-semibold", m.avg > 0 ? scoreColor(m.avg) : "text-muted-foreground")}>
                          {m.avg > 0 ? m.avg : "--"}
                        </span>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Rule compliance</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Pass rate across team reviews</p>
          <div className="mt-5 space-y-4">
            <Metric label="Security"    value={catHealth?.security ?? "--"} icon={ShieldAlert} />
            <Metric label="Bugs"        value={catHealth?.bugs ?? "--"} icon={Bug} />
            <Metric label="Quality"     value={catHealth?.quality ?? "--"} icon={Code2} />
            <Metric label="Performance" value={catHealth?.performance ?? "--"} icon={Zap} />
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
                {openFindings.length}
              </span>
            </h2>
            {critCount > 0 && (
              <span className={cn(
                "inline-flex h-5 items-center rounded-sm border px-1.5 font-mono text-[9px] font-semibold",
                "severity-critical",
              )}>
                {critCount} CRITICAL
              </span>
            )}
          </div>
          <div className="divide-y divide-border">
            {openFindings.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <CheckCircle2 className="size-6 text-success" />
                <p className="text-xs font-medium text-foreground">All clear</p>
                <p className="text-[10px]">No open findings across team reviews.</p>
              </div>
            ) : (
              openFindings.map((f, i) => (
                <div key={f.id || i} className="flex items-start gap-3 px-4 py-3">
                  <SeverityBadge severity={f.severity as Severity} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{f.title}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {f.file} · {f.category}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent team reviews</h2>
            <Button variant="ghost" size="sm" onClick={() => setView("history")}>View all</Button>
          </div>
          <div className="divide-y divide-border">
            {recentReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <FileCode2 className="size-6 text-muted-foreground/60" />
                <p className="text-xs font-medium text-foreground">No reviews yet</p>
                <p className="text-[10px]">Team reviews will appear here once submitted.</p>
              </div>
            ) : (
              recentReviews.map((r) => (
                <button
                  key={r.reviewId || r.id}
                  onClick={() => handleSelectReview(r.reviewId || r.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                >
                  <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-medium text-foreground">{r.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {r.lang} · {r.date || r.relativeDate}
                    </p>
                  </div>
                  <span className={cn(
                    "inline-flex h-6 min-w-[2.2rem] items-center justify-center rounded border font-mono text-xs font-semibold",
                    scoreBg(r.score),
                  )}>
                    {r.score}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function UsersView() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data, isLoading, isError, refetch } = useAdminUsersQuery({
    search: search.trim() ? search.trim() : undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
  });

  const updateRoleMutation = useUpdateAdminUserRoleMutation();
  const toggleStatusMutation = useToggleAdminUserStatusMutation();

  const handleRoleChange = async (userId: string, newRole: "member" | "company_admin" | "platform_admin") => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role: newRole });
      toast.success("User role updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update user role");
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean, userName: string) => {
    try {
      await toggleStatusMutation.mutateAsync(userId);
      toast.success(`User ${userName} is now ${currentStatus ? "deactivated" : "active"}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to toggle user status");
    }
  };

  const users: AdminUserItem[] = data?.users || [];

  const handleExportCSV = () => {
    if (!users.length) {
      toast.info("No users to export");
      return;
    }
    const headers = ["ID", "Name", "Email", "Role", "Company", "Status", "Created At"];
    const csvRows = [
      headers.join(","),
      ...users.map((u) =>
        [
          u.id,
          `"${(u.name || "").replace(/"/g, '""')}"`,
          `"${(u.email || "").replace(/"/g, '""')}"`,
          u.role,
          `"${(u.company || "").replace(/"/g, '""')}"`,
          u.isActive ? "Active" : "Inactive",
          u.createdAt,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `platform_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Users exported as CSV");
  };

  return (
    <>
      <PageHeading
        title="Users"
        subtitle="Every account on the platform, across all companies."
        action={
          <Button variant="outline" onClick={handleExportCSV}>
            <Download />
            Export CSV
          </Button>
        }
      />
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                className="pl-8 text-xs"
                placeholder="Search users or emails…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-36 text-xs">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="company_admin">Company Admin</SelectItem>
                <SelectItem value="platform_admin">Platform Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `${users.length} ${users.length === 1 ? "user" : "users"}`}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 size-4 animate-spin text-primary" />
            Loading platform users…
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <p className="text-xs text-destructive">Failed to load platform users.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 text-xs">
              Retry
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No users match your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                          {u.name ? u.name.slice(0, 2).toUpperCase() : "U"}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-foreground">{u.name || "Unnamed"}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Select
                        value={u.role}
                        onValueChange={(val) => handleRoleChange(u.id, val as any)}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="company_admin">Company Admin</SelectItem>
                          <SelectItem value="platform_admin">Platform Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td>
                      <span className="text-xs text-muted-foreground">{u.company || "— Independent"}</span>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          u.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            u.isActive ? "bg-emerald-500" : "bg-destructive"
                          )}
                        />
                        {u.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleToggleStatus(u.id, u.isActive, u.name)}
                        disabled={toggleStatusMutation.isPending}
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function CompaniesView() {
  const { data, isLoading, isError, refetch } = useAdminCompaniesQuery();
  const companies = data?.companies || [];

  return (
    <>
      <PageHeading
        title="Company Workspaces"
        subtitle="Multi-tenant team workspaces, custom rule enforcement, and member seats."
      />
      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 size-4 animate-spin text-primary" />
            Loading company workspaces…
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <p className="text-xs text-destructive">Failed to load company workspaces.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 text-xs">
              Retry
            </Button>
          </div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto size-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">No enterprise company workspaces yet</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              All registered accounts currently operate as independent developers. When a company account is provisioned, their shared rules, team members, and review metrics will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Tier</th>
                  <th>Members</th>
                  <th>Custom Rules</th>
                  <th>Reviews</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
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
                    <td className="font-mono">{c.rulesCount}</td>
                    <td className="font-mono">{c.reviewsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function PaymentsView() {
  const { data: statsData } = useAdminStatsQuery();
  const totalUsers = statsData?.kpis?.totalUsers ?? 0;

  return (
    <>
      <PageHeading
        title="Billing & Subscriptions"
        subtitle="Gateway status, subscription tiers, and developer licensing."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active accounts" value={totalUsers.toString()} delta="all tenants" icon={Users} />
        <Stat label="Payment gateway" value="Chapa" delta="Test mode" icon={CreditCard} />
        <Stat label="Billing frequency" value="Monthly" delta="ETB / USD" icon={CircleDollarSign} />
        <Stat label="Gateway status" value="Active" delta="Webhooks enabled" icon={CheckCircle2} />
      </div>
      <div className="panel p-12 text-center">
        <CreditCard className="mx-auto size-10 text-muted-foreground/40 mb-3" />
        <h3 className="text-sm font-semibold text-foreground">No billing transactions recorded yet</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
          The Chapa payment gateway integration is configured in development mode. As users upgrade from the Free tier to Pro or Enterprise plans, verified checkout sessions and invoices will be listed here.
        </p>
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
  const { user } = useAuthStore();
  const canManageRules =
    user?.role === "company_admin" ||
    user?.role === "platform_admin";

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CompanyRuleItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: rules = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCompanyRulesQuery(
    categoryFilter !== "all" ? { category: categoryFilter } : undefined
  );

  const toggleMutation = useToggleCompanyRuleMutation();
  const deleteMutation = useDeleteCompanyRuleMutation();

  const filteredRules = useMemo(() => {
    if (!searchQuery.trim()) return rules;
    const q = searchQuery.toLowerCase();
    return rules.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.ruleText.toLowerCase().includes(q)
    );
  }, [rules, searchQuery]);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (rule: CompanyRuleItem) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleToggle = async (rule: CompanyRuleItem) => {
    if (!canManageRules) return;
    try {
      await toggleMutation.mutateAsync(rule._id);
      toast.success(`Rule "${rule.name}" ${rule.enabled ? "disabled" : "enabled"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle rule");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!canManageRules) return;
    try {
      await deleteMutation.mutateAsync(id);
      setDeletingId(null);
      toast.success(`Rule "${name}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete rule");
    }
  };

  const categories = [
    { id: "all", label: "All categories" },
    { id: "security", label: "Security" },
    { id: "bug", label: "Bugs" },
    { id: "quality", label: "Quality" },
    { id: "performance", label: "Performance" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <>
      <PageHeading
        title="Company rules"
        subtitle={
          canManageRules
            ? "Enforce organization engineering standards and custom security policies across every review."
            : "Engineering standards enforced across your organization's code reviews (read-only)."
        }
        action={
          canManageRules ? (
            <Button onClick={handleOpenCreate}>
              <Plus className="size-4" />
              Create rule
            </Button>
          ) : undefined
        }
      />

      {isError && (
        <div className="mb-4 flex items-center justify-between rounded border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error instanceof Error ? error.message : "Failed to load company rules."}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      <div className="panel overflow-hidden">
        {/* Search and Category Filter Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules by name, description, pattern…"
              className="pl-8"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    categoryFilter === c.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content list */}
        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-4 p-4 animate-pulse">
                <div className="h-5 w-8 rounded-full bg-accent" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-44 rounded bg-accent" />
                  <div className="h-3 w-64 rounded bg-accent" />
                </div>
                <div className="h-5 w-16 rounded bg-accent" />
              </div>
            ))}
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-accent text-muted-foreground">
              <FileCode2 className="size-6 text-primary" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">
              {searchQuery || categoryFilter !== "all"
                ? "No matching rules found"
                : "No rules yet"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || categoryFilter !== "all"
                ? "Try adjusting your search terms or category filter."
                : "Add your team's first coding standard to automatically catch architectural flaws and security issues."}
            </p>
            {canManageRules && !searchQuery && categoryFilter === "all" && (
              <Button className="mt-5" onClick={handleOpenCreate}>
                <Plus className="size-4" />
                Create rule
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredRules.map((r) => (
              <div
                key={r._id}
                className={cn(
                  "flex flex-wrap items-center gap-3 p-4 transition-colors",
                  !r.enabled && "opacity-60 bg-surface/30"
                )}
              >
                <Switch
                  checked={r.enabled}
                  disabled={!canManageRules || toggleMutation.isPending}
                  onCheckedChange={() => handleToggle(r)}
                />

                <div className="min-w-52 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                      {r.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {r.description}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-primary/80 truncate max-w-lg">
                    Pattern: {r.ruleText}
                  </p>
                </div>

                <SeverityBadge severity={r.severity.toUpperCase() as Severity} />

                {canManageRules && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit rule"
                      onClick={() => handleOpenEdit(r)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete rule"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingId(r._id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/60 backdrop-blur-sm p-4">
          <div className="panel max-w-sm w-full p-5 space-y-4 border border-border shadow-xl">
            <h3 className="text-sm font-semibold text-foreground">Delete company rule?</h3>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to delete this rule? It will no longer be applied during code reviews.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingId(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const rule = rules.find((r) => r._id === deletingId);
                  if (rule) handleDelete(rule._id, rule.name);
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <LoaderCircle className="animate-spin size-3.5" /> : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Rule Modal */}
      {modalOpen && (
        <RuleModal
          rule={editingRule}
          onClose={() => {
            setModalOpen(false);
            setEditingRule(null);
          }}
        />
      )}
    </>
  );
}

function RuleModal({
  rule,
  onClose,
}: {
  rule: CompanyRuleItem | null;
  onClose: () => void;
}) {
  const isEdit = Boolean(rule);
  const [name, setName] = useState(rule?.name || "");
  const [category, setCategory] = useState<CompanyRuleItem["category"]>(
    rule?.category || "security"
  );
  const [severity, setSeverity] = useState<CompanyRuleItem["severity"]>(
    rule?.severity || "medium"
  );
  const [ruleText, setRuleText] = useState(rule?.ruleText || "");
  const [description, setDescription] = useState(rule?.description || "");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateCompanyRuleMutation();
  const updateMutation = useUpdateCompanyRuleMutation();
  const busy = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    const cleanDesc = description.trim();
    const cleanText = ruleText.trim();

    if (!cleanName || cleanName.length < 2) {
      setFormError("Rule name must be at least 2 characters.");
      return;
    }
    if (!cleanText || cleanText.length < 2) {
      setFormError("Rule pattern / rule text is required (min 2 characters).");
      return;
    }
    if (!cleanDesc || cleanDesc.length < 3) {
      setFormError("Description is required (min 3 characters).");
      return;
    }

    try {
      if (isEdit && rule) {
        await updateMutation.mutateAsync({
          id: rule._id,
          data: {
            name: cleanName,
            category,
            severity,
            ruleText: cleanText,
            description: cleanDesc,
          },
        });
        toast.success("Rule updated successfully");
      } else {
        await createMutation.mutateAsync({
          name: cleanName,
          category,
          severity,
          ruleText: cleanText,
          description: cleanDesc,
        });
        toast.success("Rule created successfully");
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save rule";
      setFormError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/60 backdrop-blur-sm p-4">
      <div className="panel max-w-lg w-full p-6 border border-border shadow-2xl relative space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {isEdit ? "Edit company rule" : "Create new company rule"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enforce architectural patterns and security standards across code reviews.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded"
          >
            <X className="size-4" />
          </button>
        </div>

        {formError && (
          <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Rule name
            </label>
            <Input
              required
              value={name}
              onChange={(e) => {
                setFormError(null);
                setName(e.target.value);
              }}
              placeholder="e.g. Disallow raw SQL queries"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="security" className="bg-background">Security</option>
                <option value="bug" className="bg-background">Bug</option>
                <option value="quality" className="bg-background">Quality</option>
                <option value="performance" className="bg-background">Performance</option>
                <option value="custom" className="bg-background">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="critical" className="bg-background">Critical</option>
                <option value="high" className="bg-background">High</option>
                <option value="medium" className="bg-background">Medium</option>
                <option value="low" className="bg-background">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Rule text / pattern
            </label>
            <Input
              required
              value={ruleText}
              onChange={(e) => {
                setFormError(null);
                setRuleText(e.target.value);
              }}
              placeholder="e.g. query\(.*\) or regex pattern"
              className="font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Description & remediation
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => {
                setFormError(null);
                setDescription(e.target.value);
              }}
              placeholder="Explain why this rule exists and how developers should fix violations."
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <LoaderCircle className="size-3.5 animate-spin mr-1.5" />}
              {isEdit ? "Save changes" : "Create rule"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
function InviteMemberModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const inviteMutation = useInviteCompanyMemberMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter a name and email.");
      return;
    }
    try {
      await inviteMutation.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        role,
      });
      toast.success(`Invited ${name.trim()} successfully!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to invite member");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-base font-semibold">Invite team member</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">Full name</label>
            <Input
              required
              placeholder="e.g. Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Email address</label>
            <Input
              required
              type="email"
              placeholder="e.g. alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="member">Member (can submit reviews and view team dashboard)</option>
              <option value="company_admin">Company admin (can manage team and rules)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Inviting..." : "Send invite"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Company() {
  const user = useAuthStore((s) => s.user);
  const { data: members = [], isLoading: membersLoading } = useCompanyMembersQuery(user?.id);
  const { data: metricsData } = useDashboardMetricsQuery(user?.id);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  return (
    <>
      <PageHeading
        title="Team & Members"
        subtitle="Organization-wide review activity and member access."
        action={
          <Button onClick={() => setInviteModalOpen(true)}>
            <User />
            Invite member
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Active members" value={String(members.length)} delta="Workspace seats" icon={Users} />
        <Stat label="Reviews total" value={String(metricsData?.totalReviews ?? 0)} delta="Across all members" icon={Activity} />
        <Stat label="Critical findings" value={String(metricsData?.criticalCount ?? 0)} delta="Across listed reviews" icon={ShieldAlert} />
      </div>
      <section className="panel mt-4 overflow-hidden">
        <div className="border-b border-border p-4 text-sm font-semibold">Members ({members.length})</div>
        {members.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {membersLoading ? "Loading members..." : "No members found in this workspace."}
          </div>
        ) : (
          members.map((m) => (
            <div className="flex items-center gap-3 border-b border-border p-4 last:border-0" key={m.id || m.email}>
              <div className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold">
                {m.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">{m.name}</p>
                <p className="text-[10px] text-muted-foreground">{m.email}</p>
              </div>
              <span className="rounded border border-border px-2 py-1 text-[10px]">
                {m.role}
              </span>
              <span className="status-dot">Active</span>
            </div>
          ))
        )}
      </section>

      {inviteModalOpen && (
        <InviteMemberModal onClose={() => setInviteModalOpen(false)} />
      )}
    </>
  );
}
function Billing() {
  const user = useAuthStore((state) => state.user);
  const role = useReviewStore((state) => state.role);
  const setApiResponse = useReviewStore((state) => state.setApiResponse);
  const subscription = useSubscriptionQuery(user?.id);
  const [pendingPlan, setPendingPlan] = useState<"pro" | "enterprise" | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const currentPlan = subscription.data?.plan ?? "free";
  const planRank: Record<SubscriptionTier, number> = { free: 0, pro: 1, enterprise: 2 };

  const startCheckout = async (plan: "pro" | "enterprise") => {
    setPendingPlan(plan);
    setPaymentError(null);
    const endpoint = plan === "pro" ? "/payment/pro/initiate" : "/payment/enterprise/initiate";
    try {
      const payment = await initiateSubscriptionPayment(plan);
      setApiResponse(`POST ${endpoint}`, {
        request: { plan },
        response: payment,
      });
      window.location.assign(payment.checkoutUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start Chapa checkout.";
      setPaymentError(message);
      setApiResponse(`POST ${endpoint}`, {
        request: { plan },
        ...apiFailure(error, message),
      });
    } finally {
      setPendingPlan(null);
    }
  };

  return (
    <>
      <PageHeading
        title={role === "member" ? "Upgrade your plan" : "Plans & billing"}
        subtitle={role === "member"
          ? "Choose a subscription upgrade and complete payment securely with Chapa."
          : "Subscription details retrieved from your ReviewX account."}
      />
      {paymentError && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span>{paymentError}</span>
          <button type="button" aria-label="Dismiss payment error" onClick={() => setPaymentError(null)} className="rounded p-1 hover:bg-destructive/10">
            <X className="size-4" />
          </button>
        </div>
      )}
      <section className="panel max-w-2xl p-5">
        {subscription.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Loading subscription…
          </div>
        ) : subscription.isError ? (
          <div role="alert" className="text-sm text-destructive">
            {subscription.error instanceof Error
              ? subscription.error.message
              : "Unable to retrieve subscription details."}
          </div>
        ) : subscription.data ? (
          <>
            <div className="flex items-center gap-3">
              <CreditCard className="size-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Current plan</p>
                <h2 className="text-lg font-semibold capitalize">{subscription.data.plan}</h2>
              </div>
              <span className="ml-auto rounded border border-border px-2 py-1 text-xs capitalize">
                {subscription.data.status}
              </span>
            </div>
            <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Started</dt>
                <dd className="mt-1">{new Date(subscription.data.startedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expires</dt>
                <dd className="mt-1">
                  {subscription.data.expiresAt
                    ? new Date(subscription.data.expiresAt).toLocaleString()
                    : "No expiration date"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Plan changes are managed by the subscription service. This workspace only displays the plan currently assigned to your account.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No subscription details were returned for this account.</p>
        )}
        {subscription.isError && (
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void subscription.refetch()}>
            Retry
          </Button>
        )}
      </section>
      {role === "member" && !subscription.isLoading && !subscription.isError && subscription.data && (
        <section className="mt-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Available upgrades</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Plan pricing and currency are supplied by the backend at checkout. Your subscription changes only after Chapa confirms payment.
            </p>
          </div>
          {planRank[currentPlan] === planRank.enterprise ? (
            <div className="panel flex items-start gap-3 p-5">
              <CheckCircle2 className="mt-0.5 size-5 text-success" />
              <div>
                <h3 className="text-sm font-semibold">You’re on the highest available plan</h3>
                <p className="mt-1 text-xs text-muted-foreground">Your Enterprise subscription is active. No further upgrade is available.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {([
                {
                  plan: "pro",
                  title: "Pro",
                  description: "For individual developers who need expanded review capabilities.",
                  features: ["Higher review limits", "AI-assisted analysis", "Archive uploads"],
                },
                {
                  plan: "enterprise",
                  title: "Enterprise",
                  description: "For teams using GitHub integration and advanced workspace features.",
                  features: ["Enterprise review capacity", "GitHub integration", "Scheduled reviews"],
                },
              ] as const)
                .filter(({ plan }) => planRank[plan] > planRank[currentPlan])
                .map(({ plan, title, description, features }) => (
                  <article key={plan} className="panel flex flex-col p-5">
                    <div className="flex items-center gap-2">
                      <CircleDollarSign className="size-5 text-primary" />
                      <h3 className="text-sm font-semibold">{title}</h3>
                      {plan === "pro" && <span className="ml-auto rounded border border-border px-2 py-0.5 text-[9px] uppercase text-muted-foreground">Popular</span>}
                    </div>
                    <p className="mt-3 min-h-10 text-xs leading-5 text-muted-foreground">{description}</p>
                    <ul className="my-4 flex-1 space-y-2">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-xs">
                          <Check className="size-3.5 text-success" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      disabled={pendingPlan !== null || currentPlan === plan}
                      onClick={() => void startCheckout(plan)}
                    >
                      {pendingPlan === plan ? (
                        <>
                          <LoaderCircle className="animate-spin" /> Starting secure checkout…
                        </>
                      ) : (
                        <>
                          <CreditCard /> Upgrade to {title}
                        </>
                      )}
                    </Button>
                  </article>
                ))}
            </div>
          )}
          <div className="flex items-start gap-2 rounded border border-border bg-surface-raised p-3 text-[11px] leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Checkout is handled by Chapa. The backend verifies the payment before changing your subscription; closing or returning from checkout does not itself mark a payment successful.
            </p>
          </div>
        </section>
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
  const {
    data: statsData,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useAdminStatsQuery();

  const kpis = statsData?.kpis;
  const systemEvents = statsData?.systemEvents || [];
  const activityTrend = statsData?.activityTrend || [
    { month: "May", count: 0, completed: 0 },
    { month: "Jun", count: 0, completed: 0 },
    { month: "Jul", count: 0, completed: 0 },
    { month: "Aug", count: 0, completed: 0 },
    { month: "Sep", count: 0, completed: 0 },
    { month: "Oct", count: 0, completed: 0 },
  ];
  const maxActivity = Math.max(...activityTrend.map((x) => x.count), 1);
  const topTenants = statsData?.topTenants || [];

  return (
    <>
      <PageHeading
        title="Platform overview"
        subtitle="System health, platform metrics, accounts, and live activity."
      />

      {/* ── Platform KPIs ── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              Total users
            </span>
            <span className="font-mono text-[10px] text-success">
              ↑ +{kpis?.newUsersThisMonth ?? 0} this month
            </span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">
            {isStatsLoading ? "…" : (kpis?.totalUsers ?? 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">registered accounts</div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileText className="size-3.5" />
              Reviews processed
            </span>
            <span className="font-mono text-[10px] text-success">
              {kpis?.completionRate ?? 100}% completion
            </span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">
            {isStatsLoading ? "…" : (kpis?.totalReviews ?? 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {kpis?.completedReviews ?? 0} completed · {kpis?.failedReviews ?? 0} failed
          </div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="size-3.5" />
              Total findings
            </span>
            <span className="font-mono text-[10px] text-destructive">
              {kpis?.criticalFindings ?? 0} critical
            </span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">
            {isStatsLoading ? "…" : (kpis?.totalFindings ?? 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {kpis?.highFindings ?? 0} high severity issues
          </div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Activity className="size-3.5" />
              System status
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-success">
              <span className="size-1.5 rounded-full bg-success" />
              Operational
            </span>
          </div>
          <div className="mt-3 font-mono text-3xl font-semibold text-foreground">100%</div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {Math.floor((kpis?.uptimeSeconds ?? 0) / 3600)}h uptime · {kpis?.activeEnvironment || "production"}
          </div>
        </div>
      </div>

      {/* ── Review activity trend + Quick actions ── */}
      <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_240px]">
        <section className="panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Review activity trend</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Code reviews processed · last 6 months</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-semibold text-foreground">
                {isStatsLoading ? "…" : `${kpis?.totalReviews ?? 0} total`}
              </div>
              <div className="text-[10px] text-success">
                {kpis?.completedReviews ?? 0} completed successfully
              </div>
            </div>
          </div>
          <div className="mt-6 flex h-32 items-end gap-3">
            {activityTrend.map((d, i) => {
              const isLast = i === activityTrend.length - 1;
              const heightPercent = d.count > 0 ? (d.count / maxActivity) * 100 : 4;
              return (
                <div
                  key={d.month}
                  className="group flex flex-1 flex-col items-center gap-1.5"
                  title={`${d.count} reviews in ${d.month} (${d.completed} completed)`}
                >
                  <div className="flex h-24 w-full items-end">
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-colors",
                        isLast ? "bg-primary" : "bg-primary/25 group-hover:bg-primary/50",
                        d.count === 0 && "bg-muted/40"
                      )}
                      style={{ height: `${heightPercent}%` }}
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
              { label: "User accounts",     view: "users"     as const, icon: Users           },
              { label: "Tenant workspaces", view: "companies" as const, icon: Building2        },
              { label: "Company rules",     view: "rules"     as const, icon: ShieldAlert      },
              { label: "All code reviews",  view: "history"   as const, icon: History          },
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

      {/* ── Enterprise workspaces + Activity feed ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Enterprise workspaces</h2>
            <Button variant="ghost" size="sm" onClick={() => setView("companies")}>View all</Button>
          </div>
          {topTenants.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="mx-auto size-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-medium text-foreground">No enterprise workspaces registered yet</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                All registered accounts are currently operating as independent developers.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Workspace</th>
                    <th>Plan</th>
                    <th>Members</th>
                    <th>Rules</th>
                    <th>Health</th>
                  </tr>
                </thead>
                <tbody>
                  {topTenants.map((c) => (
                    <tr key={c.id || c.name}>
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
                      <td className="font-mono">{c.rules}</td>
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
          )}
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
            {isStatsLoading ? (
              <div className="flex items-center justify-center p-8 text-xs text-muted-foreground">
                <LoaderCircle className="mr-2 size-3.5 animate-spin text-primary" />
                Loading recent activity…
              </div>
            ) : isStatsError ? (
              <div className="p-6 text-center text-xs text-destructive">
                Failed to load system activity.
              </div>
            ) : systemEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No recent activity recorded yet.
              </div>
            ) : (
              systemEvents.map((e) => {
                const IconComponent =
                  e.icon === "rev"
                    ? Code2
                    : e.icon === "usr"
                    ? Users
                    : e.icon === "co"
                    ? Building2
                    : e.icon === "pay"
                    ? CircleDollarSign
                    : Activity;
                return (
                  <div key={e.id || e.text} className="flex items-center gap-3 px-4 py-3">
                    <div className="grid size-7 shrink-0 place-items-center rounded bg-accent">
                      <IconComponent className="size-3.5 text-muted-foreground" />
                    </div>
                    <span className="flex-1 text-xs text-foreground">{e.text}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{e.time}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </>
  );
}
