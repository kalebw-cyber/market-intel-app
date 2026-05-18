import { NextRequest, NextResponse } from "next/server";
import { apiLogger, generateRequestId } from "../../../lib/apiLogger";

type Candle = { close: number; high: number; low: number; volume: number };
type CacheEntry = { data: Candle[]; expiry: number; savedAt: number };

const globalStore = globalThis as typeof globalThis & {
  __marketIntelYahooCandleCache?: Map<string, CacheEntry>;
};

const store =
  globalStore.__marketIntelYahooCandleCache ??
  (globalStore.__marketIntelYahooCandleCache = new Map<string, CacheEntry>());

const TTL = 4 * 60 * 60_000; // 4 hours — daily candles don't need fresher data

function mapYahooResponse(raw: unknown): Candle[] {
  try {
    const result = (raw as any)?.chart?.result?.[0];
    const quotes = result?.indicators?.quote?.[0];
    const timestamps: number[] = result?.timestamp;
    if (!quotes || !Array.isArray(timestamps)) return [];

    return timestamps
      .map((_t, i) => ({
        close: Number(quotes.close?.[i]) || 0,
        high: Number(quotes.high?.[i]) || 0,
        low: Number(quotes.low?.[i]) || 0,
        volume: Number(quotes.volume?.[i]) || 0,
      }))
      .filter((c) => c.close > 0);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const startMs = Date.now();
  const symbol = req.nextUrl.searchParams.get("symbol") || "";

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const cacheKey = symbol.toUpperCase();
  const now = Date.now();
  const cached = store.get(cacheKey);

  if (cached && cached.expiry > now) {
    apiLogger.log({
      requestId,
      service: "yahoo",
      endpoint: "/yahoo-candle",
      method: "GET",
      status: 200,
      latency_ms: Date.now() - startMs,
      cache: { hit: true, status: "HIT" },
      metadata: { symbol, candleCount: cached.data.length },
    });
    return NextResponse.json(cached.data, {
      headers: {
        "X-MarketIntel-Cache": "HIT",
        "X-MarketIntel-Cache-Age": String(Math.floor((now - cached.savedAt) / 1000)),
        "X-MarketIntel-Request-Id": requestId,
      },
    });
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo&includePrePost=false`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarketIntel/1.0)",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      apiLogger.log({
        requestId,
        service: "yahoo",
        endpoint: "/yahoo-candle",
        method: "GET",
        status: res.status,
        latency_ms: Date.now() - startMs,
        error: text.slice(0, 160),
        metadata: { symbol },
      });
      return NextResponse.json(
        { error: `Yahoo Finance ${res.status}` },
        { status: 502, headers: { "X-MarketIntel-Request-Id": requestId } }
      );
    }

    const raw = await res.json();
    const candles = mapYahooResponse(raw);

    if (candles.length >= 20) {
      store.set(cacheKey, { data: candles, expiry: now + TTL, savedAt: now });
    }

    apiLogger.log({
      requestId,
      service: "yahoo",
      endpoint: "/yahoo-candle",
      method: "GET",
      status: 200,
      latency_ms: Date.now() - startMs,
      cache: { hit: false, status: "MISS" },
      size_bytes: JSON.stringify(candles).length,
      metadata: { symbol, candleCount: candles.length },
    });

    return NextResponse.json(candles, {
      headers: {
        "X-MarketIntel-Cache": "MISS",
        "X-MarketIntel-Cache-TTL": String(Math.floor(TTL / 1000)),
        "X-MarketIntel-Request-Id": requestId,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yahoo Finance request failed";
    apiLogger.log({
      requestId,
      service: "yahoo",
      endpoint: "/yahoo-candle",
      method: "GET",
      status: 502,
      latency_ms: Date.now() - startMs,
      error: msg,
      metadata: { symbol },
    });
    return NextResponse.json(
      { error: msg },
      { status: 502, headers: { "X-MarketIntel-Request-Id": requestId } }
    );
  }
}
