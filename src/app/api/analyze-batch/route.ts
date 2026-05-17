import { NextResponse } from "next/server";
import { apiLogger, generateRequestId } from "../../../lib/apiLogger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are an institutional market analyst. Do not react emotionally to headlines. Separate temporary market fear from actual company weakness. Consider market regime, macro events, sector rotation, price action, momentum, volatility, support/resistance, volume implications, and long-term asset strength. Negative news alone must not create a SELL unless it points to asset-specific fundamental deterioration. Strong assets falling with the market may be HOLD or BUY.

You will receive a numbered list of financial news articles. Analyze each one and return a JSON array with exactly one object per article, in the same order.

Each object must match this schema exactly:
{"summary":"2-3 sentence institutional analysis","sentiment":"Bullish or Bearish or Neutral","reasoning":"explain whether move is company weakness, macro fear, sector rotation, broad crash, or temporary volatility","affectedAssets":["SYMBOL1","SYMBOL2"],"marketContext":"Bull Market/Bear Market/Sideways Market/Panic Selloff/Recovery Rally","confidence":"High/Medium/Low","risk":"Low/Medium/High"}

Respond with ONLY the JSON array. No markdown, no explanation, no surrounding text.`;

interface ArticleInput {
  title: string;
  snippet?: string;
  duplicateCount?: number;
  duplicateSources?: string[];
}

export async function POST(req: Request) {
  const requestId = generateRequestId();
  const startMs = Date.now();

  let body: { articles?: ArticleInput[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const articles = body.articles ?? [];
  if (articles.length === 0) {
    return NextResponse.json({ analyses: [] });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "no_api_key", message: "ANTHROPIC_API_KEY not configured." }, { status: 500 });
  }

  const userContent = articles
    .map(
      (a, i) =>
        `[${i + 1}] Title: ${a.title}\nSnippet: ${a.snippet || "No snippet available."}\nSources: ${(a.duplicateSources ?? []).filter(Boolean).join(", ") || "Unknown"}\nCoverage count: ${a.duplicateCount ?? 1}`
    )
    .join("\n\n");

  // ~200 output tokens per analysis object + overhead
  const maxTokens = Math.min(400 + articles.length * 220, 8000);

  const payload = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyze these ${articles.length} financial news articles. Return a JSON array with exactly ${articles.length} objects in the same order.\n\n${userContent}`,
      },
    ],
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
      console.error("Anthropic batch error:", resp.status, text);
      apiLogger.log({
        requestId,
        service: "anthropic",
        endpoint: "/messages/batch",
        method: "POST",
        status: resp.status,
        latency_ms: Date.now() - startMs,
        error: text.slice(0, 200),
        metadata: { batchSize: articles.length },
      });
      return new NextResponse(text, {
        status: resp.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const anthropicResp = JSON.parse(text) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const raw = anthropicResp.content?.find((b) => b.type === "text")?.text ?? "[]";
    const cleaned = raw.replace(/```json\s?|```/g, "").trim();

    let analyses: unknown[];
    try {
      const parsed = JSON.parse(cleaned);
      analyses = Array.isArray(parsed) ? parsed : [];
    } catch {
      console.error("Batch parse failed:", cleaned.slice(0, 300));
      return NextResponse.json(
        { error: "parse_failed", message: "Claude returned unexpected format", raw: cleaned.slice(0, 400) },
        { status: 500 }
      );
    }

    const inp = anthropicResp.usage?.input_tokens ?? 0;
    const out = anthropicResp.usage?.output_tokens ?? 0;
    apiLogger.log({
      requestId,
      service: "anthropic",
      endpoint: "/messages/batch",
      method: "POST",
      status: 200,
      latency_ms: Date.now() - startMs,
      size_bytes: text.length,
      tokens: { input: inp, output: out, total: inp + out },
      metadata: { batchSize: articles.length, model: payload.model, maxTokens },
    });

    return NextResponse.json(
      { analyses },
      { headers: { "X-MarketIntel-Request-Id": requestId } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Anthropic batch call failed:", msg);
    apiLogger.log({
      requestId,
      service: "anthropic",
      endpoint: "/messages/batch",
      method: "POST",
      status: 500,
      latency_ms: Date.now() - startMs,
      error: msg,
      metadata: { batchSize: articles.length },
    });
    return NextResponse.json({ error: "request_failed", message: msg }, { status: 500 });
  }
}
