/// <reference types="node" />

export type ApiService = "finnhub" | "newsapi" | "anthropic" | "internal";

export type CacheStatus = "HIT" | "MISS" | "WAIT" | "STALE" | "SKIP";

export interface LogEntry {
  requestId: string;
  timestamp: string;
  service: ApiService;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  status: number;
  latency_ms: number;
  cache?: {
    hit: boolean;
    status: CacheStatus;
    ttl_remaining_ms?: number;
  };
  size_bytes?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  tokens?: {
    input?: number;
    output?: number;
    total?: number;
  };
}

export interface SessionStats {
  totalCalls: number;
  callsByService: Record<ApiService, number>;
  avgLatency: Record<ApiService, number>;
  cacheHitRate: number;
  errorRate: number;
  totalDataBytes: number;
  tokenUsage: { input: number; output: number; total: number };
}

const RING_BUFFER_SIZE = 500;
const BATCH_FLUSH_MS = 2000;

const nodeProcess = (globalThis as any).process as {
  env?: Record<string, string | undefined>;
  cwd?: () => string;
} | undefined;

const SENSITIVE_KEY_RE = /token|key|secret|password|auth/i;

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEY_RE.test(k)) {
      out[k] = "[REDACTED]";
    } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = sanitize(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ── Server-side shared state (survives hot-reload in dev) ──────────────────
type GlobalStore = typeof globalThis & {
  __apiLogBuffer?: LogEntry[];
  __apiLogPending?: LogEntry[];
  __apiLogFlushTimer?: ReturnType<typeof setTimeout> | null;
};

const g = globalThis as GlobalStore;
const getBuffer = (): LogEntry[] => (g.__apiLogBuffer ??= []);
const getPending = (): LogEntry[] => (g.__apiLogPending ??= []);

function pushEntry(entry: LogEntry): void {
  const buf = getBuffer();
  buf.push(entry);
  if (buf.length > RING_BUFFER_SIZE) buf.shift();
}

async function flushToFile(): Promise<void> {
  const pending = getPending();
  if (pending.length === 0) return;
  const batch = pending.splice(0);
  try {
    const { appendFile, mkdir } = await import("node:fs/promises");
    const cwd = nodeProcess?.cwd?.() ?? ".";
    const dir = `${cwd}/logs`;
    await mkdir(dir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const file = `${dir}/api-${date}.log`;
    await appendFile(file, batch.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf-8");
  } catch {
    // Re-queue on failure so we don't silently drop
    pending.unshift(...batch);
  }
}

function scheduleFlush(): void {
  if (g.__apiLogFlushTimer) return;
  g.__apiLogFlushTimer = setTimeout(() => {
    g.__apiLogFlushTimer = null;
    flushToFile().catch(() => {});
  }, BATCH_FLUSH_MS);
}

// ── Public API ─────────────────────────────────────────────────────────────

export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }
  return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const apiLogger = {
  log(entry: Omit<LogEntry, "timestamp"> & { timestamp?: string }): LogEntry {
    const full: LogEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };
    if (full.metadata) {
      full.metadata = sanitize(full.metadata as Record<string, unknown>);
    }

    pushEntry(full);

    // File logging is server-only
    if (typeof window === "undefined" && nodeProcess?.env?.API_LOGGING_ENABLED !== "false") {
      getPending().push(full);
      scheduleFlush();
    }

    if (nodeProcess?.env?.NODE_ENV === "development" || nodeProcess?.env?.API_LOGGING_LEVEL === "debug") {
      const cacheTag = full.cache ? ` [${full.cache.status}]` : "";
      const errTag = full.error ? ` ERR:${full.error.slice(0, 60)}` : "";
      console.log(`[API] ${full.service} ${full.endpoint} ${full.status} ${full.latency_ms}ms${cacheTag}${errTag}`);
    }

    return full;
  },

  getRecentLogs(limit = 100): LogEntry[] {
    const buf = getBuffer();
    return buf.slice(-Math.min(limit, RING_BUFFER_SIZE));
  },

  getSessionStats(): SessionStats {
    const buf = getBuffer();
    const stats: SessionStats = {
      totalCalls: buf.length,
      callsByService: { finnhub: 0, newsapi: 0, anthropic: 0, internal: 0 },
      avgLatency: { finnhub: 0, newsapi: 0, anthropic: 0, internal: 0 },
      cacheHitRate: 0,
      errorRate: 0,
      totalDataBytes: 0,
      tokenUsage: { input: 0, output: 0, total: 0 },
    };

    if (buf.length === 0) return stats;

    const latSum: Record<string, number> = { finnhub: 0, newsapi: 0, anthropic: 0, internal: 0 };
    let cacheableCount = 0;
    let cacheHits = 0;
    let errors = 0;

    for (const e of buf) {
      stats.callsByService[e.service] = (stats.callsByService[e.service] ?? 0) + 1;
      latSum[e.service] = (latSum[e.service] ?? 0) + e.latency_ms;
      if (e.size_bytes) stats.totalDataBytes += e.size_bytes;
      if (e.cache) {
        cacheableCount++;
        if (e.cache.hit) cacheHits++;
      }
      if (e.status >= 400 || e.error) errors++;
      if (e.tokens) {
        stats.tokenUsage.input += e.tokens.input ?? 0;
        stats.tokenUsage.output += e.tokens.output ?? 0;
        stats.tokenUsage.total += e.tokens.total ?? 0;
      }
    }

    for (const svc of Object.keys(latSum) as ApiService[]) {
      const count = stats.callsByService[svc] ?? 0;
      stats.avgLatency[svc] = count > 0 ? Math.round(latSum[svc] / count) : 0;
    }

    stats.cacheHitRate = cacheableCount > 0 ? Math.round((cacheHits / cacheableCount) * 100) : 0;
    stats.errorRate = Math.round((errors / buf.length) * 100);

    return stats;
  },
};
