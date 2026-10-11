import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request, ApiResponse } from "./api";

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface RevenueTrendItem {
  year: number;
  monthIndex: number;
  label: string;
  month: string;
  revenue: number;
  paymentsCount: number;
}

export interface BillingOverview {
  revenue: {
    thisMonth: number;
    lastMonth: number;
    ytd: number;
    currency: string;
    trend: RevenueTrendItem[];
  };
  mrr: {
    amount: number;
    currency: string;
  };
  activeSubscriptions: {
    pro: number;
    team: number;
    enterprise: number;
    free: number;
    totalPaid: number;
  };
  conversion: {
    freeToPaidRate: number;
    upgradedLast30d: number;
    newFreeLast30d: number;
  };
  trials: {
    activeTrials: number;
    endingThisWeek: number;
    trialToPaidRate: number;
  };
  churn: {
    churnedThisMonth: number;
    reactivatedThisMonth: number;
  };
  atRisk: {
    pastDueCount: number;
    expiringIn7Days: number;
  };
  paymentHealth: {
    successRate: number;
    failed7Days: number;
    pendingStuckOver24h: number;
  };
  planMix: Record<string, { revenue: number; txCount: number }>;
}

export interface AdminSubscriptionItem {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role?: string;
    company?: string | null;
  };
  companyId?: {
    _id: string;
    name: string;
    slug?: string;
    tier?: string;
  } | null;
  plan: "free" | "pro" | "team" | "enterprise";
  status: "trialing" | "active" | "past_due" | "expired" | "cancelled";
  startedAt: string;
  expiresAt?: string | null;
  billingCycle: "monthly" | "annual";
  trialEndsAt?: string | null;
  workspaceType: "company" | "personal";
  monthlyReviews: number;
  aiAssistedReviews: number;
  linesPerReview: number;
  filesPerReview: number;
  historyRetentionDays: number;
  seats: number;
  usageMeters: {
    reviewsUsed: number;
    monthlyReviewsLimit: number;
    aiAssistedReviewsLimit: number;
  };
  customLimits?: Record<string, number>;
  statusHistory?: Array<{
    fromStatus?: string | null;
    toStatus: string;
    reason: string;
    changedBy?: string;
    changedAt: string;
  }>;
}

export interface AdminSubscriptionDetail extends AdminSubscriptionItem {
  companyMembers: Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
  usageMeters: {
    reviewsUsed: number;
    monthlyReviewsLimit: number;
    aiReviewsUsed?: number;
    aiAssistedReviewsLimit: number;
    seatsUsed: number;
    seatsLimit: number;
  };
  paymentHistory: AdminPaymentItem[];
}

export interface AdminPaymentItem {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  companyId?: {
    _id: string;
    name: string;
    slug?: string;
  } | null;
  plan: "pro" | "team" | "enterprise";
  amount: number;
  currency: string;
  txRef: string;
  chapaReference?: string | null;
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  receiptNumber?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
  chapaVerifyResponse?: any;
  refundDetails?: {
    refundedAt: string;
    reason: string;
    revokedSubscription: boolean;
  };
}

export interface CataloguePlan {
  _id: string;
  planId: "free" | "pro" | "team" | "enterprise";
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  trialDays: number;
  limits: {
    monthlyReviews: number;
    aiAssistedReviews: number;
    linesPerReview: number;
    filesPerReview: number;
    historyRetentionDays: number;
    seats: number;
  };
  features: {
    advancedAnalysis: boolean;
    aiRemediation: boolean;
    gitHubIntegration: boolean;
    htmlReport: boolean;
  };
  isPublic: boolean;
  isActive: boolean;
  activeSubscribersCount: number;
  version: number;
}

export interface UsageMonitoringData {
  nearOrOverLimits: Array<{
    subscriptionId: string;
    userEmail: string;
    userName: string;
    companyName?: string | null;
    plan: string;
    reviewsUsed: number;
    monthlyReviewsLimit: number;
    reviewUsagePercent: number;
    aiReviewsUsed: number;
    aiAssistedReviewsLimit: number;
    aiUsagePercent: number;
    isExceeded: boolean;
  }>;
  heaviestUsers: Array<{
    userId: string;
    name: string;
    email: string;
    reviewsCount: number;
  }>;
  aiCostTracker: {
    totalEstimatedAiCost: number;
    byPlan: Record<string, { aiReviewsCount: number; estimatedCostETB: number }>;
  };
}

export interface ReconciliationReport {
  mismatchesCount: number;
  mismatchedPayments: Array<{
    type: string;
    txRef: string;
    userId: string;
    paidPlan: string;
    amount: number;
    currentPlan: string;
    currentStatus: string;
  }>;
  orphanedSubscriptions: Array<{
    type: string;
    subscriptionId: string;
    userEmail: string;
    userName: string;
    plan: string;
    startedAt: string;
  }>;
}

export interface WebhookLogItem {
  _id: string;
  provider: string;
  txRef: string;
  signatureValid: boolean;
  payload: any;
  processingStatus: "processed" | "failed" | "ignored";
  errorMessage?: string | null;
  replayedAt?: string | null;
  createdAt: string;
}

export interface BillingAuditLogItem {
  _id: string;
  actorId?: {
    _id: string;
    name: string;
    email: string;
    role?: string;
  } | null;
  action: string;
  resourceType: string;
  resourceId: string;
  status: string;
  metadata: {
    reason?: string;
    actorEmail?: string;
    actorName?: string;
    [key: string]: any;
  };
  createdAt: string;
}

function unwrapData<T>(res: any): T {
  if (res && typeof res === "object" && "data" in res && res.data !== undefined) {
    return res.data as T;
  }
  return res as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS: OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export function useBillingOverviewQuery() {
  return useQuery({
    queryKey: ["admin-billing-overview"],
    queryFn: async () => {
      const res = await request<ApiResponse<BillingOverview>>("/api/v1/admin/billing/overview");
      return unwrapData<BillingOverview>(res);
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS: SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminSubscriptionsQuery(params?: {
  plan?: string;
  status?: string;
  workspaceType?: string;
  expiringSoon?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["admin-billing-subscriptions", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.plan && params.plan !== "all") searchParams.set("plan", params.plan);
      if (params?.status && params.status !== "all") searchParams.set("status", params.status);
      if (params?.workspaceType && params.workspaceType !== "all") searchParams.set("workspaceType", params.workspaceType);
      if (params?.expiringSoon) searchParams.set("expiringSoon", "true");
      if (params?.search) searchParams.set("search", params.search);
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const queryStr = searchParams.toString();
      const path = `/api/v1/admin/billing/subscriptions${queryStr ? `?${queryStr}` : ""}`;
      const res = await request<ApiResponse<{ subscriptions: AdminSubscriptionItem[]; total: number; page: number; totalPages: number }>>(path);
      return unwrapData<{ subscriptions: AdminSubscriptionItem[]; total: number; page: number; totalPages: number }>(res);
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useAdminSubscriptionDetailQuery(id: string | null) {
  return useQuery({
    queryKey: ["admin-billing-subscription-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await request<ApiResponse<AdminSubscriptionDetail>>(`/api/v1/admin/billing/subscriptions/${id}`);
      return unwrapData<AdminSubscriptionDetail>(res);
    },
    enabled: Boolean(id),
  });
}

export function useGrantExtendSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      days,
      newExpiryDate,
      reason,
    }: {
      id: string;
      days?: number;
      newExpiryDate?: string;
      reason: string;
    }) => {
      const res = await request<any>(
        `/api/v1/admin/billing/subscriptions/${id}/grant-extend`,
        {
          method: "POST",
          body: JSON.stringify({ days, newExpiryDate, reason }),
        },
      );
      return unwrapData<AdminSubscriptionItem>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscription-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-audit-logs"] });
    },
  });
}

export function useChangeSubscriptionPlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      targetPlan,
      reason,
    }: {
      id: string;
      targetPlan: string;
      reason: string;
    }) => {
      const res = await request<any>(
        `/api/v1/admin/billing/subscriptions/${id}/change-plan`,
        {
          method: "POST",
          body: JSON.stringify({ targetPlan, reason }),
        },
      );
      return unwrapData<AdminSubscriptionItem>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscription-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-audit-logs"] });
    },
  });
}

export function useCancelExpireSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      targetStatus,
      reason,
    }: {
      id: string;
      targetStatus: "cancelled" | "expired";
      reason: string;
    }) => {
      const res = await request<any>(
        `/api/v1/admin/billing/subscriptions/${id}/cancel-expire`,
        {
          method: "POST",
          body: JSON.stringify({ targetStatus, reason }),
        },
      );
      return unwrapData<AdminSubscriptionItem>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscription-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-audit-logs"] });
    },
  });
}

export function useReactivateSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
      extensionDays = 30,
    }: {
      id: string;
      reason: string;
      extensionDays?: number;
    }) => {
      const res = await request<any>(
        `/api/v1/admin/billing/subscriptions/${id}/reactivate`,
        {
          method: "POST",
          body: JSON.stringify({ reason, extensionDays }),
        },
      );
      return unwrapData<AdminSubscriptionItem>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscription-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-audit-logs"] });
    },
  });
}

export function useResetSubscriptionUsageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await request<any>(
        `/api/v1/admin/billing/subscriptions/${id}/reset-usage`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        },
      );
      return unwrapData<AdminSubscriptionItem>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscription-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-usage"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-audit-logs"] });
    },
  });
}

export function useApplyCustomLimitsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      customLimits,
      reason,
    }: {
      id: string;
      customLimits: Record<string, number>;
      reason: string;
    }) => {
      const res = await request<any>(
        `/api/v1/admin/billing/subscriptions/${id}/custom-limits`,
        {
          method: "POST",
          body: JSON.stringify({ customLimits, reason }),
        },
      );
      return unwrapData<AdminSubscriptionItem>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscription-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-audit-logs"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS: PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminPaymentsQuery(params?: {
  status?: string;
  plan?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: string;
  maxAmount?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["admin-billing-payments", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status && params.status !== "all") searchParams.set("status", params.status);
      if (params?.plan && params.plan !== "all") searchParams.set("plan", params.plan);
      if (params?.startDate) searchParams.set("startDate", params.startDate);
      if (params?.endDate) searchParams.set("endDate", params.endDate);
      if (params?.minAmount) searchParams.set("minAmount", params.minAmount);
      if (params?.maxAmount) searchParams.set("maxAmount", params.maxAmount);
      if (params?.search) searchParams.set("search", params.search);
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const queryStr = searchParams.toString();
      const path = `/api/v1/admin/billing/payments${queryStr ? `?${queryStr}` : ""}`;
      const res = await request<any>(path);
      return unwrapData<{ payments: AdminPaymentItem[]; total: number; page: number; totalPages: number }>(res);
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useAdminPaymentDetailQuery(txRef: string | null) {
  return useQuery({
    queryKey: ["admin-billing-payment-detail", txRef],
    queryFn: async () => {
      if (!txRef) return null;
      const res = await request<any>(`/api/v1/admin/billing/payments/${encodeURIComponent(txRef)}`);
      return unwrapData<AdminPaymentItem>(res);
    },
    enabled: Boolean(txRef),
  });
}

export function useReverifyPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ txRef, reason }: { txRef: string; reason?: string }) => {
      const res = await request<any>(
        `/api/v1/admin/billing/payments/${encodeURIComponent(txRef)}/reverify`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        },
      );
      return unwrapData<{ payment: AdminPaymentItem; verifiedStatus: string }>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-payment-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-audit-logs"] });
    },
  });
}

export function useRefundPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      txRef,
      reason,
      revokeSubscription = false,
    }: {
      txRef: string;
      reason: string;
      revokeSubscription?: boolean;
    }) => {
      const res = await request<any>(
        `/api/v1/admin/billing/payments/${encodeURIComponent(txRef)}/refund`,
        {
          method: "POST",
          body: JSON.stringify({ reason, revokeSubscription }),
        },
      );
      return unwrapData<AdminPaymentItem>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-audit-logs"] });
    },
  });
}

export function useResendReceiptMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ txRef }: { txRef: string }) => {
      const res = await request<any>(
        `/api/v1/admin/billing/payments/${encodeURIComponent(txRef)}/resend-receipt`,
        {
          method: "POST",
        },
      );
      return unwrapData<{ message: string; receiptNumber: string }>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-audit-logs"] });
    },
  });
}

export function useReconciliationQuery() {
  return useQuery({
    queryKey: ["admin-billing-reconciliation"],
    queryFn: async () => {
      const res = await request<any>("/api/v1/admin/billing/payments/reconciliation");
      return unwrapData<ReconciliationReport>(res);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS: PLANS CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────

export function useCataloguePlansQuery() {
  return useQuery({
    queryKey: ["admin-billing-plans"],
    queryFn: async () => {
      const res = await request<any>("/api/v1/admin/billing/plans");
      return unwrapData<CataloguePlan[]>(res);
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdateCataloguePlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      planId,
      updates,
      reason,
    }: {
      planId: string;
      updates: Partial<CataloguePlan>;
      reason: string;
    }) => {
      const res = await request<any>(
        `/api/v1/admin/billing/plans/${planId}`,
        {
          method: "PUT",
          body: JSON.stringify({ updates, reason }),
        },
      );
      return unwrapData<{ plan: CataloguePlan; affectedActiveSubscribers: number; warning?: string | null }>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-plans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-audit-logs"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS: USAGE MONITORING & HEALTH LOGS
// ─────────────────────────────────────────────────────────────────────────────

export function useUsageMonitoringQuery() {
  return useQuery({
    queryKey: ["admin-billing-usage"],
    queryFn: async () => {
      const res = await request<any>("/api/v1/admin/billing/usage");
      return unwrapData<UsageMonitoringData>(res);
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useWebhookLogsQuery(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["admin-billing-webhooks", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      const queryStr = searchParams.toString();
      const res = await request<any>(
        `/api/v1/admin/billing/webhooks${queryStr ? `?${queryStr}` : ""}`,
      );
      return unwrapData<{ logs: WebhookLogItem[]; total: number; page: number; totalPages: number }>(res);
    },
  });
}

export function useReplayWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (webhookId: string) => {
      const res = await request<any>(
        `/api/v1/admin/billing/webhooks/${webhookId}/replay`,
        { method: "POST" },
      );
      return unwrapData<{ message: string }>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-audit-logs"] });
    },
  });
}

export function useBillingAuditLogsQuery(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["admin-billing-audit-logs", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      const queryStr = searchParams.toString();
      const res = await request<any>(
        `/api/v1/admin/billing/audit-logs${queryStr ? `?${queryStr}` : ""}`,
      );
      return unwrapData<{ logs: BillingAuditLogItem[]; total: number; page: number; totalPages: number }>(res);
    },
  });
}
