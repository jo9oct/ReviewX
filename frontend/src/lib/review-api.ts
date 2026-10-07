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
    startedAt?: string | null;
    completedAt?: string | null;
    errorCode?: string | null;
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
  score?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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

const API_BASE = ((import.meta.env as Record<string, string | undefined>)["VITE_API_BASE_URL"] ?? "http://localhost:5000/api/v1").replace(/\/$/, "");
const API_ORIGIN = API_BASE.replace(/\/api\/v1$/, "");

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isMultipart = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(!isMultipart ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
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
  const response = await fetch(`${API_ORIGIN}/health`);
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ status: string; service: string; version: string }> | null;
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

export function getGithubConnectUrl(): string {
  return `${API_BASE}/github/connect`;
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
