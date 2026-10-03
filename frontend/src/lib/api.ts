import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * ReviewX API Client
 * Typed client for interacting with the backend review, report, and auth endpoints.
 */

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ReviewFinding {
  _id?: string;
  id?: string;
  category: "security" | "bug" | "quality" | "performance";
  type: string;
  ruleId: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  confidence: "low" | "medium" | "high";
  status: "detected" | "verified" | "false_positive" | "accepted" | "resolved";
  file?: string | null;
  line?: number | null;
  column?: number | null;
  code?: string | null;
  recommendation?: string | null;
  analyzer: string;
  fingerprint: string;
}

export interface ReviewScore {
  score: number;
  grade?: string;
  breakdown?: {
    security: number;
    bugs: number;
    quality: number;
    performance: number;
  };
}

export interface ReviewSummary {
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ReviewResult {
  reviewId: string;
  status: "pending" | "parsing" | "analyzing" | "applying_rules" | "generating_ai" | "scoring" | "completed" | "failed";
  progress?: number;
  summary: ReviewSummary;
  score: ReviewScore;
  findings: ReviewFinding[];
  aiAnalysis?: {
    status: string;
    provider?: string | null;
    model?: string | null;
    summary?: string | null;
    recommendations?: string[];
  } | null;
  metadata?: {
    analyzerVersion: string;
    generatedAt: string;
  };
  errorMessage?: string | null;
}

export interface ReportResult {
  _id: string;
  reviewId: string;
  type: "json" | "pdf";
  status: "pending" | "completed" | "failed";
  fileName: string;
  storageUrl?: string | null;
  publicId?: string | null;
  content?: string | null;
}

export interface SubmitReviewInput {
  code: string;
  language?: string;
  fileName?: string;
}

export interface SubmitReviewResponse {
  reviewId: string;
  status: string;
  message?: string;
}

export interface DashboardReview {
  id: string;
  reviewId: string;
  name: string;
  lang: string;
  langBadge: string;
  score: number;
  date: string;
  relativeDate: string;
  status: string;
  findings: number;
  severityCounts: { critical: number; high: number; medium: number; low: number };
  createdAt?: string;
}

export interface DashboardFinding {
  id: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  file: string;
  category: string;
  reviewId?: string | null;
}

export interface DashboardMetrics {
  totalReviews: number;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  resolvedPercentage: number | null;
  averageScore: number;
  categoryHealth: {
    security: number;
    bugs: number;
    quality: number;
    performance: number;
  } | null;
  scoreTrend: Array<{ label: string; score: number }>;
  recentReviews: DashboardReview[];
  openFindings: DashboardFinding[];
}


export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "member" | "company_admin" | "platform_admin";
  company?: string | null;
  createdAt?: string;
}

export interface AuthResponseData {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

export class ApiClientError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, code = "API_ERROR", statusCode = 500, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

const API_BASE_URL = typeof window !== "undefined"
  ? (import.meta.env.VITE_API_URL || "")
  : "";

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("reviewx_token") || sessionStorage.getItem("reviewx_token");
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("reviewx_token", token);
  } else {
    localStorage.removeItem("reviewx_token");
    sessionStorage.removeItem("reviewx_token");
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    const isAuthEndpoint = path.includes("/api/auth/login") || path.includes("/api/auth/register");
    if (!isAuthEndpoint) {
      if (unauthorizedHandler) {
        unauthorizedHandler();
      } else {
        setAuthToken(null);
        if (typeof window !== "undefined") {
          window.location.href = "/auth";
        }
      }
    }
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = body?.error || {};
    const message = error.message || body.message || `Request failed with status ${res.status}`;
    const code = error.code || "UNKNOWN_ERROR";
    throw new ApiClientError(message, code, res.status, body?.errors || error.details);
  }

  return (body.data !== undefined ? body.data : body) as T;
}

// ── Review API ─────────────────────────────────────────────────────────────

export async function submitReview(input: SubmitReviewInput): Promise<SubmitReviewResponse> {
  return request<SubmitReviewResponse>("/api/reviews", {
    method: "POST",
    body: JSON.stringify({
      code: input.code,
      language: input.language,
      fileName: input.fileName || "source.ts",
    }),
  });
}

export async function getReview(reviewId: string): Promise<ReviewResult> {
  return request<ReviewResult>(`/api/reviews/${reviewId}`, {
    method: "GET",
  });
}

/**
 * Polls for a review to reach completed or failed state.
 */
export async function pollReviewStatus(
  reviewId: string,
  options: {
    intervalMs?: number;
    maxAttempts?: number;
    onProgress?: (status: string, progress: number) => void;
  } = {}
): Promise<ReviewResult> {
  const { intervalMs = 1500, maxAttempts = 120, onProgress } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await getReview(reviewId);
    if (onProgress) {
      const prog = (result as { progress?: number }).progress ?? Math.min(attempt * 5, 95);
      onProgress(result.status, prog);
    }
    if (result.status === "completed") {
      return result;
    }
    if (result.status === "failed") {
      throw new ApiClientError(
        (result as { errorMessage?: string }).errorMessage || "Analysis pipeline failed",
        "ANALYSIS_FAILED",
        500
      );
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new ApiClientError("Review status polling timed out.", "POLL_TIMEOUT", 408);
}

// ── Reports API ────────────────────────────────────────────────────────────

export async function generateReport(reviewId: string, type: "json" | "pdf" = "json"): Promise<ReportResult> {
  return request<ReportResult>("/api/reports", {
    method: "POST",
    body: JSON.stringify({
      reviewId,
      type,
    }),
  });
}

export async function getReport(reportId: string): Promise<ReportResult> {
  return request<ReportResult>(`/api/reports/${reportId}`, {
    method: "GET",
  });
}

export async function getReportsByReview(reviewId: string): Promise<ReportResult[]> {
  return request<ReportResult[]>(`/api/reports/review/${reviewId}`, {
    method: "GET",
  });
}

// ── Auth API ───────────────────────────────────────────────────────────────

export async function registerUser(userData: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponseData> {
  const data = await request<AuthResponseData>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function loginUser(credentials: {
  email: string;
  password: string;
}): Promise<AuthResponseData> {
  const data = await request<AuthResponseData>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const res = await request<{ user: any }>("/api/auth/me", {
    method: "GET",
  });
  const u = res.user;
  return {
    ...u,
    id: u.id || u._id?.toString() || u._id,
  };
}

// ── TanStack Query Hooks ───────────────────────────────────────────────────

export function useSubmitReviewMutation() {
  return useMutation({
    mutationFn: (input: SubmitReviewInput) => submitReview(input),
  });
}

export function useReviewQuery(
  reviewId: string | null | undefined,
  options?: {
    refetchInterval?: number | false | ((query: { state: { data: ReviewResult | null } }) => number | false);
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ["review", reviewId],
    queryFn: () => (reviewId ? getReview(reviewId) : null),
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(reviewId),
    refetchInterval: options?.refetchInterval,
  });
}

export function useReportQuery(reportId: string | null | undefined) {
  return useQuery({
    queryKey: ["report", reportId],
    queryFn: () => (reportId ? getReport(reportId) : null),
    enabled: Boolean(reportId),
  });
}

export function useGenerateReportMutation() {
  return useMutation({
    mutationFn: ({ reviewId, type }: { reviewId: string; type: "json" | "pdf" }) =>
      generateReport(reviewId, type),
  });
}


export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return request<DashboardMetrics>("/api/reviews/metrics");
}

export async function listReviews(limit = 20): Promise<DashboardReview[]> {
  return request<DashboardReview[]>(`/api/reviews?limit=${limit}`);
}

export function useDashboardMetricsQuery() {
  return useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: getDashboardMetrics,
    refetchInterval: 5000,
  });
}

export function useReviewsQuery(limit = 20) {
  return useQuery({
    queryKey: ["reviews-list", limit],
    queryFn: () => listReviews(limit),
    refetchInterval: 5000,
  });
}

// ── Company Rules API ──────────────────────────────────────────────────────

export interface CompanyRuleItem {
  _id: string;
  name: string;
  category: "security" | "bug" | "quality" | "performance" | "custom";
  description: string;
  ruleText: string;
  severity: "critical" | "high" | "medium" | "low";
  enabled: boolean;
  company: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyRuleInput {
  name: string;
  category: "security" | "bug" | "quality" | "performance" | "custom";
  description: string;
  ruleText: string;
  severity: "critical" | "high" | "medium" | "low";
  enabled?: boolean;
}

export interface UpdateCompanyRuleInput {
  name?: string;
  category?: "security" | "bug" | "quality" | "performance" | "custom";
  description?: string;
  ruleText?: string;
  severity?: "critical" | "high" | "medium" | "low";
  enabled?: boolean;
}

export async function listCompanyRules(params?: {
  category?: string;
  enabled?: boolean;
}): Promise<CompanyRuleItem[]> {
  const query = new URLSearchParams();
  if (params?.category && params.category !== "all") query.set("category", params.category);
  if (params?.enabled !== undefined) query.set("enabled", String(params.enabled));
  const qs = query.toString();
  return request<CompanyRuleItem[]>(`/api/company-rules${qs ? `?${qs}` : ""}`);
}

export async function createCompanyRule(data: CreateCompanyRuleInput): Promise<CompanyRuleItem> {
  return request<CompanyRuleItem>("/api/company-rules", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCompanyRule(
  id: string,
  data: UpdateCompanyRuleInput
): Promise<CompanyRuleItem> {
  return request<CompanyRuleItem>(`/api/company-rules/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function toggleCompanyRule(id: string): Promise<CompanyRuleItem> {
  return request<CompanyRuleItem>(`/api/company-rules/${id}/toggle`, {
    method: "PATCH",
  });
}

export async function deleteCompanyRule(id: string): Promise<{ id: string; deleted: boolean }> {
  return request<{ id: string; deleted: boolean }>(`/api/company-rules/${id}`, {
    method: "DELETE",
  });
}

export function useCompanyRulesQuery(params?: { category?: string; enabled?: boolean }) {
  return useQuery({
    queryKey: ["company-rules", params],
    queryFn: () => listCompanyRules(params),
  });
}

export function useCreateCompanyRuleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCompanyRuleInput) => createCompanyRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-rules"] });
    },
  });
}

export function useUpdateCompanyRuleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompanyRuleInput }) =>
      updateCompanyRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-rules"] });
    },
  });
}

export function useToggleCompanyRuleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleCompanyRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-rules"] });
    },
  });
}

export function useDeleteCompanyRuleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCompanyRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-rules"] });
    },
  });
}

// ── Platform Admin API ─────────────────────────────────────────────────────

export interface AdminStatsKpis {
  totalUsers: number;
  newUsersThisMonth: number;
  totalReviews: number;
  completedReviews: number;
  failedReviews: number;
  completionRate: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  activeEnvironment: string;
  uptimeSeconds: number;
}

export interface AdminSystemEvent {
  id: string;
  text: string;
  time: string;
  icon: "rev" | "usr" | "co" | "pay" | "up";
}

export interface AdminActivityMonth {
  month: string;
  count: number;
  completed: number;
}

export interface AdminTenantItem {
  id: string;
  name: string;
  plan: string;
  members: number;
  rules: number;
  reviews: number;
  health: number;
}

export interface AdminStatsResponse {
  kpis: AdminStatsKpis;
  activityTrend: AdminActivityMonth[];
  topTenants: AdminTenantItem[];
  systemEvents: AdminSystemEvent[];
}

export interface AdminCompanyItem {
  id: string;
  name: string;
  plan: string;
  members: number;
  rulesCount: number;
  reviewsCount: number;
}

export interface AdminCompaniesResponse {
  companies: AdminCompanyItem[];
  total: number;
}

export interface AdminUserItem {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: "member" | "company_admin" | "platform_admin";
  company?: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface AdminUsersListResponse {
  users: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getAdminStats(): Promise<AdminStatsResponse> {
  return request<AdminStatsResponse>("/api/admin/stats");
}

export async function listAdminCompanies(): Promise<AdminCompaniesResponse> {
  return request<AdminCompaniesResponse>("/api/admin/companies");
}

export async function listAdminUsers(params?: {
  role?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}): Promise<AdminUsersListResponse> {
  const query = new URLSearchParams();
  if (params?.role && params.role !== "all") query.set("role", params.role);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return request<AdminUsersListResponse>(`/api/admin/users${qs ? `?${qs}` : ""}`);
}

export async function updateAdminUserRole(
  userId: string,
  role: "member" | "company_admin" | "platform_admin"
): Promise<AdminUserItem> {
  return request<AdminUserItem>(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function toggleAdminUserStatus(userId: string): Promise<AdminUserItem> {
  return request<AdminUserItem>(`/api/admin/users/${userId}/status`, {
    method: "PATCH",
  });
}

export function useAdminStatsQuery() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: getAdminStats,
    refetchInterval: 10000,
  });
}

export function useAdminCompaniesQuery() {
  return useQuery({
    queryKey: ["admin-companies"],
    queryFn: listAdminCompanies,
    refetchInterval: 10000,
  });
}

export function useAdminUsersQuery(params?: {
  role?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}) {
  return useQuery({
    queryKey: ["admin-users", params],
    queryFn: () => listAdminUsers(params),
  });
}

export function useUpdateAdminUserRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: "member" | "company_admin" | "platform_admin";
    }) => updateAdminUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}

export function useToggleAdminUserStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => toggleAdminUserStatus(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}
