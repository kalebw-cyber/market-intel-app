"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  installFetchInterceptor,
  getClientLogs,
  clearClientLogs,
  exportClientLogs,
  type ClientLogEntry,
} from "../src/lib/fetchInterceptor";
import type { LogEntry, SessionStats } from "../src/lib/apiLogger";

type AnyEntry = (ClientLogEntry | LogEntry) & { _source?: "client" | "server" };
type ServiceFilter = "all" | "finnhub" | "anthropic" | "newsapi" | "internal";

const SERVICE_COLORS: Record<string, string> = {
  finnhub: "#F59E0B",
  anthropic: "#8B5CF6",
  newsapi: "#3B82F6",
  internal: "#6B7280",
};

const CACHE_COLORS: Record<string, string> = {
  HIT: "#10B981",
  MISS: "#F59E0B",
  WAIT: "#60A5FA",
  STALE: "#EF4444",
  SKIP: "#6B7280",
};

function statusColor(status: number): string {
  if (status === 0) return "#EF4444";
  if (status < 300) return "#10B981";
  if (status < 400) return "#F59E0B";
  return "#EF4444";
}

function fmtBytes(n?: number): string {
  if (!n) return "—";
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── EntryRow ──────────────────────────────────────────────────────────────
function EntryRow({ entry, onClick }: { entry: AnyEntry; onClick: () => void }) {
  const cacheStr =
    "_source" in entry && entry._source === "client"
      ? (entry as ClientLogEntry).cache
      : (() => {
          const e = entry as LogEntry;
          return e.cache?.status;
        })();

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "80px 70px 1fr 48px 60px 44px",
        gap: 6,
        alignItems: "center",
        padding: "5px 10px",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid #111827",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Service */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1,
          color: SERVICE_COLORS[entry.service] ?? "#6B7280",
          textTransform: "uppercase",
        }}
      >
        {entry.service}
      </span>

      {/* Time */}
      <span style={{ fontSize: 9, color: "#4B5563" }}>{fmtTime(entry.timestamp)}</span>

      {/* Endpoint */}
      <span
        style={{
          fontSize: 10,
          color: "#9CA3AF",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {entry.endpoint}
      </span>

      {/* Status */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: statusColor(entry.status),
          textAlign: "right",
        }}
      >
        {entry.status || "ERR"}
      </span>

      {/* Latency */}
      <span style={{ fontSize: 10, color: "#6B7280", textAlign: "right" }}>
        {entry.latency_ms}ms
      </span>

      {/* Cache */}
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          color: cacheStr ? (CACHE_COLORS[cacheStr] ?? "#6B7280") : "#374151",
          textAlign: "right",
          letterSpacing: 0.5,
        }}
      >
        {cacheStr ?? "—"}
      </span>
    </button>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────
function DetailPanel({ entry, onClose }: { entry: AnyEntry; onClose: () => void }) {
  const json = JSON.stringify(entry, null, 2);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#0A0A0F",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid #1F2937",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: "#F1F5F9", letterSpacing: 1 }}>
          {entry.requestId}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#6B7280",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: "0 2px",
          }}
        >
          ×
        </button>
      </div>
      <pre
        style={{
          flex: 1,
          overflow: "auto",
          margin: 0,
          padding: 12,
          fontSize: 10,
          color: "#9CA3AF",
          fontFamily: "monospace",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {json}
      </pre>
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────
export default function ApiLoggerWidget() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AnyEntry[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [filter, setFilter] = useState<ServiceFilter>("all");
  const [selected, setSelected] = useState<AnyEntry | null>(null);
  const [serverError, setServerError] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Install fetch interceptor once on mount
  useEffect(() => {
    installFetchInterceptor();
  }, []);

  const refresh = useCallback(async () => {
    const client = getClientLogs(200).map((e) => ({ ...e, _source: "client" as const }));

    let serverLogs: LogEntry[] = [];
    let serverStats: SessionStats | null = null;
    try {
      const res = await fetch("/api/logs?limit=200");
      if (res.ok) {
        const data = await res.json();
        serverLogs = (data.logs ?? []).map((e: LogEntry) => ({ ...e, _source: "server" }));
        serverStats = data.stats ?? null;
        setServerError(false);
      } else {
        setServerError(true);
      }
    } catch {
      setServerError(true);
    }

    // Merge and dedupe by requestId, preferring server entries
    const byId = new Map<string, AnyEntry>();
    for (const e of client) byId.set(e.requestId, e);
    for (const e of serverLogs) byId.set(e.requestId, e); // server overrides client

    const merged = [...byId.values()].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    setEntries(merged);
    setStats(serverStats);
  }, []);

  // Poll every 3s when open
  useEffect(() => {
    if (!open) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    refresh();
    pollRef.current = setInterval(refresh, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, refresh]);

  const visible = filter === "all" ? entries : entries.filter((e) => e.service === filter);
  const recent = visible.slice(-20);

  const handleExport = (fmt: "json" | "csv") => {
    const content = exportClientLogs(fmt);
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(
      content,
      `api-logs-${date}.${fmt}`,
      fmt === "csv" ? "text/csv" : "application/json"
    );
  };

  const handleClear = () => {
    clearClientLogs();
    setEntries([]);
    setStats(null);
    setSelected(null);
  };

  const triggerStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 24,
    right: 84,
    zIndex: 9990,
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#0A0A0F",
    border: "1px solid #1F2937",
    color: "#F59E0B",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
    fontFamily: "monospace",
  };

  return (
    <>
      {/* Trigger button */}
      <button
        style={triggerStyle}
        onClick={() => setOpen((p) => !p)}
        title="API Logger"
        aria-label="Toggle API Logger"
      >
        {open ? "×" : "⬡"}
        {entries.length > 0 && !open && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "#EF4444",
              color: "#fff",
              fontSize: 8,
              fontWeight: 700,
              borderRadius: 10,
              padding: "1px 4px",
              minWidth: 14,
              textAlign: "center",
            }}
          >
            {entries.length > 99 ? "99+" : entries.length}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 76,
            right: 20,
            width: 560,
            maxWidth: "calc(100vw - 40px)",
            height: 480,
            background: "#0A0A0F",
            border: "1px solid #1F2937",
            borderRadius: 8,
            boxShadow: "0 8px 40px rgba(0,0,0,0.8)",
            zIndex: 9989,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderBottom: "1px solid #1F2937",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#F1F5F9",
                letterSpacing: 2,
                textTransform: "uppercase",
                flex: 1,
              }}
            >
              API Logger
            </span>
            {serverError && (
              <span style={{ fontSize: 9, color: "#EF4444" }}>server offline</span>
            )}
            <span style={{ fontSize: 9, color: "#4B5563" }}>{entries.length} calls</span>
          </div>

          {/* Stats bar */}
          {stats && (
            <div
              style={{
                display: "flex",
                gap: 12,
                padding: "6px 12px",
                borderBottom: "1px solid #111827",
                flexShrink: 0,
                flexWrap: "wrap",
              }}
            >
              {(["finnhub", "anthropic", "newsapi"] as const).map((svc) => (
                <span key={svc} style={{ fontSize: 9, color: SERVICE_COLORS[svc] }}>
                  {svc} {stats.callsByService[svc] ?? 0}
                </span>
              ))}
              <span style={{ fontSize: 9, color: "#10B981" }}>
                cache {stats.cacheHitRate}%
              </span>
              <span style={{ fontSize: 9, color: stats.errorRate > 10 ? "#EF4444" : "#6B7280" }}>
                err {stats.errorRate}%
              </span>
              {stats.tokenUsage.total > 0 && (
                <span style={{ fontSize: 9, color: "#8B5CF6" }}>
                  tokens {stats.tokenUsage.total.toLocaleString()}
                </span>
              )}
            </div>
          )}

          {/* Filters */}
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "6px 10px",
              borderBottom: "1px solid #111827",
              flexShrink: 0,
            }}
          >
            {(["all", "finnhub", "anthropic", "newsapi", "internal"] as ServiceFilter[]).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    padding: "2px 7px",
                    borderRadius: 4,
                    border: "1px solid",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: filter === f ? (SERVICE_COLORS[f] ?? "#374151") + "22" : "transparent",
                    borderColor: filter === f ? (SERVICE_COLORS[f] ?? "#374151") : "#1F2937",
                    color: filter === f ? (SERVICE_COLORS[f] ?? "#F1F5F9") : "#4B5563",
                  }}
                >
                  {f}
                </button>
              )
            )}

            <div style={{ flex: 1 }} />

            {/* Export */}
            <button
              onClick={() => handleExport("json")}
              style={{
                fontSize: 8,
                padding: "2px 7px",
                borderRadius: 4,
                border: "1px solid #1F2937",
                background: "transparent",
                color: "#4B5563",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              JSON
            </button>
            <button
              onClick={() => handleExport("csv")}
              style={{
                fontSize: 8,
                padding: "2px 7px",
                borderRadius: 4,
                border: "1px solid #1F2937",
                background: "transparent",
                color: "#4B5563",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              CSV
            </button>
            <button
              onClick={handleClear}
              style={{
                fontSize: 8,
                padding: "2px 7px",
                borderRadius: 4,
                border: "1px solid #374151",
                background: "transparent",
                color: "#EF4444",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Clear
            </button>
          </div>

          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "80px 70px 1fr 48px 60px 44px",
              gap: 6,
              padding: "4px 10px",
              borderBottom: "1px solid #111827",
              flexShrink: 0,
            }}
          >
            {["Service", "Time", "Endpoint", "HTTP", "Latency", "Cache"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "#374151",
                  textAlign: h === "HTTP" || h === "Latency" || h === "Cache" ? "right" : "left",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Log list */}
          <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
            {recent.length === 0 ? (
              <div
                style={{
                  padding: "40px 12px",
                  textAlign: "center",
                  color: "#374151",
                  fontSize: 11,
                }}
              >
                No API calls yet. Make a request to see logs here.
              </div>
            ) : (
              recent.map((e, i) => (
                <EntryRow
                  key={`${e.requestId}-${i}`}
                  entry={e}
                  onClick={() => setSelected(e)}
                />
              ))
            )}

            {selected && (
              <DetailPanel entry={selected} onClose={() => setSelected(null)} />
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "4px 12px",
              borderTop: "1px solid #111827",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 8, color: "#374151" }}>
              Showing last {Math.min(20, visible.length)} of {visible.length}
            </span>
            {stats && (
              <span style={{ fontSize: 8, color: "#374151" }}>
                {fmtBytes(stats.totalDataBytes)} transferred
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
