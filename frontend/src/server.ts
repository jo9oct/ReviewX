import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function getBackendBaseUrl(env?: unknown): string {
  const envObj = env && typeof env === "object" ? (env as Record<string, unknown>) : {};
  const metaEnv =
    typeof import.meta !== "undefined"
      ? (import.meta.env as Record<string, string | undefined>)
      : undefined;

  const envUrl =
    (metaEnv && (metaEnv["VITE_API_BASE_URL"] || metaEnv["VITE_API_URL"] || metaEnv["BACKEND_URL"])) ||
    (typeof process !== "undefined" &&
      (process.env["VITE_API_BASE_URL"] ||
        process.env["VITE_API_URL"] ||
        process.env["BACKEND_URL"])) ||
    (typeof envObj["VITE_API_BASE_URL"] === "string" ? envObj["VITE_API_BASE_URL"] : undefined) ||
    (typeof envObj["VITE_API_URL"] === "string" ? envObj["VITE_API_URL"] : undefined) ||
    (typeof envObj["BACKEND_URL"] === "string" ? envObj["BACKEND_URL"] : undefined) ||
    "http://localhost:5000";

  return envUrl.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
}

async function forwardToBackend(request: Request, url: URL, env?: unknown): Promise<Response> {
  const backendBase = getBackendBaseUrl(env);
  const targetUrl = new URL(`${backendBase}${url.pathname}${url.search}`);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  // Tell backend to send uncompressed content to prevent double-decompression/length mismatches
  headers.delete("accept-encoding");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(120_000),
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      const buffer = await request.arrayBuffer();
      if (buffer.byteLength > 0) {
        init.body = buffer;
      }
    } catch {
      if (request.body) {
        init.body = request.body;
        // @ts-expect-error duplex required for streaming request bodies in modern fetch
        init.duplex = "half";
      }
    }
  }

  try {
    const res = await fetch(targetUrl.toString(), init);
    const responseHeaders = new Headers(res.headers);
    responseHeaders.delete("access-control-allow-origin");
    responseHeaders.delete("access-control-allow-credentials");
    responseHeaders.delete("access-control-allow-methods");
    responseHeaders.delete("access-control-allow-headers");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");

    const hasNoBody = res.status === 204 || res.status === 205 || res.status === 304;
    return new Response(hasNoBody ? null : res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: `Unable to connect to ReviewX backend at ${backendBase}: ${errorMsg}`,
        },
      }),
      {
        status: 503,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/health")) {
      return await forwardToBackend(request, url, env);
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
