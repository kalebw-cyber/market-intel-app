import { NextRequest, NextResponse } from "next/server";
import { FINNHUB_KEY } from "../../../config/api";

type CacheEntry = {
  data: unknown;
  expiry: number;
  savedAt: number;
};

type CacheStore = {
  cache: Map<string, CacheEntry>;
  pending: Map<string, Promise<unknown>>;
};

const globalStore = globalThis as typeof globalThis & {
  __marketIntelFinnhubCache?: CacheStore;
};

const store =
  globalStore.__marketIntelFinnhubCache ??
  (globalStore.__marketIntelFinnhubCache = {
    cache: new Map<string, CacheEntry>(),
    pending: new Map<string, Promise<unknown>>(),
  });

const ENDPOINT_TTL: Record<string, number> = {
  "/quote": 45_000,
  "/stock/candle": 30 * 60_000,
  "/search": 24 * 60 * 60_000,
  "/stock/profile2": 24 * 60 * 60_000,
  "/news": 5 * 60_000,
  "/company-news": 10 * 60_000,
  "/calendar/earnings": 6 * 60 * 60_000,
  "/calendar/economic": 6 * 60 * 60_000,
  "/stock/insider-transactions": 15 * 60_000,
};

function endpointTtl(endpoint: string) {
  return ENDPOINT_TTL[endpoint] ?? 60_000;
}

function buildFinnhubUrl(endpoint: string, searchParams: URLSearchParams) {
  if (!Object.prototype.hasOwnProperty.call(ENDPOINT_TTL, endpoint)) {
    throw new Error("Unsupported Finnhub endpoint");
  }

  const params = new URLSearchParams(searchParams);
  params.delete("endpoint");
  params.delete("ttl");
  params.set("token", FINNHUB_KEY);

  return `https://finnhub.io/api/v1${endpoint}?${params.toString()}`;
}

export async function GET(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get("endpoint") || "";
  // Finnhub moved /stock/candle to a paid tier — short-circuit with empty payload.
  if (endpoint === "/stock/candle") {
    return NextResponse.json(
      { s: "no_data", c: [], h: [], l: [], o: [], t: [], v: [] },
      {
        headers: {
          "X-MarketIntel-Cache": "SKIP",
          "X-MarketIntel-Skip-Reason": "premium-tier-only",
        },
      }
    );
  }
  const ttl = endpointTtl(endpoint);
  const cacheKey = `${endpoint}?${new URLSearchParams(
    [...req.nextUrl.searchParams.entries()]
      .filter(([key]) => key !== "ttl")
      .sort(([a], [b]) => a.localeCompare(b))
  ).toString()}`;
  const now = Date.now();
  const cached = store.cache.get(cacheKey);

  if (cached && cached.expiry > now) {
    return NextResponse.json(cached.data, {
      headers: {
        "X-MarketIntel-Cache": "HIT",
        "X-MarketIntel-Cache-Age": String(Math.floor((now - cached.savedAt) / 1000)),
        "X-MarketIntel-Cache-TTL": String(Math.floor(ttl / 1000)),
      },
    });
  }

  if (store.pending.has(cacheKey)) {
    const data = await store.pending.get(cacheKey)!;
    return NextResponse.json(data, {
      headers: {
        "X-MarketIntel-Cache": "WAIT",
        "X-MarketIntel-Cache-TTL": String(Math.floor(ttl / 1000)),
      },
    });
  }

  let url: string;
  try {
    url = buildFinnhubUrl(endpoint, req.nextUrl.searchParams);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid Finnhub request" },
      { status: 400 }
    );
  }

  const requestPromise = fetch(url, { cache: "no-store" }).then(async (res) => {
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      throw new Error(`Finnhub ${res.status}: ${text.slice(0, 160)}`);
    }

    store.cache.set(cacheKey, {
      data,
      expiry: Date.now() + ttl,
      savedAt: Date.now(),
    });
    return data;
  });

  store.pending.set(cacheKey, requestPromise);

  try {
    const data = await requestPromise;
    return NextResponse.json(data, {
      headers: {
        "X-MarketIntel-Cache": "MISS",
        "X-MarketIntel-Cache-TTL": String(Math.floor(ttl / 1000)),
      },
    });
  } catch (err) {
    if (cached) {
      return NextResponse.json(cached.data, {
        headers: {
          "X-MarketIntel-Cache": "STALE",
          "X-MarketIntel-Cache-TTL": String(Math.floor(ttl / 1000)),
        },
      });
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Finnhub request failed" },
      { status: 502 }
    );
  } finally {
    store.pending.delete(cacheKey);
  }
}
