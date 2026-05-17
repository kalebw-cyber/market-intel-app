import { NextRequest, NextResponse } from "next/server";
import { apiLogger } from "../../../lib/apiLogger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? "100"),
    500
  );
  const logs = apiLogger.getRecentLogs(limit);
  const stats = apiLogger.getSessionStats();
  return NextResponse.json({ logs, stats });
}
