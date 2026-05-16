import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    sentiment: "Neutral",
    impact: "Medium",
    summary: "AI analysis is stubbed in the local Codex runner. Add your API proxy logic here to enable live analysis.",
    reasoning: "The UI is running locally without an Anthropic API key or production proxy configuration.",
    affectedAssets: []
  });
}
