import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple in-memory rate limit (per IP, 15 requests / minute)
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

const SYSTEM = `You are a financial-news analyst. Analyze the article and return STRICT JSON only.
Schema: {
  "sentiment":"Bullish"|"Bearish"|"Neutral",
  "impact":"High"|"Medium"|"Low",
  "summary":"2-3 sentences explaining what happened and likely market response",
  "reasoning":"1-2 sentences justifying the sentiment + impact label",
  "affectedAssets":["TICKER1","TICKER2"]
}
Use real ticker symbols (AAPL, NVDA, BTC, etc). Return JSON ONLY, no markdown, no preamble.`;

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

  let body: { title?: string; snippet?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const { title = "", snippet = "" } = body;
  if (!title) return NextResponse.json({ error: "missing_title" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        sentiment: "Neutral",
        impact: "Medium",
        summary: "AI analysis unavailable — ANTHROPIC_API_KEY not configured.",
        reasoning: "Set the env var in Vercel project settings to enable real analysis.",
        affectedAssets: [],
      },
      { status: 200 }
    );
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Title: ${title}\n\nSnippet: ${snippet || "(no snippet)"}\n\nReturn the JSON only.`,
          },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Anthropic API error:", resp.status, errText);
      return NextResponse.json({ error: "upstream_error", status: resp.status }, { status: 502 });
    }

    const data = await resp.json();
    const text =
      data.content?.find((b: { type: string }) => b.type === "text")?.text || "";

    const cleaned = text.replace(/```json\s?|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          sentiment: "Neutral",
          impact: "Medium",
          summary: "AI returned non-JSON output.",
          reasoning: cleaned.slice(0, 200),
          affectedAssets: [],
        },
        { status: 200 }
      );
    }

    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Anthropic call failed:", msg);
    return NextResponse.json({ error: "request_failed", message: msg }, { status: 500 });
  }
}