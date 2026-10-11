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


export type WorkspaceEntry = {
  type: "personal" | "company";
  companyId: string | null;
  name: string;
  role: "owner" | "admin" | "member" | "viewer";
  planCode: string;
  status: string;
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "member" | "company_admin" | "platform_admin";
  company?: string | null;
  /** Computed server-side from company.owner comparison. */
  companyRole?: "owner" | "admin" | "member" | null;
  isOwner?: boolean;
  workspaces?: WorkspaceEntry[];
  activeWorkspace?: WorkspaceEntry;
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

function computeApiBaseUrl(): string {
  // When running in the browser locally (on localhost or during dev), always use
  // relative "/api/v1" so requests route through the TanStack Start / Vite proxy.
  // Direct cross-origin calls to the backend get blocked by browser CORS policy!
  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".localhost") ||
      window.location.hostname === "0.0.0.0";

    if (isLocalhost || import.meta.env.DEV) {
      return "/api/v1";
    }
  }

  const envUrl =
    typeof import.meta !== "undefined" &&
    (import.meta.env["VITE_API_BASE_URL"] || import.meta.env["VITE_API_URL"]);

  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
  }

  if (import.meta.env.DEV) {
    return "/api/v1";
  }

  return "http://localhost:5000/api/v1";
}

const API_BASE_URL = computeApiBaseUrl();
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

function resolveApiUrl(path: string): string {
  const endpoint = path.replace(/^\/api\/v1(?=\/)/, "").replace(/^\/api(?=\/)/, "");
  return `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

export function handleUnauthorized(): void {
  if (unauthorizedHandler) {
    unauthorizedHandler();
    return;
  }
  setAuthToken(null);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const localToken = localStorage.getItem("reviewx_token") || sessionStorage.getItem("reviewx_token");
  if (localToken && localToken.trim().length > 0) return localToken.trim();

  const cookieToken = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => /^(reviewx_token|access_token|accesstoken|auth_token|token|jwt)=/i.test(cookie));

  if (cookieToken) {
    const separator = cookieToken.indexOf("=");
    const value = cookieToken.slice(separator + 1);
    try {
      const decoded = decodeURIComponent(value);
      const token = decoded.startsWith("Bearer ") ? decoded.slice(7).trim() : decoded;
      if (token) return token;
    } catch {
      if (value) return value;
    }
  }

  return null;
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("reviewx_token", token);
    document.cookie = `reviewx_token=${encodeURIComponent(token)}; path=/; SameSite=Lax; Max-Age=604800`;
  } else {
    localStorage.removeItem("reviewx_token");
    sessionStorage.removeItem("reviewx_token");
    for (const name of ["reviewx_token", "access_token", "accesstoken", "auth_token", "token", "jwt"]) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    }
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = resolveApiUrl(path);
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, */*",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  if (res.status === 401) {
    if (path.includes("/auth/me")) {
      handleUnauthorized();
    }
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = body?.error;
    const message =
      typeof error === "string"
        ? error
        : error?.message || body?.message || `Request failed with status ${res.status}`;
    const code =
      typeof error === "object" && error?.code
        ? error.code
        : typeof body?.code === "string"
          ? body.code
          : "UNKNOWN_ERROR";
    const details = (typeof error === "object" && error?.details) || body?.errors;
    throw new ApiClientError(message, code, res.status, details);
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
  accountType?: "individual" | "company_owner";
  companyName?: string;
}): Promise<AuthResponseData> {
  const data = await request<AuthResponseData>("/api/v1/auth/register", {
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
  const data = await request<AuthResponseData>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const res = await request<{ user: AuthUser }>("/api/v1/auth/me", {
    method: "GET",
  });
  return res.user;
}

export async function switchWorkspace(
  workspaceType: "personal" | "company",
  companyId?: string,
): Promise<{ token: string; expiresIn: string; activeWorkspace: WorkspaceEntry }> {
  return request<{ token: string; expiresIn: string; activeWorkspace: WorkspaceEntry }>(
    "/api/v1/auth/switch-workspace",
    {
      method: "POST",
      body: JSON.stringify({ workspaceType, companyId }),
    },
  );
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
    refetchInterval?: number | false;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ["review", reviewId],
    queryFn: () => (reviewId ? getReview(reviewId) : null),
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(reviewId),
    ...(options?.refetchInterval !== undefined ? { refetchInterval: options.refetchInterval } : {}),
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

export function useDashboardMetricsQuery(userId?: string) {
  return useQuery({
    queryKey: ["dashboard-metrics", userId ?? "anonymous"],
    queryFn: getDashboardMetrics,
    refetchInterval: 5000,
  });
}

export function useReviewsQuery(limit = 20, userId?: string) {
  return useQuery({
    queryKey: ["reviews-list", userId ?? "anonymous", limit],
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

// ── Company Members API ────────────────────────────────────────────────────

export interface CompanyMember {
  id: string;
  name: string;
  email: string;
  role: string;
  rawRole?: string;
  reviews: number;
  avg: number;
  open: number;
  trend: "up" | "down" | "neutral";
  createdAt: string;
}

export async function getCompanyMembers(): Promise<CompanyMember[]> {
  return request<CompanyMember[]>("/api/company/members");
}

export function useCompanyMembersQuery(userId?: string) {
  return useQuery({
    queryKey: ["company-members", userId ?? "anonymous"],
    queryFn: getCompanyMembers,
    refetchInterval: 5000,
  });
}

export interface InvitationInfo {
  email: string;
  companyName: string;
  role: string;
  accountExists: boolean;
  expiresAt: string;
}

export interface CreatedInvitation {
  invitation: {
    id: string;
    email: string;
    role: string;
    status: "pending" | "accepted" | "revoked";
    expiresAt: string;
    createdAt?: string;
  };
  emailSent: boolean;
  emailError?: string | null;
  inviteUrl: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "revoked";
  expiresAt: string;
  createdAt: string;
}

/** Preview a public invite token (no auth). */
export async function getInvitationInfo(token: string): Promise<InvitationInfo> {
  return request<InvitationInfo>(`/api/v1/invitations/${encodeURIComponent(token)}`);
}

/**
 * Accept an invite.
 * New-account branch: send { name, password } (no auth needed).
 * Existing-account branch: send {} with a session as the invited email.
 */
export async function acceptInvitation(
  token: string,
  payload: { name?: string; password?: string }
): Promise<AuthResponseData> {
  return request<AuthResponseData>(
    `/api/v1/invitations/${encodeURIComponent(token)}/accept`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

// ── Company invitation management (company_admin) ──────────────────────────

export async function createInvitation(data: {
  email: string;
}): Promise<CreatedInvitation> {
  return request<CreatedInvitation>("/api/v1/company/invitations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listInvitations(status?: string): Promise<PendingInvitation[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<PendingInvitation[]>(`/api/v1/company/invitations${query}`);
}

export async function revokeInvitation(id: string): Promise<PendingInvitation> {
  return request<PendingInvitation>(`/api/v1/company/invitations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function useInviteCompanyMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-members"] });
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useInvitationsQuery(enabled = true) {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: () => listInvitations(),
    enabled,
  });
}

export function useRevokeInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

// ── Company Settings API ───────────────────────────────────────────────────

export interface CompanyProfile {
  _id: string;
  name: string;
  slug: string;
  owner?: {
    _id: string;
    name: string;
    email: string;
  } | string;
  membersCount: number;
  createdAt: string;
}

export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  return request<CompanyProfile | null>("/api/v1/company/profile");
}

export async function updateCompanyProfile(data: { name: string }): Promise<CompanyProfile> {
  return request<CompanyProfile>("/api/v1/company/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function useCompanyProfileQuery(enabled = true) {
  return useQuery({
    queryKey: ["company-profile"],
    queryFn: getCompanyProfile,
    enabled,
  });
}

export function useUpdateCompanyProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCompanyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-profile"] });
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

// ── Admin: Queue / Monitoring types ───────────────────────────────────────

export interface QueueCounts {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  healthy: boolean;
  error?: string;
}

export interface QueuesSummary {
  queues: {
    review: QueueCounts;
    report: QueueCounts;
    cleanup: QueueCounts;
  };
  totalFailed: number;
  totalWaiting: number;
}

export interface QueueJobDetail {
  id: string;
  name: string;
  failedReason: string;
  attemptsMade: number;
  timestamp: string | null;
  processedOn: string | null;
  finishedOn: string | null;
}

export interface QueuesDetail {
  queues: {
    review: { name: string; counts: Record<string, number>; failedJobs: QueueJobDetail[]; error?: string };
    report: { name: string; counts: Record<string, number>; failedJobs: QueueJobDetail[]; error?: string };
    cleanup: { name: string; counts: Record<string, number>; failedJobs: QueueJobDetail[]; error?: string };
  };
}

export interface AdminReviewItem {
  id: string;
  reviewId: string;
  status: string;
  score?: number | null;
  language?: string | null;
  fileName?: string | null;
  findingsCount?: number;
  userId?: string;
  ownerId?: string;
  createdAt: string;
  userInfo?: { name: string; email: string } | null;
}

export interface AuditLogItem {
  _id: string;
  actorId?: { _id: string; name: string; email: string; role?: string } | null;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  status: "success" | "failure";
  metadata: Record<string, unknown>;
  ipAddress?: string | null;
  createdAt: string;
}

export interface EmailLogItem {
  _id: string;
  provider: string;
  to: string;
  subject: string;
  status: "sent" | "failed" | "skipped";
  resendId?: string | null;
  errorMessage?: string | null;
  mode: string;
  createdAt: string;
}

export interface PlatformSettings {
  application: {
    name: string;
    version: string;
    environment: string;
    uptimeSeconds: number;
    nodeVersion: string;
  };
  queues: {
    concurrency: number;
    attempts: number;
    backoffMs: number;
    removeOnComplete: number;
    removeOnFail: number;
  };
  integrations: {
    ai: { enabled: boolean; provider: string };
    github: { enabled: boolean };
    cloudinary: { enabled: boolean };
    email: { enabled: boolean; from: string };
    chapa: { enabled: boolean };
  };
  featureFlags: {
    aiAnalysisEnabled: boolean;
    githubIntegrationEnabled: boolean;
    emailEnabled: boolean;
    pdfReportsEnabled: boolean;
    advancedAnalysisEnabled: boolean;
  };
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

// ── Admin: Queues ──────────────────────────────────────────────────────────

export async function getQueuesSummary(): Promise<QueuesSummary> {
  return request<QueuesSummary>("/api/v1/admin/queues/summary");
}

export async function getQueuesDetail(): Promise<QueuesDetail> {
  return request<QueuesDetail>("/api/v1/admin/queues");
}

export async function retryFailedJobs(queue: string): Promise<{ retried: number; queue: string }> {
  return request<{ retried: number; queue: string }>(
    `/api/v1/admin/queues/${encodeURIComponent(queue)}/retry-failed`,
    { method: "POST" },
  );
}

// ── Admin: Reviews monitoring ─────────────────────────────────────────────

export async function listAllAdminReviews(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ reviews: AdminReviewItem[]; total: number; page: number; totalPages: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status && params.status !== "all") searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  return request<{ reviews: AdminReviewItem[]; total: number; page: number; totalPages: number }>(
    `/api/v1/admin/reviews${qs ? `?${qs}` : ""}`,
  );
}

// ── Admin: Activity / Audit log ───────────────────────────────────────────

export async function listAllAuditLogs(params?: {
  action?: string;
  resourceType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{ logs: AuditLogItem[]; total: number; page: number; totalPages: number }> {
  const searchParams = new URLSearchParams();
  if (params?.action && params.action !== "all") searchParams.set("action", params.action);
  if (params?.resourceType && params.resourceType !== "all") searchParams.set("resourceType", params.resourceType);
  if (params?.status && params.status !== "all") searchParams.set("status", params.status);
  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  return request<{ logs: AuditLogItem[]; total: number; page: number; totalPages: number }>(
    `/api/v1/admin/activity${qs ? `?${qs}` : ""}`,
  );
}

// ── Admin: Email logs ─────────────────────────────────────────────────────

export async function listEmailLogs(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ logs: EmailLogItem[]; total: number; page: number; totalPages: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status && params.status !== "all") searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  return request<{ logs: EmailLogItem[]; total: number; page: number; totalPages: number }>(
    `/api/v1/admin/email-logs${qs ? `?${qs}` : ""}`,
  );
}

// ── Admin: Platform settings ──────────────────────────────────────────────

export async function getPlatformSettings(): Promise<PlatformSettings> {
  return request<PlatformSettings>("/api/v1/admin/settings");
}

// ── Auth: Revoke other sessions ───────────────────────────────────────────

export async function revokeOtherSessions(): Promise<{ token: string; expiresIn: string; user: AuthUser }> {
  return request<{ token: string; expiresIn: string; user: AuthUser }>(
    "/api/v1/auth/revoke-other-sessions",
    { method: "POST" },
  );
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

export function useQueuesSummaryQuery() {
  return useQuery({
    queryKey: ["admin-queues-summary"],
    queryFn: getQueuesSummary,
    refetchInterval: 10000,
  });
}

export function useQueuesDetailQuery() {
  return useQuery({
    queryKey: ["admin-queues-detail"],
    queryFn: getQueuesDetail,
    refetchInterval: 15000,
  });
}

export function useRetryFailedJobsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queue: string) => retryFailedJobs(queue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-queues-summary"] });
      queryClient.invalidateQueries({ queryKey: ["admin-queues-detail"] });
    },
  });
}

export function useAdminReviewsQuery(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["admin-reviews", params],
    queryFn: () => listAllAdminReviews(params),
  });
}

export function useAuditLogsQuery(params?: {
  action?: string;
  resourceType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["admin-audit-logs", params],
    queryFn: () => listAllAuditLogs(params),
  });
}

export function useEmailLogsQuery(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["admin-email-logs", params],
    queryFn: () => listEmailLogs(params),
    refetchInterval: 30000,
  });
}

export function usePlatformSettingsQuery() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: getPlatformSettings,
    staleTime: 60000,
  });
}

export function useRevokeOtherSessionsMutation() {
  return useMutation({
    mutationFn: revokeOtherSessions,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface PlatformSettingsFull {
  general: {
    platformName: string;
    supportEmail: string;
    maintenanceMode: boolean;
    announcementBanner: string;
  };
  access: {
    allowPublicSignup: boolean;
    requireEmailVerification: boolean;
  };
  ai: {
    killSwitch: boolean;
    activeProvider: "groq" | "openai";
    activeModel: string;
    estimatedCostPerCallETB: number;
  };
  reviewEngine: {
    enabledLanguages: string[];
    globalMaxLinesPerReview: number;
    globalMaxFileSizeBytes: number;
  };
  billing: {
    gracePeriodDays: number;
    receiptCompanyName: string;
    receiptAddress: string;
    receiptTaxId: string;
  };
  _env: {
    appUrl: string;
    apiUrl: string;
    corsOrigin: string;
    nodeVersion: string;
    nodeEnv: string;
    appVersion: string;
    uptimeSeconds: number;
  };
  _meta: {
    updatedBy: string | null;
    updatedAt: string | null;
    version: number;
  };
}

export interface IntegrationStatuses {
  chapa: { configured: boolean; mode: "test" | "live" | null; webhookUrl: string | null };
  resend: { configured: boolean; from: string | null };
  github: { appConfigured: boolean; oauthConfigured: boolean; callbackUrl: string | null };
  voxide: { configured: boolean };
  ai: { groq: { configured: boolean }; openai: { configured: boolean } };
  cloudinary: { configured: boolean };
}

export interface AdminUser {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchPlatformSettings(): Promise<PlatformSettingsFull> {
  return request<PlatformSettingsFull>("/api/v1/admin/platform-settings");
}

export async function updatePlatformSettingsSection(
  section: string,
  updates: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`/api/v1/admin/platform-settings/${section}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function fetchIntegrationStatuses(): Promise<IntegrationStatuses> {
  return request<IntegrationStatuses>("/api/v1/admin/platform-settings/integrations");
}

export async function triggerTestEmail(): Promise<{
  sent: boolean;
  mode: string;
  error: string | null;
  recipientEmail: string;
}> {
  return request<{ sent: boolean; mode: string; error: string | null; recipientEmail: string }>(
    "/api/v1/admin/platform-settings/test-email",
    { method: "POST" },
  );
}

export async function fetchAdminList(): Promise<AdminUser[]> {
  return request<AdminUser[]>("/api/v1/admin/admins");
}

export async function promoteUserToAdmin(
  userId: string,
  reason: string,
): Promise<{ id: string; name: string; email: string; role: string }> {
  return request<{ id: string; name: string; email: string; role: string }>(
    "/api/v1/admin/admins/promote",
    { method: "POST", body: JSON.stringify({ userId, reason }) },
  );
}

export async function demoteUserFromAdmin(
  userId: string,
  reason: string,
): Promise<{ id: string; name: string; email: string; role: string }> {
  return request<{ id: string; name: string; email: string; role: string }>(
    "/api/v1/admin/admins/demote",
    { method: "POST", body: JSON.stringify({ userId, reason }) },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function usePlatformSettingsFullQuery() {
  return useQuery({
    queryKey: ["platform-settings-full"],
    queryFn: fetchPlatformSettings,
    staleTime: 30000,
  });
}

export function useUpdatePlatformSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      section,
      updates,
    }: {
      section: string;
      updates: Record<string, unknown>;
    }) => updatePlatformSettingsSection(section, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings-full"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
  });
}

export function useIntegrationStatusesQuery() {
  return useQuery({
    queryKey: ["integration-statuses"],
    queryFn: fetchIntegrationStatuses,
    staleTime: 60000,
  });
}

export function useSendTestEmailMutation() {
  return useMutation({
    mutationFn: triggerTestEmail,
  });
}

export function useAdminListQuery() {
  return useQuery({
    queryKey: ["admin-list"],
    queryFn: fetchAdminList,
  });
}

export function usePromoteAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      promoteUserToAdmin(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useDemoteAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      demoteUserFromAdmin(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
