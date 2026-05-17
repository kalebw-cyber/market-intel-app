import { NextResponse } from "next/server";
import { apiLogger, generateRequestId } from "../../../lib/apiLogger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory rate limit (per IP, 15 requests / minute)
const RATE = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 15;
const WINDOW_MS = 60 * 1000;

function checkRate(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = RATE.get(ip);
  if (!entry || now > entry.resetAt) {
    RATE.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: LIMIT - 1 };
  }
  if (entry.count >= LIMIT) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: LIMIT - entry.count };
}

export async function POST(req: Request) {
  const requestId = generateRequestId();
  const startMs = Date.now();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const { allowed, remaining } = checkRate(ip);
  if (!allowed) {
    apiLogger.log({
      requestId,
      service: "newsapi",
      endpoint: "/messages",
      method: "POST",
      status: 429,
      latency_ms: Date.now() - startMs,
      error: "rate_limited",
      metadata: { ip, rateLimitRemaining: 0 },
    });
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests, slow down." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    apiLogger.log({
      requestId,
      service: "newsapi",
      endpoint: "/messages",
      method: "POST",
      status: 400,
      latency_ms: Date.now() - startMs,
      error: "bad_json",
    });
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    apiLogger.log({
      requestId,
      service: "anthropic",
      endpoint: "/messages",
      method: "POST",
      status: 500,
      latency_ms: Date.now() - startMs,
      error: "no_api_key",
    });
    return NextResponse.json(
      { error: "no_api_key", message: "ANTHROPIC_API_KEY not configured in Vercel." },
      { status: 500 }
    );
  }

  // Force the model to one we know is available, regardless of what the client requested.
  // Override max_tokens to a safe cap as well.
  const payload = {
    ...body,
    model: "claude-haiku-4-5-20251001",
    max_tokens: Math.min(Number(body.max_tokens) || 1200, 1500),
  };

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("Anthropic API error:", resp.status, text);
      apiLogger.log({
        requestId,
        service: "anthropic",
        endpoint: "/messages",
        method: "POST",
        status: resp.status,
        latency_ms: Date.now() - startMs,
        error: text.slice(0, 200),
        metadata: { rateLimitRemaining: remaining },
      });
      return new NextResponse(text, {
        status: resp.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse token usage from the Anthropic response
    let tokens: { input?: number; output?: number; total?: number } | undefined;
    try {
      const parsed = JSON.parse(text) as {
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      if (parsed.usage) {
        const input = parsed.usage.input_tokens ?? 0;
        const output = parsed.usage.output_tokens ?? 0;
        tokens = { input, output, total: input + output };
      }
    } catch {
      // Non-JSON or unexpected shape — skip token tracking
    }

    apiLogger.log({
      requestId,
      service: "anthropic",
      endpoint: "/messages",
      method: "POST",
      status: 200,
      latency_ms: Date.now() - startMs,
      size_bytes: text.length,
      tokens,
      metadata: {
        model: payload.model,
        max_tokens: payload.max_tokens,
        rateLimitRemaining: remaining,
      },
    });

    // Pass the Anthropic response straight through so the frontend can parse it as-is.
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-MarketIntel-Request-Id": requestId,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Anthropic call failed:", msg);
    apiLogger.log({
      requestId,
      service: "anthropic",
      endpoint: "/messages",
      method: "POST",
      status: 500,
      latency_ms: Date.now() - startMs,
      error: msg,
    });
    return NextResponse.json(
      { error: "request_failed", message: msg },
      { status: 500 }
    );
  }
}
