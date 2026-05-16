import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory rate limit (per IP, 15 requests / minute)
const RATE = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 15;
const WINDOW_MS = 60 * 1000;

function checkRate(ip: string) {
  const now = Date.now();
  const entry = RATE.get(ip);
  if (!entry || now > entry.resetAt) {
    RATE.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests, slow down." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
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
      return new NextResponse(text, {
        status: resp.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Pass the Anthropic response straight through so the frontend can parse it as-is.
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Anthropic call failed:", msg);
    return NextResponse.json(
      { error: "request_failed", message: msg },
      { status: 500 }
    );
  }
}