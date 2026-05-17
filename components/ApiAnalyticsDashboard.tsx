"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { LogEntry, SessionStats } from "../src/lib/apiLogger";

type LatencyBucket = { label: string; finnhub: number; anthropic: number; newsapi: number };

const SERVICE_COLORS: Record<string, string> = {
  finnhub: "#F59E0B",
  anthropic: "#8B5CF6",
  newsapi: "#3B82F6",
  internal: "#6B7280",
};

function fmtBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

function StatCard({
  label,
  value,
  sub,
  color = "#F1F5F9",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "#0D1117",
        border: "1px solid #1F2937",
        borderRadius: 8,
        padding: "12px 16px",
        minWidth: 120,
        flex: 1,
      }}
    >
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: "#4B5563", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9, color: "#374151", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 9, color: "#6B7280", width: 68, textAlign: "right", flexShrink: 0 }}>
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "#111827",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 9, color: "#9CA3AF", width: 36, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

// Simple sparkline using an SVG polyline
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <span style={{ fontSize: 9, color: "#374151" }}>no data</span>;
  const h = 32;
  const w = 120;
  const max = Math.max(...data, 1);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (v / max) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function AlertBanner({ message, color }: { message: string; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: `${color}14`,
        border: `1px solid ${color}40`,
        borderRadius: 6,
        marginBottom: 8,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 3, background: color, flexShrink: 0, display: "inline-block" }} />
      <span style={{ fontSize: 10, color }}>{message}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ApiAnalyticsDashboard({ onClose }: { onClose?: () => void }) {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<LatencyBucket[]>([]);
  const [alerts, setAlerts] = useState<{ id: number; message: string; color: string }[]>([]);
  const alertIdRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addAlert = useCallback((message: string, color: string) => {
    const id = ++alertIdRef.current;
    setAlerts((prev) => [...prev.slice(-4), { id, message, color }]);
    setTimeout(() => setAlerts((prev) => prev.filter((a) => a.id !== id)), 8000);
  }, []);

  const prevStatsRef = useRef<SessionStats | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/logs?limit=500");
      if (!res.ok) return;
      const data = await res.json();
      const newStats: SessionStats = data.stats;
      const newLogs: LogEntry[] = data.logs ?? [];

      setStats(newStats);
      setLogs(newLogs);

      // Build latency history (last 10 poll ticks — append one bucket per refresh)
      if (newStats) {
        setLatencyHistory((prev) => {
          const bucket: LatencyBucket = {
            label: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            finnhub: newStats.avgLatency.finnhub,
            anthropic: newStats.avgLatency.anthropic,
            newsapi: newStats.avgLatency.newsapi,
          };
          return [...prev.slice(-19), bucket];
        });
      }

      // Alert checks
      const prev = prevStatsRef.current;
      if (newStats) {
        if (newStats.avgLatency.finnhub > 5000)
          addAlert(`Finnhub avg latency is high: ${newStats.avgLatency.finnhub}ms`, "#EF4444");
        if (newStats.avgLatency.anthropic > 10000)
          addAlert(`Anthropic avg latency is high: ${newStats.avgLatency.anthropic}ms`, "#EF4444");
        if (newStats.errorRate > 20)
          addAlert(`Error rate spike: ${newStats.errorRate}% of calls are failing`, "#EF4444");
        if (newStats.cacheHitRate < 10 && newStats.totalCalls > 20)
          addAlert(`Low Finnhub cache hit rate: ${newStats.cacheHitRate}%`, "#F59E0B");

        // Detect error spike (delta)
        if (prev) {
          const prevErrors = Math.round((prev.errorRate / 100) * prev.totalCalls);
          const currErrors = Math.round((newStats.errorRate / 100) * newStats.totalCalls);
          if (currErrors - prevErrors >= 3)
            addAlert(`${currErrors - prevErrors} new errors since last check`, "#F59E0B");
        }
      }

      prevStatsRef.current = newStats;
    } catch {
      // server not available
    }
  }, [addAlert]);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh]);

  // Recent errors
  const recentErrors = logs.filter((e) => e.status >= 400 || e.error).slice(-5).reverse();

  // Peak latency entries
  const slowest = [...logs].sort((a, b) => b.latency_ms - a.latency_ms).slice(0, 5);

  const totalCalls = stats?.totalCalls ?? 0;
  const maxSvcCount = stats
    ? Math.max(...Object.values(stats.callsByService))
    : 1;

  return (
    <div
      style={{
        background: "#080810",
        border: "1px solid #1F2937",
        borderRadius: 10,
        padding: 20,
        color: "#F1F5F9",
        fontFamily: "inherit",
        maxWidth: 760,
        width: "100%",
      }}
    >
      {/* Title bar */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", flex: 1 }}>
          API Analytics
        </span>
        <span style={{ fontSize: 9, color: "#374151" }}>auto-refresh 5s</span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#6B7280",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: "0 4px",
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Alerts */}
      {alerts.map((a) => (
        <AlertBanner key={a.id} message={a.message} color={a.color} />
      ))}

      {/* Top stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <StatCard label="Total Calls" value={totalCalls} color="#F1F5F9" />
        <StatCard
          label="Cache Hit Rate"
          value={`${stats?.cacheHitRate ?? 0}%`}
          color="#10B981"
          sub="Finnhub in-memory cache"
        />
        <StatCard
          label="Error Rate"
          value={`${stats?.errorRate ?? 0}%`}
          color={stats && stats.errorRate > 10 ? "#EF4444" : "#10B981"}
        />
        <StatCard
          label="Data Transferred"
          value={stats ? fmtBytes(stats.totalDataBytes) : "0B"}
          color="#60A5FA"
        />
        {(stats?.tokenUsage.total ?? 0) > 0 && (
          <StatCard
            label="Tokens Used"
            value={(stats?.tokenUsage.total ?? 0).toLocaleString()}
            sub={`in ${stats?.tokenUsage.input ?? 0} / out ${stats?.tokenUsage.output ?? 0}`}
            color="#8B5CF6"
          />
        )}
      </div>

      {/* Body: calls by service + latency trend */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {/* Calls by service */}
        <div
          style={{
            background: "#0D1117",
            border: "1px solid #1F2937",
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#4B5563", textTransform: "uppercase", marginBottom: 10 }}>
            Calls by Service
          </div>
          {(["finnhub", "anthropic", "newsapi", "internal"] as const).map((svc) => (
            <MiniBar
              key={svc}
              label={svc}
              value={stats?.callsByService[svc] ?? 0}
              max={maxSvcCount}
              color={SERVICE_COLORS[svc]}
            />
          ))}
        </div>

        {/* Avg latency sparklines */}
        <div
          style={{
            background: "#0D1117",
            border: "1px solid #1F2937",
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#4B5563", textTransform: "uppercase", marginBottom: 10 }}>
            Avg Latency Trend
          </div>
          {(["finnhub", "anthropic", "newsapi"] as const).map((svc) => (
            <div key={svc} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 9, color: SERVICE_COLORS[svc], width: 60, flexShrink: 0 }}>{svc}</span>
              <Sparkline
                data={latencyHistory.map((b) => b[svc])}
                color={SERVICE_COLORS[svc]}
              />
              <span style={{ fontSize: 9, color: "#6B7280", marginLeft: 4, fontVariantNumeric: "tabular-nums" }}>
                {stats?.avgLatency[svc] ?? 0}ms
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Slowest calls + recent errors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Slowest */}
        <div
          style={{
            background: "#0D1117",
            border: "1px solid #1F2937",
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#4B5563", textTransform: "uppercase", marginBottom: 10 }}>
            Slowest Calls
          </div>
          {slowest.length === 0 && (
            <span style={{ fontSize: 10, color: "#374151" }}>No data yet</span>
          )}
          {slowest.map((e, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: SERVICE_COLORS[e.service],
                  flexShrink: 0,
                  width: 64,
                }}
              >
                {e.service}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: "#9CA3AF",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {e.endpoint}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: e.latency_ms > 5000 ? "#EF4444" : "#F59E0B",
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {e.latency_ms}ms
              </span>
            </div>
          ))}
        </div>

        {/* Recent errors */}
        <div
          style={{
            background: "#0D1117",
            border: "1px solid #1F2937",
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#4B5563", textTransform: "uppercase", marginBottom: 10 }}>
            Recent Errors
          </div>
          {recentErrors.length === 0 && (
            <span style={{ fontSize: 10, color: "#10B981" }}>No errors — all clear</span>
          )}
          {recentErrors.map((e, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 9, color: SERVICE_COLORS[e.service] }}>{e.service}</span>
                <span style={{ fontSize: 9, color: "#EF4444", fontWeight: 700 }}>{e.status || "ERR"}</span>
                <span
                  style={{
                    fontSize: 9,
                    color: "#9CA3AF",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.endpoint}
                </span>
              </div>
              {e.error && (
                <div
                  style={{
                    fontSize: 9,
                    color: "#6B7280",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.error.slice(0, 60)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
