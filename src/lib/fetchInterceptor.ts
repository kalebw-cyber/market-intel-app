"use client";

export type ClientLogEntry = {
  requestId: string;
  timestamp: string;
  url: string;
  service: string;
  endpoint: string;
  method: string;
  status: number;
  latency_ms: number;
  size_bytes?: number;
  cache?: string;
  error?: string;
  tokens?: { input: number; output: number; total: number };
};

const LS_KEY = "marketintel_api_logs";
const MAX_LS_ENTRIES = 500;
const MAX_AGE_DAYS = 7;

function deriveService(url: string): { service: string; endpoint: string } {
  if (url.includes("/api/finnhub")) {
    const match = url.match(/endpoint=([^&]+)/);
    return { service: "finnhub", endpoint: match ? decodeURIComponent(match[1]) : "/finnhub" };
  }
  if (url.includes("/api/news")) return { service: "anthropic", endpoint: "/messages" };
  if (url.includes("/api/logs")) return { service: "internal", endpoint: "/logs" };
  if (url.includes("finnhub.io")) return { service: "finnhub", endpoint: new URL(url).pathname };
  if (url.includes("anthropic.com")) return { service: "anthropic", endpoint: new URL(url).pathname };
  if (url.includes("newsapi.org")) return { service: "newsapi", endpoint: new URL(url).pathname };
  return { service: "internal", endpoint: new URL(url, location.href).pathname };
}

function genId(): string {
  return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function loadLogs(): ClientLogEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed: ClientLogEntry[] = JSON.parse(raw);
    const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
    return parsed.filter((e) => new Date(e.timestamp).getTime() > cutoff);
  } catch {
    return [];
  }
}

function saveLogs(logs: ClientLogEntry[]): void {
  try {
    const trimmed = logs.slice(-MAX_LS_ENTRIES);
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage quota exceeded — clear and retry
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      // ignore
    }
  }
}

function appendLog(entry: ClientLogEntry): void {
  const logs = loadLogs();
  logs.push(entry);
  saveLogs(logs);
}

let installed = false;

export function installFetchInterceptor(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method?.toUpperCase() ?? "GET";
    const requestId = genId();
    const startMs = Date.now();
    const { service, endpoint } = deriveService(url);

    // Don't recurse on our own log polling endpoint
    if (endpoint === "/logs") {
      return originalFetch(input, init);
    }

    let response: Response;
    let error: string | undefined;

    try {
      response = await originalFetch(input, init);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      const entry: ClientLogEntry = {
        requestId,
        timestamp: new Date().toISOString(),
        url,
        service,
        endpoint,
        method,
        status: 0,
        latency_ms: Date.now() - startMs,
        error,
      };
      appendLog(entry);
      throw err;
    }

    const latency_ms = Date.now() - startMs;
    const cacheHeader = response.headers.get("X-MarketIntel-Cache") ?? undefined;
    const sizeHint = Number(response.headers.get("content-length") ?? 0) || undefined;
    const tokenTotal = Number(response.headers.get("X-Token-Total") ?? 0);
    const tokens = tokenTotal > 0
      ? { input: Number(response.headers.get("X-Token-Input") ?? 0), output: Number(response.headers.get("X-Token-Output") ?? 0), total: tokenTotal }
      : undefined;

    const entry: ClientLogEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      url,
      service,
      endpoint,
      method,
      status: response.status,
      latency_ms,
      size_bytes: sizeHint,
      cache: cacheHeader,
      tokens,
    };
    appendLog(entry);

    return response;
  };
}

export function getClientLogs(limit = 100): ClientLogEntry[] {
  const logs = loadLogs();
  return logs.slice(-Math.min(limit, MAX_LS_ENTRIES));
}

export function clearClientLogs(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}

export function exportClientLogs(format: "json" | "csv" = "json"): string {
  const logs = loadLogs();
  if (format === "csv") {
    const headers = "requestId,timestamp,service,endpoint,method,status,latency_ms,size_bytes,cache,error,tokens_input,tokens_output,tokens_total";
    const rows = logs.map((e) =>
      [e.requestId, e.timestamp, e.service, e.endpoint, e.method, e.status, e.latency_ms, e.size_bytes ?? "", e.cache ?? "", e.error ?? "", e.tokens?.input ?? "", e.tokens?.output ?? "", e.tokens?.total ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    return [headers, ...rows].join("\n");
  }
  return JSON.stringify(logs, null, 2);
}
