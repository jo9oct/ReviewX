import React, { useState, useMemo } from "react";
import {
  CreditCard,
  TrendingUp,
  Users,
  ShieldAlert,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Download,
  ExternalLink,
  ChevronRight,
  Edit,
  Eye,
  Sliders,
  FileSpreadsheet,
  Activity,
  History,
  Building2,
  User,
  Zap,
  Check,
  X,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Switch, Progress } from "@/components/primitives";
import { cn } from "@/lib/utils";
import {
  useBillingOverviewQuery,
  useAdminSubscriptionsQuery,
  useAdminSubscriptionDetailQuery,
  useGrantExtendSubscriptionMutation,
  useChangeSubscriptionPlanMutation,
  useCancelExpireSubscriptionMutation,
  useReactivateSubscriptionMutation,
  useResetSubscriptionUsageMutation,
  useApplyCustomLimitsMutation,
  useAdminPaymentsQuery,
  useAdminPaymentDetailQuery,
  useReverifyPaymentMutation,
  useRefundPaymentMutation,
  useResendReceiptMutation,
  useReconciliationQuery,
  useCataloguePlansQuery,
  useUpdateCataloguePlanMutation,
  useUsageMonitoringQuery,
  useWebhookLogsQuery,
  useReplayWebhookMutation,
  useBillingAuditLogsQuery,
  type AdminSubscriptionItem,
  type AdminPaymentItem,
  type CataloguePlan,
} from "@/lib/adminBilling-api";

type TabKey = "overview" | "subscriptions" | "payments" | "plans" | "usage" | "health";

export function PlatformBillingHub() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div className="space-y-6">
      {/* ── Hub Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Platform Billing & Subscriptions
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Platform-wide revenue, workspace subscription lifecycles, Chapa transactions, and dynamic catalogue controls.
          </p>
        </div>

        {/* ── Sub Navigation Tabs ── */}
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-card p-1 shadow-sm">
          {(
            [
              { key: "overview", label: "Overview", icon: TrendingUp },
              { key: "subscriptions", label: "Subscriptions", icon: Users },
              { key: "payments", label: "Payments", icon: CreditCard },
              { key: "plans", label: "Plans Catalogue", icon: Sliders },
              { key: "usage", label: "Usage & Limits", icon: Activity },
              { key: "health", label: "Health & Logs", icon: History },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Views ── */}
      {activeTab === "overview" && <RevenueOverviewTab onNavigate={setActiveTab} />}
      {activeTab === "subscriptions" && <SubscriptionsTab />}
      {activeTab === "payments" && <PaymentsTab />}
      {activeTab === "plans" && <PlansCatalogueTab />}
      {activeTab === "usage" && <UsageMonitoringTab onNavigate={setActiveTab} />}
      {activeTab === "health" && <HealthAndLogsTab />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: REVENUE OVERVIEW (LANDING PAGE)
// ─────────────────────────────────────────────────────────────────────────────

function RevenueOverviewTab({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { data: overview, isLoading, isError, error, refetch } = useBillingOverviewQuery();

  if (isLoading && !overview) {
    return (
      <div className="panel flex min-h-[350px] flex-col items-center justify-center gap-3 p-8">
        <RefreshCw className="size-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground animate-pulse">
          Loading platform revenue and billing analytics...
        </p>
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div className="panel flex min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm font-semibold text-foreground">Unable to load platform billing analytics</p>
        <p className="max-w-md text-xs text-muted-foreground">
          {(error as any)?.message || "Failed to load overview data."}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
          <RefreshCw className="size-3.5 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  const { revenue, mrr, activeSubscriptions, conversion, trials, churn, atRisk, paymentHealth, planMix } = overview;
  const maxTrendRevenue = Math.max(...(revenue.trend?.map((t) => t.revenue) || [1]), 100);

  return (
    <div className="space-y-6">
      {/* ── Top Metric Cards Grid ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Revenue This Month */}
        <div className="panel p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CreditCard className="size-3.5 text-primary" />
              Revenue (This Month)
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">ETB</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-foreground">
            {revenue.thisMonth.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ETB</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Last month: {revenue.lastMonth.toLocaleString()} ETB</span>
            <span className="font-mono text-primary font-medium">YTD: {revenue.ytd.toLocaleString()}</span>
          </div>
        </div>

        {/* MRR */}
        <div className="panel p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-success" />
              Estimated MRR
            </span>
            <span className="text-[10px] text-success font-medium">Normalized</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-foreground">
            {mrr.amount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ETB/mo</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Annual tiers amortized monthly across {activeSubscriptions.totalPaid} paid workspaces
          </div>
        </div>

        {/* Active Subscriptions Mix */}
        <div className="panel p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 text-sky-500" />
              Active Paid Workspaces
            </span>
            <button
              onClick={() => onNavigate("subscriptions")}
              className="text-[10px] text-primary hover:underline"
            >
              View list →
            </button>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-foreground">
            {activeSubscriptions.totalPaid}{" "}
            <span className="text-xs font-normal text-muted-foreground">({activeSubscriptions.free} Free)</span>
          </div>
          <div className="mt-1 flex gap-2 font-mono text-[10px] text-muted-foreground">
            <span className="text-foreground">Pro: {activeSubscriptions.pro}</span>
            <span>•</span>
            <span className="text-foreground">Team: {activeSubscriptions.team}</span>
            <span>•</span>
            <span className="text-foreground">Ent: {activeSubscriptions.enterprise}</span>
          </div>
        </div>

        {/* Conversion & Churn */}
        <div className="panel p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-500" />
              Free-to-Paid Conversion
            </span>
            <span className="font-mono text-[10px] text-amber-500 font-semibold">{conversion.freeToPaidRate}%</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-foreground">
            {conversion.upgradedLast30d}{" "}
            <span className="text-xs font-normal text-muted-foreground">upgrades (30d)</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Churn this month: {churn.churnedThisMonth}</span>
            <span className="text-success">Reactivated: {churn.reactivatedThisMonth}</span>
          </div>
        </div>
      </div>

      {/* ── Middle Row: 12-Month Trend Chart + Plan Mix ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Trend Bar Chart */}
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">12-Month Revenue Trend (ETB)</h2>
              <p className="text-xs text-muted-foreground">Monthly collected revenue from verified payments</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3.5" />
            </Button>
          </div>

          <div className="mt-6 flex h-48 items-end gap-2 border-b border-border pb-2 pt-6">
            {revenue.trend?.map((item, idx) => {
              const heightPct = Math.max(8, Math.round((item.revenue / maxTrendRevenue) * 100));
              return (
                <div key={idx} className="group relative flex flex-1 flex-col items-center h-full justify-end">
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute -top-10 z-10 hidden rounded bg-popover px-2 py-1 text-[10px] font-mono text-popover-foreground shadow-md group-hover:block whitespace-nowrap">
                    {item.label}: {item.revenue.toLocaleString()} ETB ({item.paymentsCount} tx)
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={cn(
                      "w-full rounded-t transition-all",
                      item.revenue > 0 ? "bg-primary hover:bg-primary/80" : "bg-muted/40",
                    )}
                  />
                  <span className="mt-2 text-[10px] text-muted-foreground">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan Mix Breakdown */}
        <div className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground">Revenue by Plan Mix (YTD)</h2>
          <p className="text-xs text-muted-foreground">Revenue share across subscription tiers</p>

          <div className="mt-5 space-y-4">
            {(
              [
                { key: "pro", label: "Pro Tier", color: "bg-sky-500", data: planMix["pro"] },
                { key: "team", label: "Team Tier", color: "bg-primary", data: planMix["team"] },
                { key: "enterprise", label: "Enterprise Tier", color: "bg-indigo-600", data: planMix["enterprise"] },
              ] as const
            ).map((p) => {
              const totalYtd = Math.max(revenue.ytd, 1);
              const sharePct = Math.round(((p.data?.revenue || 0) / totalYtd) * 100);
              return (
                <div key={p.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{p.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {(p.data?.revenue || 0).toLocaleString()} ETB ({sharePct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", p.color)} style={{ width: `${Math.min(100, sharePct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Pricing Policy:</span> Annual billing discounts 2 months of monthly fees (10x multiplier).
          </div>
        </div>
      </div>

      {/* ── Operational Health & Risk Flags ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Trials & Ending this week */}
        <div className="panel p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Clock className="size-4 text-primary" />
              Active Trials
            </span>
            <span className="font-mono text-xs font-semibold text-primary">{trials.activeTrials} active</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{trials.endingThisWeek}</span> team trials ending this week.
          </p>
          <div className="mt-3 text-[11px] text-muted-foreground">
            Estimated trial-to-paid upgrade rate: <span className="font-mono text-foreground">{trials.trialToPaidRate}%</span>
          </div>
        </div>

        {/* At Risk */}
        <div className="panel p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <AlertTriangle className="size-4 text-amber-500" />
              Subscriptions at Risk
            </span>
            <span className="font-mono text-xs font-semibold text-amber-500">
              {atRisk.pastDueCount + atRisk.expiringIn7Days} total
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{atRisk.pastDueCount}</span> past due accounts and{" "}
            <span className="font-semibold text-foreground">{atRisk.expiringIn7Days}</span> expiring in 7 days.
          </p>
          <button
            onClick={() => onNavigate("subscriptions")}
            className="mt-3 text-[11px] text-primary hover:underline"
          >
            Filter expiring subscriptions →
          </button>
        </div>

        {/* Payment Health */}
        <div className="panel p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <CheckCircle2 className="size-4 text-success" />
              Gateway Health (Chapa)
            </span>
            <span className="font-mono text-xs font-semibold text-success">{paymentHealth.successRate}% OK</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{paymentHealth.failed7Days}</span> failed attempts in 7 days;{" "}
            <span className="font-semibold text-foreground">{paymentHealth.pendingStuckOver24h}</span> pending &gt; 24h.
          </p>
          <button
            onClick={() => onNavigate("payments")}
            className="mt-3 text-[11px] text-primary hover:underline"
          >
            Review pending payments →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: SUBSCRIPTIONS LIST & DETAIL DRAWER
// ─────────────────────────────────────────────────────────────────────────────

function SubscriptionsTab() {
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workspaceTypeFilter, setWorkspaceTypeFilter] = useState("all");
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  // Action Modals State
  const [actionTargetSub, setActionTargetSub] = useState<AdminSubscriptionItem | null>(null);
  const [actionType, setActionType] = useState<"grant" | "change_plan" | "cancel" | "reactivate" | "reset_usage" | "custom_limits" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionDays, setActionDays] = useState(14);
  const [actionTargetPlan, setActionTargetPlan] = useState("pro");
  const [actionCustomLimits, setActionCustomLimits] = useState({
    monthlyReviews: 1000,
    aiAssistedReviews: 50,
    linesPerReview: 10000,
    filesPerReview: 200,
    seats: 20,
    historyRetentionDays: 180,
  });

  const { data, isLoading, isError, error, refetch } = useAdminSubscriptionsQuery({
    plan: planFilter,
    status: statusFilter,
    workspaceType: workspaceTypeFilter,
    expiringSoon: expiringSoonOnly,
    search,
    page,
    limit: 15,
  });

  const { data: detailData, isLoading: isDetailLoading } = useAdminSubscriptionDetailQuery(selectedSubId);

  // Mutations
  const grantMutation = useGrantExtendSubscriptionMutation();
  const changePlanMutation = useChangeSubscriptionPlanMutation();
  const cancelMutation = useCancelExpireSubscriptionMutation();
  const reactivateMutation = useReactivateSubscriptionMutation();
  const resetUsageMutation = useResetSubscriptionUsageMutation();
  const customLimitsMutation = useApplyCustomLimitsMutation();

  const handleExecuteAction = async () => {
    if (!actionTargetSub || !actionType) return;
    if (!actionReason.trim() || actionReason.trim().length < 5) {
      toast.error("A mandatory reason (minimum 5 characters) is required for audit logging.");
      return;
    }

    try {
      if (actionType === "grant") {
        await grantMutation.mutateAsync({
          id: actionTargetSub._id,
          days: actionDays,
          reason: actionReason,
        });
        toast.success(`Access extended by ${actionDays} days.`);
      } else if (actionType === "change_plan") {
        await changePlanMutation.mutateAsync({
          id: actionTargetSub._id,
          targetPlan: actionTargetPlan,
          reason: actionReason,
        });
        toast.success(`Plan updated to ${actionTargetPlan}.`);
      } else if (actionType === "cancel") {
        await cancelMutation.mutateAsync({
          id: actionTargetSub._id,
          targetStatus: "cancelled",
          reason: actionReason,
        });
        toast.success("Subscription cancelled.");
      } else if (actionType === "reactivate") {
        await reactivateMutation.mutateAsync({
          id: actionTargetSub._id,
          reason: actionReason,
          extensionDays: actionDays,
        });
        toast.success("Subscription reactivated.");
      } else if (actionType === "reset_usage") {
        await resetUsageMutation.mutateAsync({
          id: actionTargetSub._id,
          reason: actionReason,
        });
        toast.success("Usage counters reset.");
      } else if (actionType === "custom_limits") {
        await customLimitsMutation.mutateAsync({
          id: actionTargetSub._id,
          customLimits: actionCustomLimits,
          reason: actionReason,
        });
        toast.success("Custom limits applied.");
      }

      setActionTargetSub(null);
      setActionType(null);
      setActionReason("");
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute subscription action.");
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Filters & Search Bar ── */}
      <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative min-w-[220px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search email, company, ID…"
              className="pl-8 text-xs h-8"
            />
          </div>

          {/* Plan Filter */}
          <Select
            value={planFilter}
            onValueChange={(val) => {
              setPlanFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trialing">Trialing</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Workspace Type */}
          <Select
            value={workspaceTypeFilter}
            onValueChange={(val) => {
              setWorkspaceTypeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workspaces</SelectItem>
              <SelectItem value="personal">Individual</SelectItem>
              <SelectItem value="company">Company</SelectItem>
            </SelectContent>
          </Select>

          {/* Expiring Soon Checkbox */}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={expiringSoonOnly}
              onChange={(e) => {
                setExpiringSoonOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded border-input text-primary focus:ring-primary"
            />
            Expiring in 7 days
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Subscriptions Table ── */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                <th className="p-3 font-medium">Owner / Workspace</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Plan</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Reviews Used</th>
                <th className="p-3 font-medium">Period End / Expiry</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading subscriptions…
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-destructive">
                    Failed to load subscriptions: {(error as any)?.message || "Network error"}.{" "}
                    <button onClick={() => refetch()} className="underline ml-1 font-medium">Retry</button>
                  </td>
                </tr>
              ) : data?.subscriptions?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No matching subscriptions found.
                  </td>
                </tr>
              ) : (
                data?.subscriptions?.map((sub) => {
                  const isExpiring = sub.expiresAt && new Date(sub.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                  const isPastDue = sub.status === "past_due";
                  return (
                    <tr key={sub._id} className="hover:bg-accent/40 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-foreground">
                          {sub.companyId?.name || sub.userId?.name || "Workspace"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{sub.userId?.email}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                            sub.workspaceType === "company"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {sub.workspaceType === "company" ? <Building2 className="size-3" /> : <User className="size-3" />}
                          {sub.workspaceType}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono uppercase font-semibold text-foreground">
                          {sub.plan}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase font-mono",
                            sub.status === "active" && "bg-success/10 text-success",
                            sub.status === "trialing" && "bg-sky-500/10 text-sky-500",
                            sub.status === "past_due" && "bg-amber-500/10 text-amber-500",
                            sub.status === "expired" && "bg-muted text-muted-foreground",
                            sub.status === "cancelled" && "bg-destructive/10 text-destructive",
                          )}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        {sub.usageMeters.reviewsUsed} / {sub.usageMeters.monthlyReviewsLimit}
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        {sub.expiresAt ? (
                          <span className={cn(isExpiring && "text-amber-500 font-semibold")}>
                            {new Date(sub.expiresAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Auto-renew</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => setSelectedSubId(sub._id)}
                          >
                            <Eye className="size-3.5 mr-1" />
                            Detail
                          </Button>
                          <Select
                            onValueChange={(action) => {
                              setActionTargetSub(sub);
                              setActionType(action as any);
                            }}
                          >
                            <SelectTrigger className="h-7 w-20 text-[11px]">
                              <span>Manage</span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="grant">Grant / Extend</SelectItem>
                              <SelectItem value="change_plan">Change Plan</SelectItem>
                              <SelectItem value="reset_usage">Reset Usage</SelectItem>
                              <SelectItem value="custom_limits">Custom Limits</SelectItem>
                              <SelectItem value="reactivate">Reactivate</SelectItem>
                              <SelectItem value="cancel">Cancel Access</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
            <span>
              Showing page {data.page} of {data.totalPages} ({data.total} total)
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Drawer Modal ── */}
      {selectedSubId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="panel max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 bg-card shadow-xl">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Subscription Workspace Details</h3>
                <p className="text-xs text-muted-foreground font-mono">ID: {selectedSubId}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedSubId(null)}>
                <X className="size-4" />
              </Button>
            </div>

            {isDetailLoading || !detailData ? (
              <div className="py-8 text-center text-muted-foreground">
                <RefreshCw className="size-5 animate-spin mx-auto text-primary" />
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Workspace Info */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-muted/20 border border-border">
                  <div>
                    <span className="text-muted-foreground">Owner / Contact:</span>
                    <div className="font-semibold text-foreground mt-0.5">{detailData.userId?.name}</div>
                    <div className="text-muted-foreground">{detailData.userId?.email}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Organization:</span>
                    <div className="font-semibold text-foreground mt-0.5">
                      {detailData.companyId?.name || "Individual Developer"}
                    </div>
                    <div className="text-muted-foreground">Cycle: {detailData.billingCycle}</div>
                  </div>
                </div>

                {/* Usage Meters */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Usage Meters (Current Billing Period)</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Monthly Reviews:</span>
                      <span className="font-mono text-foreground font-medium">
                        {detailData.usageMeters.reviewsUsed} / {detailData.usageMeters.monthlyReviewsLimit}
                      </span>
                    </div>
                    <Progress
                      value={(detailData.usageMeters.reviewsUsed / Math.max(detailData.usageMeters.monthlyReviewsLimit, 1)) * 100}
                    />
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-muted-foreground">
                      <span>AI Assisted Reviews:</span>
                      <span className="font-mono text-foreground font-medium">
                        {detailData.usageMeters.aiReviewsUsed ?? 0} / {detailData.usageMeters.aiAssistedReviewsLimit}
                      </span>
                    </div>
                    <Progress
                      value={((detailData.usageMeters.aiReviewsUsed ?? 0) / Math.max(detailData.usageMeters.aiAssistedReviewsLimit, 1)) * 100}
                    />
                  </div>
                </div>

                {/* Company Members */}
                {detailData.companyMembers?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="font-semibold text-foreground">Company Members ({detailData.companyMembers.length})</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1 border border-border rounded p-2">
                      {detailData.companyMembers.map((m) => (
                        <div key={m._id} className="flex justify-between text-muted-foreground">
                          <span>{m.name} ({m.email})</span>
                          <span className="font-mono text-[10px] uppercase">{m.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment History */}
                <div className="space-y-2 pt-2">
                  <h4 className="font-semibold text-foreground">Payment History</h4>
                  {detailData.paymentHistory?.length === 0 ? (
                    <p className="text-muted-foreground">No payment records yet for this workspace.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {detailData.paymentHistory.map((p) => (
                        <div key={p._id} className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border">
                          <div>
                            <span className="font-mono font-semibold text-foreground">{p.amount} {p.currency}</span>
                            <span className="text-muted-foreground ml-2">({p.plan.toUpperCase()})</span>
                            <div className="text-[10px] font-mono text-muted-foreground">{p.txRef}</div>
                          </div>
                          <span className={cn("font-mono uppercase text-[10px] font-medium", p.status === "paid" ? "text-success" : "text-amber-500")}>
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions quick footer */}
                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => setSelectedSubId(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Action Confirmation Dialog with MANDATORY Reason ── */}
      {actionTargetSub && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="panel max-w-md w-full p-5 space-y-4 bg-card shadow-xl">
            <div>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Confirm Action: {actionType.replace("_", " ")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Target workspace: <strong className="text-foreground">{actionTargetSub.userId?.email}</strong>
              </p>
            </div>

            {/* Config according to action */}
            {actionType === "grant" && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Additional Extension Days:</label>
                <Input
                  type="number"
                  value={actionDays}
                  onChange={(e) => setActionDays(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            )}

            {actionType === "change_plan" && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Select New Plan:</label>
                <Select value={actionTargetPlan} onValueChange={setActionTargetPlan}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {actionType === "custom_limits" && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-muted-foreground">Monthly Reviews:</label>
                  <Input
                    type="number"
                    value={actionCustomLimits.monthlyReviews}
                    onChange={(e) => setActionCustomLimits({ ...actionCustomLimits, monthlyReviews: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-muted-foreground">AI Reviews:</label>
                  <Input
                    type="number"
                    value={actionCustomLimits.aiAssistedReviews}
                    onChange={(e) => setActionCustomLimits({ ...actionCustomLimits, aiAssistedReviews: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}

            {/* Mandatory Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Reason for Administrative Action (Required)*</span>
                <span className="text-[10px] text-muted-foreground font-normal">Audit logged</span>
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Describe why this subscription action is being performed (e.g. support ticket #102, contract renewal)…"
                className="w-full h-20 rounded-md border border-input bg-transparent p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActionTargetSub(null);
                  setActionType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={actionReason.trim().length < 5}
                onClick={handleExecuteAction}
              >
                Confirm & Audit Log
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: PAYMENTS & RECONCILIATION
// ─────────────────────────────────────────────────────────────────────────────

function PaymentsTab() {
  const [subTab, setSubTab] = useState<"list" | "reconciliation">("list");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reverifyLoadingTx, setReverifyLoadingTx] = useState<string | null>(null);

  // Detail Modal
  const [selectedTxRef, setSelectedTxRef] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useAdminPaymentsQuery({
    status: statusFilter,
    plan: planFilter,
    search,
    page,
    limit: 15,
  });

  const { data: detailData, isLoading: isDetailLoading } = useAdminPaymentDetailQuery(selectedTxRef);
  const { data: reconData, isLoading: isReconLoading, refetch: refetchRecon } = useReconciliationQuery();

  const reverifyMutation = useReverifyPaymentMutation();
  const refundMutation = useRefundPaymentMutation();
  const resendReceiptMutation = useResendReceiptMutation();

  const handleReverify = async (txRef: string) => {
    setReverifyLoadingTx(txRef);
    try {
      const res = await reverifyMutation.mutateAsync({
        txRef,
        reason: "Admin manual re-verification via Platform Billing Hub",
      });
      if (res.verifiedStatus === "paid") {
        toast.success(`Transaction verified with Chapa! Status: PAID (Subscription upgraded)`);
      } else {
        toast.info(`Transaction checked with Chapa. Status: ${res.verifiedStatus}`);
      }
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Re-verification failed.");
    } finally {
      setReverifyLoadingTx(null);
    }
  };

  const handleRefund = async (txRef: string) => {
    const reason = prompt("Enter reason for marking this payment as refunded:");
    if (!reason || reason.trim().length < 5) {
      toast.error("A valid reason (minimum 5 characters) is required.");
      return;
    }
    const revoke = confirm("Do you also want to cancel or revoke the workspace subscription?");
    try {
      await refundMutation.mutateAsync({ txRef, reason, revokeSubscription: revoke });
      toast.success("Payment recorded as refunded.");
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Refund record failed.");
    }
  };

  const handleExportCsv = () => {
    window.open("/api/v1/admin/billing/payments/export", "_blank");
  };

  return (
    <div className="space-y-4">
      {/* ── Sub-header with Toggle ── */}
      <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={subTab === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setSubTab("list")}
          >
            Payments Transactions
          </Button>
          <Button
            variant={subTab === "reconciliation" ? "default" : "outline"}
            size="sm"
            onClick={() => setSubTab("reconciliation")}
            className="relative"
          >
            Reconciliation Anomalies
            {reconData && reconData.mismatchesCount > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.2 text-[10px] text-destructive-foreground">
                {reconData.mismatchesCount}
              </span>
            )}
          </Button>
        </div>

        {subTab === "list" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="size-3.5 mr-1" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Transactions List View ── */}
      {subTab === "list" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search txRef, Chapa ref, receipt…"
                className="pl-8 text-xs h-8"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={planFilter}
              onValueChange={(val) => {
                setPlanFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                    <th className="p-3 font-medium">Tx Reference</th>
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 font-medium">Plan</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Date Verified</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                        Loading transactions…
                      </td>
                    </tr>
                  ) : isError ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-destructive">
                        Failed to load transactions: {(error as any)?.message || "Network error"}.{" "}
                        <button onClick={() => refetch()} className="underline ml-1 font-medium">Retry</button>
                      </td>
                    </tr>
                  ) : data?.payments?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    data?.payments?.map((pay) => (
                      <tr key={pay._id} className="hover:bg-accent/40 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-foreground">
                          {pay.txRef}
                          {pay.receiptNumber && (
                            <div className="text-[10px] text-muted-foreground">Receipt: {pay.receiptNumber}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-foreground">{pay.userId?.name || "Customer"}</div>
                          <div className="text-[11px] text-muted-foreground">{pay.userId?.email}</div>
                        </td>
                        <td className="p-3 font-mono uppercase font-semibold text-foreground">
                          {pay.plan}
                        </td>
                        <td className="p-3 font-mono font-medium text-foreground">
                          {pay.amount.toLocaleString()} {pay.currency}
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase font-mono",
                              pay.status === "paid" && "bg-success/10 text-success",
                              pay.status === "pending" && "bg-amber-500/10 text-amber-500",
                              pay.status === "failed" && "bg-destructive/10 text-destructive",
                              pay.status === "refunded" && "bg-muted text-muted-foreground",
                            )}
                          >
                            {pay.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {pay.verifiedAt ? new Date(pay.verifiedAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => setSelectedTxRef(pay.txRef)}
                            >
                              Detail
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2"
                              disabled={reverifyLoadingTx === pay.txRef}
                              onClick={() => handleReverify(pay.txRef)}
                              title="Re-verify with Chapa API"
                            >
                              <RotateCcw className={cn("size-3 mr-1", reverifyLoadingTx === pay.txRef && "animate-spin")} />
                              Re-verify
                            </Button>
                            {pay.status === "paid" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                                onClick={() => handleRefund(pay.txRef)}
                              >
                                Refund
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
                <span>
                  Showing page {data.page} of {data.totalPages} ({data.total} total)
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reconciliation View ── */}
      {subTab === "reconciliation" && (
        <div className="space-y-4">
          <div className="panel p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Payment Reconciliation Mismatches</h3>
              <p className="text-xs text-muted-foreground">
                Flags anomalies where payments completed but subscriptions were not upgraded, or paid workspaces have no payment.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchRecon()}>
              <RefreshCw className="size-3.5 mr-1" />
              Re-scan Anomalies
            </Button>
          </div>

          {isReconLoading ? (
            <div className="panel p-8 text-center text-muted-foreground">
              <RefreshCw className="size-5 animate-spin mx-auto text-primary" />
            </div>
          ) : reconData?.mismatchesCount === 0 ? (
            <div className="panel p-12 text-center">
              <CheckCircle2 className="size-10 text-success mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">Zero Reconciliation Mismatches</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                All successful payments correspond to active subscriptions, and all active paid accounts have verified transaction records.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reconData?.mismatchedPayments?.map((item, idx) => (
                <div key={idx} className="panel p-4 flex items-center justify-between border-l-4 border-l-destructive">
                  <div>
                    <div className="font-semibold text-xs text-foreground">
                      Paid Payment without Active Subscription
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                      TxRef: {item.txRef} • Paid Plan: {item.paidPlan.toUpperCase()} ({item.amount} ETB)
                    </div>
                    <div className="text-[11px] text-destructive">
                      Current Subscription: {item.currentPlan} ({item.currentStatus})
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleReverify(item.txRef)}
                  >
                    Auto-Upgrade & Fix
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Payment Detail Drawer Modal ── */}
      {selectedTxRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="panel max-w-lg w-full p-5 space-y-4 bg-card shadow-xl">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Chapa Payment Transaction Detail</h3>
                <p className="text-xs font-mono text-muted-foreground">{selectedTxRef}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedTxRef(null)}>
                <X className="size-4" />
              </Button>
            </div>

            {isDetailLoading || !detailData ? (
              <div className="py-6 text-center text-muted-foreground">
                <RefreshCw className="size-5 animate-spin mx-auto text-primary" />
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-muted/20 border border-border">
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <div className="font-mono font-semibold text-foreground">{detailData.amount} {detailData.currency}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Chapa Reference:</span>
                    <div className="font-mono text-foreground">{detailData.chapaReference || "—"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Customer:</span>
                    <div className="text-foreground">{detailData.userId?.name} ({detailData.userId?.email})</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Receipt Number:</span>
                    <div className="font-mono text-foreground">{detailData.receiptNumber || "Pending"}</div>
                  </div>
                </div>

                {/* Stored Chapa Verify Payload */}
                <div>
                  <span className="font-semibold text-foreground">Stored Verify Response:</span>
                  <pre className="mt-1 max-h-36 overflow-auto rounded bg-muted/40 p-2 font-mono text-[10px] text-foreground">
                    {JSON.stringify(detailData.chapaVerifyResponse || { status: detailData.status }, null, 2)}
                  </pre>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border">
                  {detailData.status === "paid" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await resendReceiptMutation.mutateAsync({ txRef: detailData.txRef });
                        toast.success("Receipt resent to customer.");
                      }}
                    >
                      <Send className="size-3.5 mr-1" />
                      Resend Receipt Email
                    </Button>
                  )}
                  <Button variant="default" size="sm" onClick={() => setSelectedTxRef(null)}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4: PLANS CATALOGUE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

function PlansCatalogueTab() {
  const { data: plans, isLoading, isError, error, refetch } = useCataloguePlansQuery();
  const updateMutation = useUpdateCataloguePlanMutation();

  const [editingPlan, setEditingPlan] = useState<CataloguePlan | null>(null);
  const [editPriceMonthly, setEditPriceMonthly] = useState<number>(0);
  const [editPriceAnnual, setEditPriceAnnual] = useState<number>(0);
  const [editTrialDays, setEditTrialDays] = useState<number>(0);
  const [editMonthlyReviews, setEditMonthlyReviews] = useState<number>(50);
  const [editAiReviews, setEditAiReviews] = useState<number>(5);
  const [editSeats, setEditSeats] = useState<number>(0);
  const [editIsPublic, setEditIsPublic] = useState<boolean>(true);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editReason, setEditReason] = useState<string>("");

  const handleOpenEdit = (plan: CataloguePlan) => {
    setEditingPlan(plan);
    setEditPriceMonthly(plan.priceMonthly);
    setEditPriceAnnual(plan.priceAnnual);
    setEditTrialDays(plan.trialDays);
    setEditMonthlyReviews(plan.limits?.monthlyReviews ?? 50);
    setEditAiReviews(plan.limits?.aiAssistedReviews ?? 5);
    setEditSeats(plan.limits?.seats ?? 0);
    setEditIsPublic(plan.isPublic);
    setEditIsActive(plan.isActive);
    setEditReason("");
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    if (!editReason.trim() || editReason.trim().length < 5) {
      toast.error("A reason (minimum 5 characters) is required to update plan pricing/limits.");
      return;
    }

    try {
      const res = await updateMutation.mutateAsync({
        planId: editingPlan.planId,
        updates: {
          priceMonthly: editPriceMonthly,
          priceAnnual: editPriceAnnual,
          trialDays: editTrialDays,
          isPublic: editIsPublic,
          isActive: editIsActive,
          limits: {
            ...editingPlan.limits,
            monthlyReviews: editMonthlyReviews,
            aiAssistedReviews: editAiReviews,
            seats: editSeats,
          },
        },
        reason: editReason,
      });

      if (res.warning) {
        toast.warning(res.warning);
      } else {
        toast.success(`Plan "${editingPlan.name}" updated successfully.`);
      }
      setEditingPlan(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update plan.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Catalogue Header ── */}
      <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Subscription Catalogue Management</h2>
          <p className="text-xs text-muted-foreground">
            Configure tier prices, quotas, trial periods, and visibility without requiring a backend deploy.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="size-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      {/* ── Plans Grid ── */}
      {isLoading ? (
        <div className="panel p-12 text-center text-muted-foreground">
          <RefreshCw className="size-6 animate-spin mx-auto text-primary" />
        </div>
      ) : isError ? (
        <div className="panel p-12 text-center space-y-3">
          <AlertTriangle className="size-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-foreground">Failed to load subscription catalogue</p>
          <p className="text-xs text-muted-foreground">{(error as any)?.message || "An unexpected error occurred."}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-3.5 mr-1" />
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans?.map((plan) => (
            <div
              key={plan._id}
              className={cn(
                "panel p-5 flex flex-col justify-between border-t-4",
                plan.planId === "enterprise" && "border-t-indigo-600",
                plan.planId === "team" && "border-t-primary",
                plan.planId === "pro" && "border-t-sky-500",
                plan.planId === "free" && "border-t-muted",
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground uppercase tracking-wide">
                    {plan.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {plan.isPublic ? (
                      <span className="rounded bg-success/10 px-1.5 py-0.5 text-[9px] font-mono text-success">
                        Public
                      </span>
                    ) : (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>

                <div className="font-mono text-2xl font-bold text-foreground">
                  {plan.priceMonthly.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-muted-foreground">ETB/mo</span>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  Annual: {plan.priceAnnual.toLocaleString()} ETB ({plan.trialDays > 0 ? `${plan.trialDays}d trial` : "No trial"})
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>

                {/* Quotas */}
                <div className="pt-2 border-t border-border space-y-1 text-[11px] text-muted-foreground font-mono">
                  <div>• Reviews: {plan.limits?.monthlyReviews.toLocaleString()}/mo</div>
                  <div>• AI Reviews: {plan.limits?.aiAssistedReviews.toLocaleString()}/mo</div>
                  <div>• Max Lines: {plan.limits?.linesPerReview.toLocaleString()}</div>
                  <div>• Seats: {plan.limits?.seats}</div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Active: <strong className="text-foreground">{plan.activeSubscribersCount}</strong>
                </span>
                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(plan)}>
                  <Edit className="size-3 mr-1" />
                  Edit Plan
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Plan Edit Modal ── */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="panel max-w-lg w-full p-6 space-y-4 bg-card shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Edit Plan: {editingPlan.name}</h3>
                <p className="text-xs text-muted-foreground">Changes apply to new checkouts & renewals.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingPlan(null)}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Impact Alert */}
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-500 flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div>
                <strong>Versioning Notice:</strong> {editingPlan.activeSubscribersCount} active subscribers currently run on this tier. They keep their existing terms until renewal.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-muted-foreground">Monthly Price (ETB):</label>
                <Input
                  type="number"
                  value={editPriceMonthly}
                  onChange={(e) => setEditPriceMonthly(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground">Annual Price (ETB):</label>
                <Input
                  type="number"
                  value={editPriceAnnual}
                  onChange={(e) => setEditPriceAnnual(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground">Trial Days:</label>
                <Input
                  type="number"
                  value={editTrialDays}
                  onChange={(e) => setEditTrialDays(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground">Monthly Reviews Quota:</label>
                <Input
                  type="number"
                  value={editMonthlyReviews}
                  onChange={(e) => setEditMonthlyReviews(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground">AI Assisted Reviews:</label>
                <Input
                  type="number"
                  value={editAiReviews}
                  onChange={(e) => setEditAiReviews(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground">Seats Limit:</label>
                <Input
                  type="number"
                  value={editSeats}
                  onChange={(e) => setEditSeats(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="text-xs text-foreground font-medium">Publicly Listed on Pricing Page</label>
              <Switch checked={editIsPublic} onCheckedChange={setEditIsPublic} />
            </div>

            {/* Mandatory Reason */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-foreground">Audit Reason for Catalogue Update*</label>
              <Input
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Reason for changing prices or limits…"
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setEditingPlan(null)}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={editReason.trim().length < 5}
                onClick={handleSavePlan}
              >
                Save & Apply to Catalogue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 5: USAGE & LIMITS MONITORING
// ─────────────────────────────────────────────────────────────────────────────

function UsageMonitoringTab({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { data, isLoading, isError, error, refetch } = useUsageMonitoringQuery();

  if (isLoading && !data) {
    return (
      <div className="panel p-12 text-center text-muted-foreground">
        <RefreshCw className="size-6 animate-spin mx-auto text-primary" />
        <p className="mt-2 text-xs text-muted-foreground animate-pulse">Loading usage & limits metrics...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="panel p-12 text-center space-y-3">
        <AlertTriangle className="size-8 text-destructive mx-auto" />
        <p className="text-sm font-semibold text-foreground">Failed to load usage & limit analytics</p>
        <p className="text-xs text-muted-foreground">{(error as any)?.message || "An unexpected error occurred."}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="size-3.5 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  const { nearOrOverLimits, heaviestUsers, aiCostTracker } = data;

  return (
    <div className="space-y-6">
      {/* ── AI Cost Tracker Panel ── */}
      <div className="panel p-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">AI Margin & Inference Cost Tracker</h2>
            <p className="text-xs text-muted-foreground">
              Estimated provider LLM cost benchmarked against subscription revenue
            </p>
          </div>
          <div className="font-mono text-sm font-bold text-foreground">
            Total AI Cost: {aiCostTracker.totalEstimatedAiCost.toLocaleString()} ETB
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {Object.entries(aiCostTracker.byPlan || {}).map(([planKey, val]) => (
            <div key={planKey} className="rounded-md border border-border bg-muted/20 p-3">
              <div className="font-mono text-xs uppercase text-muted-foreground font-semibold">{planKey}</div>
              <div className="mt-1 font-mono text-lg font-bold text-foreground">
                {val.aiReviewsCount} <span className="text-xs font-normal text-muted-foreground">AI calls</span>
              </div>
              <div className="text-[11px] font-mono text-primary mt-0.5">
                ~{val.estimatedCostETB.toLocaleString()} ETB est. cost
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Upgrade Opportunities (Near or Over Limits) ── */}
      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Workspaces Near or Over Quota (Upgrade Opportunities)</h3>
            <p className="text-xs text-muted-foreground">Accounts that have reached &ge; 80% of their review or AI quotas</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-3.5" />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                <th className="p-3 font-medium">Workspace / User</th>
                <th className="p-3 font-medium">Plan</th>
                <th className="p-3 font-medium">Review Usage</th>
                <th className="p-3 font-medium">AI Usage</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {nearOrOverLimits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No workspaces currently near or exceeding their limits.
                  </td>
                </tr>
              ) : (
                nearOrOverLimits.map((item, idx) => (
                  <tr key={idx} className="hover:bg-accent/40 transition-colors">
                    <td className="p-3">
                      <div className="font-medium text-foreground">{item.userName}</div>
                      <div className="text-[11px] text-muted-foreground">{item.userEmail}</div>
                    </td>
                    <td className="p-3 font-mono uppercase font-semibold text-foreground">{item.plan}</td>
                    <td className="p-3 font-mono">
                      {item.reviewsUsed} / {item.monthlyReviewsLimit} ({item.reviewUsagePercent}%)
                    </td>
                    <td className="p-3 font-mono">
                      {item.aiReviewsUsed} / {item.aiAssistedReviewsLimit} ({item.aiUsagePercent}%)
                    </td>
                    <td className="p-3">
                      {item.isExceeded ? (
                        <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-mono text-destructive font-semibold">
                          QUOTA EXCEEDED
                        </span>
                      ) : (
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-500 font-semibold">
                          NEAR LIMIT (&ge;80%)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate("subscriptions")}
                      >
                        Manage Subscription
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Heaviest Users ── */}
      <div className="panel p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Top 10 Most Active Users (This Month)</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {heaviestUsers.map((u, i) => (
            <div key={u.userId} className="flex items-center justify-between p-2.5 rounded border border-border bg-muted/20 text-xs">
              <div>
                <span className="font-semibold text-foreground">{i + 1}. {u.name}</span>
                <div className="text-[11px] text-muted-foreground">{u.email}</div>
              </div>
              <span className="font-mono font-bold text-primary">{u.reviewsCount} reviews</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 6: HEALTH, WEBHOOKS & IMMUTABLE AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

function HealthAndLogsTab() {
  const [subTab, setSubTab] = useState<"webhooks" | "audit">("webhooks");

  const { data: webhookData, isLoading: isWebhooksLoading, refetch: refetchWebhooks } = useWebhookLogsQuery({ page: 1, limit: 30 });
  const { data: auditData, isLoading: isAuditLoading, refetch: refetchAudit } = useBillingAuditLogsQuery({ page: 1, limit: 30 });

  const replayMutation = useReplayWebhookMutation();

  const handleReplay = async (id: string) => {
    try {
      await replayMutation.mutateAsync(id);
      toast.success("Webhook event replayed and transaction re-verified.");
      refetchWebhooks();
    } catch (err: any) {
      toast.error(err?.message || "Replay failed.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="panel p-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={subTab === "webhooks" ? "default" : "outline"}
            size="sm"
            onClick={() => setSubTab("webhooks")}
          >
            Chapa Webhook Logs
          </Button>
          <Button
            variant={subTab === "audit" ? "default" : "outline"}
            size="sm"
            onClick={() => setSubTab("audit")}
          >
            Billing Audit Trail (Read-only)
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (subTab === "webhooks") refetchWebhooks();
            else refetchAudit();
          }}
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {/* Webhooks View */}
      {subTab === "webhooks" && (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                  <th className="p-3 font-medium">Time</th>
                  <th className="p-3 font-medium">Provider</th>
                  <th className="p-3 font-medium">Tx Reference</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Signature</th>
                  <th className="p-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isWebhooksLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <RefreshCw className="size-5 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : webhookData?.logs?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No webhook events logged yet.
                    </td>
                  </tr>
                ) : (
                  webhookData?.logs?.map((wh) => (
                    <tr key={wh._id} className="hover:bg-accent/40 transition-colors">
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">
                        {new Date(wh.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 uppercase font-mono font-medium text-foreground">{wh.provider}</td>
                      <td className="p-3 font-mono text-foreground">{wh.txRef || "—"}</td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-mono uppercase font-medium",
                            wh.processingStatus === "processed" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {wh.processingStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        {wh.signatureValid ? (
                          <span className="text-success flex items-center gap-1 text-[11px]">
                            <Check className="size-3" /> Valid
                          </span>
                        ) : (
                          <span className="text-destructive flex items-center gap-1 text-[11px]">
                            <X className="size-3" /> Invalid
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => handleReplay(wh._id)}
                        >
                          <RotateCcw className="size-3 mr-1" />
                          Replay
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log View */}
      {subTab === "audit" && (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                  <th className="p-3 font-medium">Timestamp</th>
                  <th className="p-3 font-medium">Actor</th>
                  <th className="p-3 font-medium">Action</th>
                  <th className="p-3 font-medium">Resource Target</th>
                  <th className="p-3 font-medium">Reason Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isAuditLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      <RefreshCw className="size-5 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : auditData?.logs?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No billing audit records yet.
                    </td>
                  </tr>
                ) : (
                  auditData?.logs?.map((al) => (
                    <tr key={al._id} className="hover:bg-accent/40 transition-colors">
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">
                        {new Date(al.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-foreground">{al.actorId?.name || al.metadata?.actorName || "System"}</div>
                        <div className="text-[11px] text-muted-foreground">{al.actorId?.email || al.metadata?.actorEmail || "system"}</div>
                      </td>
                      <td className="p-3 font-mono font-semibold text-foreground text-[11px]">
                        {al.action}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">
                        {al.resourceType} ({al.resourceId})
                      </td>
                      <td className="p-3 text-foreground">
                        {al.metadata?.reason || "Administrative action"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
