import { useQuery } from "@tanstack/react-query";
import {
  getApiBaseUrl,
  getAuthToken,
  handleUnauthorized,
  type DashboardFinding,
  type DashboardMetrics,
  type DashboardReview,
} from "./api";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type ReviewOptions = {
  securityAnalysis?: boolean;
  bugDetection?: boolean;
  codeQuality?: boolean;
  performance?: boolean;
};

export type ReviewSource = {
  type: "paste" | "upload" | "archive" | "github";
  content?: string;
  filename?: string;
  path?: string;
  connectionId?: string;
  repository?: {
    owner: string;
    name: string;
    ref?: string;
  };
  files?: Array<{
    path?: string;
    filename?: string;
    content: string;
  }>;
};

export type CreateReviewPayload = {
  projectName: string;
  source: ReviewSource;
  options?: ReviewOptions;
};

export type SubscriptionTier = "free" | "pro" | "enterprise";

export const TIER_POLICIES: Record<
  SubscriptionTier,
  {
    maxLinesPerReview: number;
    maxFilesPerReview: number;
    archiveUpload: boolean;
    aiAnalysis: boolean;
    aiRemediation: boolean;
    advancedAnalysis: boolean;
    githubIntegration: boolean;
    companyRules: boolean;
    scheduledReviews: boolean;
    htmlReport: boolean;
    pdfReport: boolean;
    jsonReport: boolean;
    maxConcurrentReviews: number;
  }
> = {
  free: {
    maxLinesPerReview: 500,
    maxFilesPerReview: 1,
    archiveUpload: false,
    aiAnalysis: false,
    aiRemediation: false,
    advancedAnalysis: false,
    githubIntegration: false,
    companyRules: false,
    scheduledReviews: false,
    htmlReport: false,
    pdfReport: false,
    jsonReport: true,
    maxConcurrentReviews: 1,
  },
  pro: {
    maxLinesPerReview: 5000,
    maxFilesPerReview: 100,
    archiveUpload: true,
    aiAnalysis: true,
    aiRemediation: true,
    advancedAnalysis: true,
    githubIntegration: false,
    companyRules: false,
    scheduledReviews: false,
    htmlReport: true,
    pdfReport: false,
    jsonReport: true,
    maxConcurrentReviews: 3,
  },
  enterprise: {
    maxLinesPerReview: Number.POSITIVE_INFINITY,
    maxFilesPerReview: Number.POSITIVE_INFINITY,
    archiveUpload: true,
    aiAnalysis: true,
    aiRemediation: true,
    advancedAnalysis: true,
    githubIntegration: true,
    companyRules: true,
    scheduledReviews: true,
    htmlReport: true,
    pdfReport: true,
    jsonReport: true,
    maxConcurrentReviews: 10,
  },
};

export type ReviewScore = {
  overall?: number | null;
  security?: number | null;
  bugs?: number | null;
  quality?: number | null;
  performance?: number | null;
  [key: string]: number | string | null | undefined;
};

export type ReviewFinding = {
  _id?: string;
  id?: string;
  reviewId?: string;
  ruleId?: string;
  title?: string;
  description?: string;
  severity?: string;
  confidence?: number | string | null;
  category?: string;
  filePath?: string;
  lineStart?: number | null;
  lineEnd?: number | null;
  status?: string;
  remediation?: string | null;
  evidenceId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AiAnalysisFinding = {
  ruleId?: string;
  assessment?: string;
  explanation?: string;
  remediation?: string;
};

export type AiAnalysisImprovement = {
  ruleId?: string;
  suggestion?: string;
  reason?: string;
};

export type AiAnalysisRecord = {
  _id?: string;
  reviewId?: string;
  provider?: string;
  model?: string;
  status?: string;
  analysisType?: string;
  result?: {
    enabled?: boolean;
    available?: boolean;
    provider?: string;
    status?: string;
    summary?: {
      summary?: string;
      riskAreas?: string[];
      priorities?: string[];
    };
    findings?: AiAnalysisFinding[];
    improvements?: AiAnalysisImprovement[];
    riskAreas?: string[];
    priorities?: string[];
    errors?: string[];
  };
  usage?: {
    promptTokens?: number | null;
    completionTokens?: number | null;
    totalTokens?: number | null;
  };
  errorCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ReviewDetails = {
  review: {
    id: string;
    ownerId?: string | null;
    projectId?: string | null;
    sourceType?: string;
    status?: string;
    languages?: string[];
    totalFiles?: number;
    totalLines?: number;
    findingCounts?: Record<string, number>;
    score?: number | null;
    errorCode?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  findings: ReviewFinding[];
  score: ReviewScore | null;
  aiAnalysis?: AiAnalysisRecord[];
};

export type ReviewReport = {
  reportId?: string;
  reviewId?: string;
  format?: "json" | "html" | "pdf";
  status?: "pending" | "generating" | "completed" | "failed";
  storageProvider?: string | null;
  publicId?: string | null;
  secureUrl?: string | null;
  resourceType?: string | null;
  errorCode?: string | null;
  ownerId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ScheduledReview = {
  scheduleId?: string;
  ownerId?: string | null;
  reviewId?: string | null;
  intervalSeconds?: number;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  enabled?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ProjectRecord = {
  id: string;
  ownerId?: string;
  name: string;
  normalizedName: string;
  sourceType: string;
  repository?: {
    provider?: string | null;
    owner?: string | null;
    name?: string | null;
    defaultBranch?: string | null;
  } | null;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ReviewIndexRecord = {
  reviewId?: string;
  id?: string;
  _id?: string;
  projectId?: string;
  ownerId?: string;
  status?: string;
  sourceType?: string;
  languages?: string[];
  findingCounts?: Record<string, number>;
  score?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type SubscriptionRecord = {
  _id?: string;
  userId: string;
  plan: SubscriptionTier;
  status: "active" | "expired" | "cancelled";
  startedAt: string;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PaymentInitiation = {
  paymentId: string;
  txRef: string;
  plan: SubscriptionTier;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed";
  checkoutUrl: string;
};

export type GithubUser = {
  login: string;
  id?: number;
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  htmlUrl?: string | null;
};

export type GithubRepository = {
  id?: number;
  owner?: string | null;
  name: string;
  fullName?: string;
  private?: boolean;
  defaultBranch?: string | null;
  htmlUrl?: string | null;
  description?: string | null;
};

export type GithubBranch = {
  name: string;
  protected?: boolean;
  commitSha?: string | null;
};

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string; details?: unknown };
  meta?: { requestId?: string };
};

const responseEnvelopes = new WeakMap<object, { success: boolean; meta?: ApiEnvelope<unknown>["meta"] }>();

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly payload: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const API_BASE = getApiBaseUrl();
const API_ORIGIN = API_BASE.replace(/\/api\/v1$/, "");

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isMultipart = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers = new Headers(init?.headers);
  if (!isMultipart && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? String((payload as { error?: { message?: string } }).error?.message ?? "Request failed")
        : "Request failed";
    throw new ApiRequestError(message, response.status, payload);
  }

  if (!payload || typeof payload !== "object" || !("success" in payload)) {
    throw new Error("Unexpected response from API");
  }

  if (payload.data !== null && (typeof payload.data === "object" || typeof payload.data === "function")) {
    responseEnvelopes.set(payload.data, {
      success: payload.success,
      ...(payload.meta ? { meta: payload.meta } : {}),
    });
  }
  return payload.data as T;
}

export async function getApiHealth(): Promise<{ status: string; service: string; version: string }> {
  const headers = new Headers({ Accept: "application/json" });
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_ORIGIN}/health`, {
    credentials: "include",
    headers,
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ status: string; service: string; version: string }> | null;
  if (response.status === 401) handleUnauthorized();
  if (!response.ok || !payload?.success || !payload.data) {
    const message = payload?.error?.message ?? `Health check failed (${response.status})`;
    throw new ApiRequestError(message, response.status, payload);
  }
  if (typeof payload.data === "object") {
    responseEnvelopes.set(payload.data, {
      success: payload.success,
      ...(payload.meta ? { meta: payload.meta } : {}),
    });
  }
  return payload.data;
}

export function getApiEnvelopeMetadata(data: unknown): { success: boolean; meta?: ApiEnvelope<unknown>["meta"] } | undefined {
  return data !== null && typeof data === "object" ? responseEnvelopes.get(data) : undefined;
}

export function getApiErrorResponse(error: unknown): unknown {
  return error instanceof ApiRequestError
    ? { status: error.statusCode, body: error.payload }
    : undefined;
}

import { createServerFn } from "@tanstack/react-start";

export const getGithubConnectUrlFn = createServerFn({ method: "GET" })
  .validator((token: string) => token)
  .handler(async ({ data: token }) => {
    // Determine absolute backend URL for server-side fetch
    const backendUrl = process.env.VITE_API_BASE_URL || process.env.VITE_API_URL || "http://localhost:5000/api/v1";
    const absoluteUrl = backendUrl.replace(/\/$/, "") + "/github/connect";

    // We run on the server (Nitro) where Node's fetch can read Location headers from manual redirects!
    const response = await fetch(absoluteUrl, {
      method: "GET",
      headers: { 
        "Accept": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("Location");
      if (location) return location;
    }
    
    throw new Error("Failed to get GitHub redirect URL");
  });

export async function startGithubConnect(): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new ApiRequestError("Not authenticated", 401, null);
  
  const location = await getGithubConnectUrlFn({ data: token });
  window.location.assign(location);
}


export async function completeGithubOAuth(params: {
  state?: string;
  code?: string;
  error?: string;
  error_description?: string;
}): Promise<{
  connected: boolean;
  provider: "github";
  connectionId: string;
  scope: string;
  githubUser: GithubUser;
}> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  return apiFetch<{
    connected: boolean;
    provider: "github";
    connectionId: string;
    scope: string;
    githubUser: GithubUser;
  }>(`/github/callback?${query.toString()}`);
}

export async function createReview(payload: CreateReviewPayload): Promise<{ review: { id: string; status: string; jobId?: string }; status: string; project: { id: string; name: string; sourceType: string } }> {
  return apiFetch<{ review: { id: string; status: string; jobId?: string }; status: string; project: { id: string; name: string; sourceType: string } }>("/reviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSubscription(): Promise<SubscriptionRecord> {
  const result = await apiFetch<{ subscription: SubscriptionRecord }>("/subscriptions");
  return result.subscription;
}

export async function initiateSubscriptionPayment(plan: "pro" | "enterprise"): Promise<PaymentInitiation> {
  const endpoint = plan === "pro" ? "/payment/pro/initiate" : "/payment/enterprise/initiate";
  const payment = await apiFetch<PaymentInitiation>(endpoint, {
    method: "POST",
  });
  if (!payment.checkoutUrl || !payment.txRef || payment.plan !== plan) {
    throw new Error("The payment service returned incomplete checkout details.");
  }
  return payment;
}

export type PaymentVerification = {
  payment: {
    txRef: string;
    plan: "pro" | "enterprise";
    status: "pending" | "paid" | "failed";
  };
  alreadyProcessed: boolean;
  verificationStatus: "pending" | "paid" | "failed";
};

export async function verifySubscriptionPayment(txRef: string): Promise<PaymentVerification> {
  if (!txRef.trim()) {
    throw new Error("A transaction reference is required to verify payment.");
  }
  return apiFetch<PaymentVerification>(`/payment/verify/${encodeURIComponent(txRef.trim())}`);
}

export function useSubscriptionQuery(
  userId?: string,
  options?: { untilPlan?: SubscriptionTier; pollIntervalMs?: number },
) {
  const untilPlan = options?.untilPlan;
  return useQuery({
    queryKey: ["subscription", userId ?? "current-user"],
    queryFn: getSubscription,
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnMount: "always",
    refetchInterval: untilPlan
      ? (query) => {
          const planOrder: Record<SubscriptionTier, number> = { free: 0, pro: 1, enterprise: 2 };
          return query.state.data && planOrder[query.state.data.plan] >= planOrder[untilPlan]
            ? false
            : options?.pollIntervalMs ?? 3000;
        }
      : false,
  });
}

export async function getReview(reviewId: string): Promise<ReviewDetails> {
  return apiFetch<ReviewDetails>(`/reviews/${encodeURIComponent(reviewId)}`);
}

export async function listProjects(limit = 50, skip = 0): Promise<ProjectRecord[]> {
  const query = new URLSearchParams({ limit: String(limit), skip: String(skip) });
  return apiFetch<ProjectRecord[]>(`/projects?${query.toString()}`);
}

export async function listAllReviews(limit = 100, skip = 0): Promise<{ reviews: ReviewIndexRecord[] }> {
  const query = new URLSearchParams({ limit: String(limit), skip: String(skip) });
  return apiFetch<{ reviews: ReviewIndexRecord[] }>(`/reviews/all?${query.toString()}`);
}

export async function listReviewReports(reviewId: string): Promise<ReviewReport[]> {
  return apiFetch<ReviewReport[]>(`/reviews/${encodeURIComponent(reviewId)}/reports`);
}

export async function getReport(reportId: string): Promise<ReviewReport> {
  return apiFetch<ReviewReport>(`/reports/${encodeURIComponent(reportId)}`);
}

export async function createReport(reviewId: string, format: ReviewReport["format"] = "json"): Promise<ReviewReport> {
  return apiFetch<ReviewReport>(`/reviews/${encodeURIComponent(reviewId)}/reports`, {
    method: "POST",
    body: JSON.stringify({ format }),
  });
}

export async function listScheduledReviews(): Promise<ScheduledReview[]> {
  return apiFetch<ScheduledReview[]>("/scheduled-reviews");
}

export async function getScheduledReview(scheduleId: string): Promise<ScheduledReview> {
  return apiFetch<ScheduledReview>(`/scheduled-reviews/${encodeURIComponent(scheduleId)}`);
}

export async function createScheduledReview(params: {
  reviewId: string;
  intervalSeconds: number;
}): Promise<ScheduledReview> {
  return apiFetch<ScheduledReview>("/scheduled-reviews", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function cancelScheduledReview(scheduleId: string): Promise<ScheduledReview> {
  return apiFetch<ScheduledReview>(`/scheduled-reviews/${encodeURIComponent(scheduleId)}`, {
    method: "DELETE",
  });
}

export async function getGithubConnectionUser(connectionId: string): Promise<{ githubUser: GithubUser }> {
  return apiFetch<{ githubUser: GithubUser }>(`/github/connections/${encodeURIComponent(connectionId)}/user`);
}

export async function listGithubRepositories(connectionId: string, page?: number, perPage?: number): Promise<{ repositories: GithubRepository[] }> {
  const search = new URLSearchParams();
  if (page) search.set("page", String(page));
  if (perPage) search.set("perPage", String(perPage));
  const query = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<{ repositories: GithubRepository[] }>(`/github/connections/${encodeURIComponent(connectionId)}/repositories${query}`);
}

export async function listGithubBranches(
  connectionId: string,
  owner: string,
  name: string,
  page?: number,
  perPage?: number,
): Promise<{ branches: GithubBranch[] }> {
  const search = new URLSearchParams();
  if (page) search.set("page", String(page));
  if (perPage) search.set("perPage", String(perPage));
  const query = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<{ branches: GithubBranch[] }>(`/github/connections/${encodeURIComponent(connectionId)}/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/branches${query}`);
}

export async function getGithubRepository(
  connectionId: string,
  owner: string,
  name: string,
  ref?: string,
): Promise<{ repository: GithubRepository }> {
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  return apiFetch<{ repository: GithubRepository }>(`/github/connections/${encodeURIComponent(connectionId)}/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(name)}${query}`);
}

const getReviewIdentifier = (review: ReviewIndexRecord): string =>
  String(review.reviewId ?? review.id ?? review._id ?? "");

const getReviewScore = (review?: ReviewDetails, fallback?: number | null): number | null => {
  const score = review?.score as (ReviewDetails["score"] & { overall?: number | null }) | null;
  const value = score?.overall ?? review?.review.score ?? fallback;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const getRelativeDate = (value?: string | null): string => {
  if (!value) return "Date unavailable";
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed)) return "Date unavailable";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

async function getDashboardData(): Promise<{
  metrics: DashboardMetrics;
  reviews: DashboardReview[];
}> {
  const [reviewIndex, projects] = await Promise.all([
    listAllReviews(100, 0),
    listProjects(100, 0),
  ]);
  const records = reviewIndex.reviews;
  const latestRecords = records.slice(0, 20);
  const details = await Promise.all(
    latestRecords.map(async (record) => ({
      record,
      details: await getReview(getReviewIdentifier(record)),
    })),
  );
  const detailsById = new Map(
    details.map(({ record, details: item }) => [getReviewIdentifier(record), item]),
  );
  const severityTotals = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let resolvedCount = 0;
  let findingTotal = 0;
  const categoryScores = { security: [] as number[], bugs: [] as number[], quality: [] as number[], performance: [] as number[] };
  const openFindings: DashboardFinding[] = [];

  for (const record of records) {
    const counts = record.findingCounts ?? {};
    let reviewFindingTotal = 0;
    for (const severity of Object.keys(severityTotals) as Array<keyof typeof severityTotals>) {
      const count = Number(counts[severity] ?? 0);
      severityTotals[severity] += count;
      reviewFindingTotal += count;
    }
    const item = detailsById.get(getReviewIdentifier(record));
    if (reviewFindingTotal === 0 && item) {
      reviewFindingTotal = item.findings.length;
      for (const finding of item.findings) {
        const severity = String(finding.severity ?? "").toLowerCase();
        if (severity in severityTotals) {
          severityTotals[severity as keyof typeof severityTotals] += 1;
        }
      }
    }
    findingTotal += reviewFindingTotal;
  }

  for (const { details: item } of details) {
    const findings = item.findings ?? [];
    for (const finding of findings) {
      if (finding.status?.toLowerCase() === "resolved") {
        resolvedCount += 1;
      } else if (openFindings.length < 20) {
        openFindings.push({
          id: String(finding._id ?? finding.id ?? `${item.review.id}-${openFindings.length}`),
          title: finding.title ?? finding.ruleId ?? "Finding",
          severity: normalizeSeverity(finding.severity),
          file: formatFindingFilePath(finding.filePath),
          category: normalizeCategory(finding.category),
          reviewId: item.review.id,
        });
      }
    }

    const score = item.score as (ReviewDetails["score"] & {
      security?: number | null;
      bugs?: number | null;
      quality?: number | null;
      performance?: number | null;
    }) | null;
    for (const key of Object.keys(categoryScores) as Array<keyof typeof categoryScores>) {
      const value = score?.[key];
      if (typeof value === "number" && Number.isFinite(value)) categoryScores[key].push(value);
    }
  }

  const toAverage = (scores: number[]) =>
    scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
  const dashboardReviews = records.map((record): DashboardReview => {
    const id = getReviewIdentifier(record);
    const item = detailsById.get(id);
    const project = projects.find((entry) => entry.id === item?.review.projectId);
    const counts = record.findingCounts ?? item?.review.findingCounts ?? {};
    const unresolvedUrgent = item?.findings.some(
      (finding) =>
        finding.status?.toLowerCase() !== "resolved" &&
        ["critical", "high"].includes(String(finding.severity ?? "").toLowerCase()),
    ) ?? (Number(counts["critical"] ?? 0) + Number(counts["high"] ?? 0) > 0);
    const createdAt = item?.review.createdAt ?? record.createdAt ?? null;
    const language = item?.review.languages?.[0] ?? record.languages?.[0] ?? item?.review.sourceType ?? record.sourceType ?? "Source";
    const rawScore = getReviewScore(item, record.score);
    const score = rawScore ?? 0;
    const count = Object.values(counts).reduce((total, value) => total + Number(value || 0), 0);
    return {
      id,
      reviewId: id,
      name: project?.name ?? item?.review.sourceType ?? record.sourceType ?? "Code review",
      lang: language,
      langBadge: language.slice(0, 3).toUpperCase(),
      score,
      date: createdAt ? new Date(createdAt).toLocaleDateString() : "—",
      relativeDate: getRelativeDate(createdAt),
      status: unresolvedUrgent ? "Needs attention" : item?.review.status ?? record.status ?? "unknown",
      findings: count || item?.findings.length || 0,
      severityCounts: {
        critical: Number(counts["critical"] ?? 0),
        high: Number(counts["high"] ?? 0),
        medium: Number(counts["medium"] ?? 0),
        low: Number(counts["low"] ?? 0),
      },
      ...(createdAt ? { createdAt } : {}),
    };
  });
  const scoresByReviewId = new Map<string, number>();
  for (const record of records) {
    const item = detailsById.get(getReviewIdentifier(record));
    const rawScore = getReviewScore(item, record.score);
    if (rawScore !== null) {
      scoresByReviewId.set(getReviewIdentifier(record), rawScore);
    }
  }
  const scoreTrend = [...dashboardReviews]
    .filter((review) => review.createdAt && scoresByReviewId.has(review.id))
    .sort((left, right) => new Date(left.createdAt!).getTime() - new Date(right.createdAt!).getTime())
    .slice(-7)
    .map((review) => ({
      label: new Date(review.createdAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: review.score,
    }));

  return {
    reviews: dashboardReviews,
    metrics: {
      totalReviews: records.length,
      totalFindings: findingTotal,
      criticalCount: severityTotals.critical,
      highCount: severityTotals.high,
      mediumCount: severityTotals.medium,
      lowCount: severityTotals.low,
      resolvedPercentage: !findingTotal
        ? null
        : details.length === records.length
          ? Math.round((resolvedCount / findingTotal) * 100)
          : null,
      averageScore: scoresByReviewId.size
        ? Math.round([...scoresByReviewId.values()].reduce((sum, score) => sum + score, 0) / scoresByReviewId.size)
        : 0,
      categoryHealth: Object.values(categoryScores).some((scores) => scores.length > 0)
        ? {
            security: toAverage(categoryScores.security) ?? 0,
            bugs: toAverage(categoryScores.bugs) ?? 0,
            quality: toAverage(categoryScores.quality) ?? 0,
            performance: toAverage(categoryScores.performance) ?? 0,
          }
        : null,
      scoreTrend,
      recentReviews: dashboardReviews.slice(0, 10),
      openFindings,
    },
  };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return (await getDashboardData()).metrics;
}

export async function listReviews(limit = 20): Promise<DashboardReview[]> {
  const { reviews } = await getDashboardData();
  return reviews.slice(0, limit);
}

export function useDashboardMetricsQuery(userId?: string) {
  return useQuery({
    queryKey: ["dashboard-metrics", userId ?? "anonymous"],
    queryFn: getDashboardMetrics,
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useReviewsQuery(limit = 20, userId?: string) {
  return useQuery({
    queryKey: ["reviews-list", userId ?? "anonymous", limit],
    queryFn: () => listReviews(limit),
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function normalizeSeverity(value?: string | null): Severity {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "CRITICAL") return "CRITICAL";
  if (normalized === "HIGH") return "HIGH";
  if (normalized === "MEDIUM") return "MEDIUM";
  if (normalized === "LOW") return "LOW";
  return "INFO";
}

export function normalizeConfidence(value?: number | string | null): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, Math.round(value)));
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, parsed));
  }
  return 0;
}

export function normalizeCategory(value?: string | null): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    security: "Security",
    bug: "Bugs",
    bugs: "Bugs",
    quality: "Quality",
    performance: "Performance",
  };
  return map[normalized] ?? (value ? String(value) : "General");
}

export function formatFindingFilePath(value?: string | null): string {
  if (!value) return "unknown";
  return value;
}

export function formatFindingLine(start?: number | null, end?: number | null): string {
  if (typeof start === "number" && typeof end === "number" && end > start) {
    return `${start}-${end}`;
  }
  if (typeof start === "number") return String(start);
  return "unknown";
}
