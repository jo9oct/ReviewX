import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Plus,
  History,
  ShieldAlert,
  FileText,
  ShieldCheck,
  Users,
  CreditCard,
  Settings,
  User,
  Mic,
  HelpCircle,
  LogOut,
  X,
  Activity,
  Building2,
  Layers,
  Mail,
  SlidersHorizontal,
  BookOpen,
  Keyboard,
  ChevronDown,
  Check,
  Lock,
  Bell,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AuthUser,
  WorkspaceEntry,
  switchWorkspace,
  setAuthToken,
  getCurrentUser,
  useDashboardMetricsQuery,
  useInvitationsQuery,
} from "@/lib/api";
import {
  useSubscriptionQuery,
  useUpgradeRequestMutation,
  TIER_POLICIES,
  type SubscriptionTier,
} from "@/lib/review-api";
import { useReviewStore, type View } from "@/lib/review-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/primitives";

export type CompanyRole = "owner" | "admin" | "member" | "viewer" | "platform_admin";

/**
 * Resolve display role — prefers the server-computed companyRole from /auth/me.
 * Falls back to role-string mapping only for platform_admin.
 */
export function resolveCompanyRole(user?: AuthUser | null): CompanyRole {
  if (!user) return "member";
  const r = (user.role || "").toLowerCase();
  if (r === "platform_admin" || r === "platform") return "platform_admin";
  if (user.activeWorkspace?.role === "owner" || user.companyRole === "owner" || user.isOwner === true) return "owner";
  if (user.activeWorkspace?.role === "admin" || user.companyRole === "admin") return "admin";
  if (user.activeWorkspace?.role === "viewer") return "viewer";
  if (user.activeWorkspace?.role === "member" || user.companyRole === "member") return "member";
  if (r === "company_admin" || r === "admin" || r === "company") return "admin";
  return "member";
}

export interface NavItemDef {
  id: string;
  label: string;
  view?: View;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  allowedRoles: CompanyRole[];
  badgeType?: "critical_findings" | "pending_invites" | "upgrade_requests";
  action?: "voice" | "docs";
  /** Feature flag key from subscription.features — if set and flag is false, item shows a lock */
  featureFlag?: string;
}

export interface NavSectionDef {
  id: "work" | "company" | "account" | "platform" | "system";
  title: string;
  items: NavItemDef[];
}

export const SIDEBAR_SECTIONS: NavSectionDef[] = [
  {
    id: "work",
    title: "Work",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        view: "dashboard",
        icon: LayoutDashboard,
        description: "Company overview: review count, average score, open critical findings",
        allowedRoles: ["owner", "admin", "member", "viewer", "platform_admin"],
      },
      {
        id: "new",
        label: "New Review",
        view: "new",
        icon: Plus,
        description: "Paste/upload code, pick language",
        allowedRoles: ["owner", "admin", "member", "viewer", "platform_admin"],
      },
      {
        id: "history",
        label: "Reviews",
        view: "history",
        icon: History,
        description: "All company reviews (admins) or only your own (members)",
        allowedRoles: ["owner", "admin", "member", "viewer", "platform_admin"],
      },
      {
        id: "findings",
        label: "Findings",
        view: "findings",
        icon: ShieldAlert,
        description: "Cross-review findings with filters by severity, category, status",
        badgeType: "critical_findings",
        allowedRoles: ["owner", "admin", "member", "viewer", "platform_admin"],
      },
      {
        id: "reports",
        label: "Reports",
        view: "reports",
        icon: FileText,
        description: "JSON and PDF reports",
        allowedRoles: ["owner", "admin", "member", "viewer", "platform_admin"],
      },
      {
        id: "notifications",
        label: "Notifications",
        view: "notifications",
        icon: Bell,
        description: "View and manage notifications",
        allowedRoles: ["owner", "admin", "member", "viewer", "platform_admin"],
      },
    ],
  },
  {
    id: "company",
    title: "Company",
    items: [
      {
        id: "rules",
        label: "Company Rules",
        view: "rules",
        icon: ShieldCheck,
        description: "Create, edit and enable/disable rules",
        allowedRoles: ["owner", "admin", "member", "platform_admin"],
        featureFlag: "companyRules",
      },
      {
        id: "members",
        label: "Members",
        view: "company",
        icon: Users,
        description: "Member list, roles and status, plus invitations",
        badgeType: "pending_invites",
        allowedRoles: ["owner", "admin", "member", "platform_admin"],
      },
      {
        id: "billing",
        label: "Subscription & Billing",
        view: "billing",
        icon: CreditCard,
        description: "Current plan, usage against limits, Chapa payment",
        badgeType: "upgrade_requests",
        allowedRoles: ["owner", "admin"],
      },
      {
        id: "settings",
        label: "Company Settings",
        view: "settings",
        icon: Settings,
        description: "Company name, details, delete or transfer ownership",
        allowedRoles: ["owner", "admin", "platform_admin"],
      },
    ],
  },
  {
    id: "account",
    title: "Account",
    items: [
      {
        id: "profile",
        label: "Profile",
        view: "profile",
        icon: User,
        description: "Name, password, sessions",
        allowedRoles: ["owner", "admin", "member", "viewer", "platform_admin"],
      },
      {
        id: "voice",
        label: "Voice assistant",
        icon: Mic,
        description: "Voxide entry point for review questions",
        action: "voice",
        allowedRoles: ["owner", "admin", "member", "platform_admin"],
        featureFlag: "aiAnalysis",
      },
      {
        id: "docs",
        label: "Help / Docs",
        icon: HelpCircle,
        description: "Help and documentation",
        action: "docs",
        allowedRoles: ["owner", "member", "platform_admin"],
      },
    ],
  },
];

const PLATFORM_SECTION: NavSectionDef = {
  id: "platform",
  title: "Platform",
  items: [
    {
      id: "admin",
      label: "Overview",
      view: "admin",
      icon: Activity,
      description: "Platform health, revenue KPIs, signups, queue status",
      allowedRoles: ["platform_admin"],
    },
    {
      id: "users",
      label: "Users",
      view: "users",
      icon: Users,
      description: "Platform user management",
      allowedRoles: ["platform_admin"],
    },
    {
      id: "companies",
      label: "Companies",
      view: "companies",
      icon: Building2,
      description: "Tenant company management",
      allowedRoles: ["platform_admin"],
    },
    {
      id: "admin-reviews",
      label: "Reviews",
      view: "admin-reviews",
      icon: History,
      description: "All platform reviews — monitoring only",
      allowedRoles: ["platform_admin"],
    },
    {
      id: "payments",
      label: "Subscription & Billing",
      view: "payments",
      icon: CreditCard,
      description: "Platform revenue, workspaces, payments, and plans",
      allowedRoles: ["platform_admin"],
    },
    {
      id: "activity",
      label: "Activity / Audit Log",
      view: "activity",
      icon: Activity,
      description: "Full platform audit trail",
      allowedRoles: ["platform_admin"],
    },
  ],
};

const SYSTEM_SECTION: NavSectionDef = {
  id: "system",
  title: "System",
  items: [
    {
      id: "queues",
      label: "Queues & Jobs",
      view: "queues",
      icon: Layers,
      description: "BullMQ queue health, failures, and retries",
      allowedRoles: ["platform_admin"],
    },
    {
      id: "webhooks",
      label: "Webhooks & Email",
      view: "webhooks",
      icon: Mail,
      description: "Chapa webhook logs and Resend email delivery logs",
      allowedRoles: ["platform_admin"],
    },
    {
      id: "platform-settings",
      label: "Settings",
      view: "platform-settings",
      icon: SlidersHorizontal,
      description: "Platform-wide configuration and feature flags",
      allowedRoles: ["platform_admin"],
    },
  ],
};

const ACCOUNT_PLATFORM_SECTION: NavSectionDef = {
  id: "account",
  title: "Account",
  items: [
    {
      id: "profile",
      label: "Profile / Security",
      view: "profile",
      icon: User,
      description: "Name, password, sessions, and security",
      allowedRoles: ["platform_admin"],
    },
  ],
};

// ── WorkspaceSwitcher ─────────────────────────────────────────────────────────

interface WorkspaceSwitcherProps {
  currentUser: AuthUser | null | undefined;
  role: CompanyRole;
  plan: string;
  roleBadgeStyles: Record<CompanyRole, { text: string; className: string }>;
  onSwitch: () => void;
  setView: (v: View) => void;
}

function WorkspaceSwitcher({
  currentUser,
  role,
  plan,
  roleBadgeStyles,
  onSwitch,
  setView,
}: WorkspaceSwitcherProps) {
  const [open, setOpen]         = useState(false);
  const [switching, setSwitching] = useState(false);
  const queryClient             = useQueryClient();
  const authStore               = useAuthStore();
  const ref                     = useRef<HTMLDivElement>(null);

  const workspaces  = currentUser?.workspaces ?? [];
  const active      = currentUser?.activeWorkspace;
  const planLabel = active?.status === "trialing"
    ? `${(active?.planCode ?? plan).toUpperCase()} TRIAL`
    : (active?.planCode ?? plan).toUpperCase();

  const orgName = active?.name
    ?? (role === "platform_admin" ? "ReviewX Platform" : `${currentUser?.name ?? ""}'s Workspace`);
  const orgInitials = (orgName || "RX")
    .split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase() || "RX";

  const currentBadge = roleBadgeStyles[role];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleSwitch(entry: WorkspaceEntry) {
    if (entry.type === active?.type && entry.companyId === active?.companyId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      const result = await switchWorkspace(entry.type, entry.companyId ?? undefined);
      setAuthToken(result.token);
      const updatedUser = await getCurrentUser();
      authStore.setAuth(updatedUser, result.token);
      // Clear all cached query data — switching workspace changes everything
      queryClient.clear();
      setOpen(false);
      onSwitch();
      setView("dashboard");
    } catch {
      toast.error("Failed to switch workspace");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !switching && setOpen((o) => !o)}
        disabled={switching}
        className="flex w-full items-center gap-2 rounded border border-border bg-surface-raised p-2 hover:bg-accent/60 transition-colors disabled:opacity-60"
      >
        <div className="grid size-7 shrink-0 place-items-center rounded bg-accent text-xs font-semibold">
          {orgInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-foreground">{orgName}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={cn(
                "inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[9px] font-medium leading-none",
                currentBadge.className,
              )}
            >
              {currentBadge.text}
            </span>
            {/* Plan badge — workspace card only (not duplicated in footer) */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setView("billing"); }}
              className="inline-flex items-center rounded-sm border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-medium leading-none text-primary uppercase hover:bg-primary/20 transition-colors"
              title="Subscription Plan — click to manage"
            >
              {planLabel}
            </button>
          </div>
        </div>
        <ChevronDown
          className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open && workspaces.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded border border-border bg-popover shadow-lg py-1">
          {workspaces.map((entry) => {
            const isActive = entry.type === active?.type && entry.companyId === active?.companyId;
            return (
              <button
                key={entry.companyId ?? "personal"}
                type="button"
                onClick={() => handleSwitch(entry)}
                disabled={switching}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-accent/60 transition-colors disabled:opacity-60"
              >
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate font-medium text-foreground">{entry.name}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{entry.role}</div>
                </div>
                <span className="shrink-0 font-mono text-[9px] uppercase text-muted-foreground">
                  {entry.planCode}
                </span>
                {isActive && <Check className="size-3 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── UsageBar ──────────────────────────────────────────────────────────────────

interface UsageBarProps {
  usage?: { reviews: { used: number; limit: number | null } } | null;
  role: CompanyRole;
  pendingRequest?: { exists: boolean } | null;
  setView: (v: View) => void;
}

function UsageBar({ usage, role, pendingRequest, setView }: UsageBarProps) {
  const upgradeRequestMutation = useUpgradeRequestMutation();
  const used = usage?.reviews?.used ?? 0;
  const limit = usage?.reviews?.limit ?? 50;

  const pct = Math.min(100, Math.round((used / limit) * 100));
  const isNearLimit = pct >= 80;

  return (
    <div className="px-3 pb-2">
      <div className="rounded border border-border bg-surface-raised p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">
            {used} of {limit} reviews used
          </span>
          <span className={cn("font-medium", isNearLimit ? "text-amber-400" : "text-muted-foreground")}>
            {pct}%
          </span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", isNearLimit ? "bg-amber-400" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
        {role === "owner" && (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-6 text-[10px]"
            onClick={() => setView("billing")}
          >
            Upgrade
          </Button>
        )}
        {(role === "admin" || role === "member") && (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-6 text-[10px]"
            disabled={pendingRequest?.exists === true || upgradeRequestMutation.isPending}
            onClick={() => upgradeRequestMutation.mutate({ message: "" })}
          >
            {pendingRequest?.exists === true
              ? "Request sent ✓"
              : upgradeRequestMutation.isPending
              ? "Sending…"
              : "Request upgrade"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── LockTooltip ───────────────────────────────────────────────────────────────

function LockTooltip({ label, featureFlag }: { label: string; featureFlag: string }) {
  const [open, setOpen] = useState(false);
  const featureNames: Record<string, string> = {
    companyRules: "Team",
    aiAnalysis:   "Pro",
    pdfReport:    "Team",
    githubIntegration: "Team",
  };
  const requiredPlan = featureNames[featureFlag] ?? "a higher";
  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="p-0.5 rounded text-muted-foreground hover:text-foreground"
        title={`Upgrade to ${requiredPlan} to unlock`}
      >
        <Lock className="size-3" />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1 z-50 w-44 rounded border border-border bg-popover p-2 text-[10px] text-muted-foreground shadow-lg">
          <p className="font-medium text-foreground mb-0.5">Feature locked</p>
          <p>Upgrade to the <span className="font-medium text-foreground">{requiredPlan}</span> plan to unlock <em>{label}</em>.</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface CompanyDashboardSidebarProps {
  currentUser?: AuthUser | null;
  mobileNav?: boolean;
  setMobileNav?: (open: boolean) => void;
  className?: string;
  onOpenDocs?: () => void;
  onOpenVoice?: () => void;
}

export function CompanyDashboardSidebar({
  currentUser,
  mobileNav = false,
  setMobileNav,
  className,
  onOpenDocs,
  onOpenVoice,
}: CompanyDashboardSidebarProps) {
  const { view, setView } = useReviewStore();
  const [docsModalOpen, setDocsModalOpen] = useState(false);

  const role = resolveCompanyRole(currentUser);

  // Live subscription — now includes usage, features, and pendingRequest
  const subscriptionQuery = useSubscriptionQuery(currentUser?.id);
  const plan = ((currentUser?.activeWorkspace?.planCode ?? subscriptionQuery.data?.plan ?? "free").toLowerCase()) as SubscriptionTier;
  const policy = TIER_POLICIES[plan] ?? TIER_POLICIES.free;
  const features: Record<string, boolean> = {
    ...policy,
    ...(subscriptionQuery.data?.features ?? {}),
  };
  const usage          = subscriptionQuery.data?.usage ?? null;
  const pendingRequest = subscriptionQuery.data?.pendingRequest ?? null;

  // Live query metrics for dynamic badges
  const metricsQuery         = useDashboardMetricsQuery(currentUser?.id);
  const criticalFindingsCount = metricsQuery.data?.criticalCount ?? 0;

  // Invitations badge
  const canManageInvitations  = role === "owner" || role === "admin" || role === "platform_admin";
  const invitationsQuery      = useInvitationsQuery(canManageInvitations);
  const pendingInvitationsCount =
    invitationsQuery.data?.filter((inv) => inv.status === "pending").length ?? 0;

  // Active workspace — drives Company group visibility
  const activeWorkspaceType = currentUser?.activeWorkspace?.type ?? "personal";
  const isPersonalWorkspace = activeWorkspaceType === "personal";

  const roleBadgeStyles: Record<CompanyRole, { text: string; className: string }> = {
    owner: {
      text: "Owner",
      className: "border-purple-500/30 bg-purple-500/10 text-purple-400",
    },
    admin: {
      text: "Admin",
      className: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    },
    member: {
      text: "Member",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    },
    viewer: {
      text: "Viewer",
      className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
    },
    platform_admin: {
      text: "Platform Admin",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    },
  };

  // Filter sections:
  // - platform_admin sees platform/system sections
  // - personal workspace hides the Company group entirely
  const allSections: NavSectionDef[] =
    role === "platform_admin"
      ? [PLATFORM_SECTION, SYSTEM_SECTION, ACCOUNT_PLATFORM_SECTION]
      : SIDEBAR_SECTIONS.filter(
          (s) => !(s.id === "company" && isPersonalWorkspace),
        );

  const sectionsToRender = allSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.allowedRoles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  const handleItemClick = (item: NavItemDef) => {
    // Locked item — do nothing (the LockTooltip handles the click)
    if (item.featureFlag && features[item.featureFlag] !== true) return;

    if (setMobileNav) setMobileNav(false);

    if (item.action === "voice") {
      if (onOpenVoice) {
        onOpenVoice();
      } else {
        toast.info("Voice assistant is ready", {
          description:
            "Use the floating Voxide microphone widget in the bottom-right corner to speak.",
        });
      }
      return;
    }

    if (item.action === "docs") {
      if (onOpenDocs) {
        onOpenDocs();
      } else {
        setDocsModalOpen(true);
      }
      return;
    }

    if (item.view) {
      setView(item.view);
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileNav && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNav?.(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Company Workspace Navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-sidebar transition-transform lg:translate-x-0",
          mobileNav ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          className,
        )}
      >
        {/* Brand Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <img src="/my-icon.png" alt="ReviewX" className="size-7 rounded object-contain" />
            <span className="font-semibold tracking-tight">ReviewX</span>
            <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
              BETA
            </span>
          </div>
          {setMobileNav && (
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-accent lg:hidden"
              onClick={() => setMobileNav(false)}
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Workspace Switcher */}
        <div className="border-b border-border p-3">
          <WorkspaceSwitcher
            currentUser={currentUser}
            role={role}
            plan={plan}
            roleBadgeStyles={roleBadgeStyles}
            onSwitch={() => setMobileNav?.(false)}
            setView={setView}
          />
        </div>

        {/* Scrollable Navigation Sections */}
        <nav className="flex-1 space-y-5 overflow-y-auto p-3 scrollbar-none">
          {sectionsToRender.map((section) => (
            <div key={section.id}>
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    (item.view && view === item.view) ||
                    (item.view === "new" && ["result", "finding"].includes(view));

                  // Feature lock check — driven by API flags, not hardcoded tier order
                  const isLocked =
                    Boolean(item.featureFlag) &&
                    features[item.featureFlag!] !== true;

                  // Badge calculation
                  let badgeNode: React.ReactNode = null;
                  if (item.badgeType === "critical_findings" && criticalFindingsCount > 0) {
                    badgeNode = (
                      <span className="ml-auto inline-flex items-center rounded-full bg-red-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-red-400">
                        {criticalFindingsCount}
                      </span>
                    );
                  } else if (item.badgeType === "pending_invites" && pendingInvitationsCount > 0) {
                    badgeNode = (
                      <span className="ml-auto inline-flex items-center rounded-full bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-400">
                        {pendingInvitationsCount}
                      </span>
                    );
                  }

                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      title={isLocked ? `Upgrade to unlock ${item.label}` : item.description}
                      className={cn(
                        "group flex h-8 w-full items-center gap-2 rounded px-2 text-xs transition-colors",
                        isLocked
                          ? "cursor-default text-muted-foreground/50"
                          : isActive
                          ? "bg-accent text-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      {isLocked ? (
                        <Lock className="size-3.5 shrink-0 text-muted-foreground/50" />
                      ) : (
                        <Icon className="size-3.5 shrink-0 transition-transform group-hover:scale-105" />
                      )}
                      <span className={cn("truncate", isLocked && "line-through decoration-muted-foreground/30")}>
                        {item.label}
                      </span>
                      {isLocked ? (
                        <LockTooltip label={item.label} featureFlag={item.featureFlag!} />
                      ) : (
                        badgeNode
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Plan usage bar — shown above Account section */}
          {role !== "platform_admin" && (
            <UsageBar
              usage={usage}
              role={role}
              pendingRequest={pendingRequest}
              setView={setView}
            />
          )}
        </nav>

        {/* Account / User Footer — plan badge removed (lives on workspace card only) */}
        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setView("profile");
                setMobileNav?.(false);
              }}
              className="flex flex-1 items-center gap-2 rounded p-1.5 hover:bg-accent min-w-0 transition-colors text-left"
            >
              <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {(currentUser?.name || "U")
                  .split(" ")
                  .map((n) => n[0] ?? "")
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                {/* Name only — no plan badge here (Task 9: remove duplicate) */}
                <div className="truncate text-xs font-medium text-foreground">
                  {currentUser?.name || "My Account"}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {currentUser?.email || "Signed in"}
                </div>
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
        </div>
      </aside>

      {/* Built-in Help & Docs Dialog */}
      {docsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="panel w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="size-5 text-primary" />
                <h2 className="text-base font-semibold">ReviewX Help & Docs</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDocsModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                  <Keyboard className="size-4 text-primary" />
                  Quick Navigation
                </h3>
                <p className="mt-1 text-muted-foreground">
                  Navigate seamlessly between workspace reviews, organisation rules, and member
                  settings using the sidebar.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1">Company Workspace Roles</h3>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li>
                    <strong className="text-foreground">Owner:</strong> Full access — billing, team
                    settings, all work.
                  </li>
                  <li>
                    <strong className="text-foreground">Admin:</strong> Team invitations, rules, review
                    audits.
                  </li>
                  <li>
                    <strong className="text-foreground">Member:</strong> Code reviews and finding
                    inspection.
                  </li>
                  <li>
                    <strong className="text-foreground">Viewer:</strong> Read-only access to reviews,
                    findings, reports.
                  </li>
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setDocsModalOpen(false)}>Got it</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
