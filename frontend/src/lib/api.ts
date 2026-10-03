import { useMutation, useQuery } from "@tanstack/react-query";

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
  status: "pending" | "parsing" | "analyzing" | "completed" | "failed";
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

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("reviewx_token") || sessionStorage.getItem("reviewx_token");
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("reviewx_token", token);
  } else {
    localStorage.removeItem("reviewx_token");
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

export async function submitReview(input: SubmitReviewInput): Promise<ReviewResult> {
  return request<ReviewResult>("/api/reviews", {
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
    onProgress?: (status: string, attempt: number) => void;
  } = {}
): Promise<ReviewResult> {
  const { intervalMs = 1000, maxAttempts = 30, onProgress } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await getReview(reviewId);
    if (onProgress) {
      onProgress(result.status, attempt);
    }
    if (result.status === "completed" || result.status === "failed") {
      return result;
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
  const res = await request<{ user: AuthUser }>("/api/auth/me", {
    method: "GET",
  });
  return res.user;
}

// ── TanStack Query Hooks ───────────────────────────────────────────────────

export function useSubmitReviewMutation() {
  return useMutation({
    mutationFn: (input: SubmitReviewInput) => submitReview(input),
  });
}

export function useReviewQuery(reviewId: string | null | undefined) {
  return useQuery({
    queryKey: ["review", reviewId],
    queryFn: () => (reviewId ? getReview(reviewId) : null),
    enabled: Boolean(reviewId),
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
