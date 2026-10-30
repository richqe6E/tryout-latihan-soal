import { NextResponse } from "next/server";
import { getSessionTimeAction } from "@/server/actions/tryout-actions";

const STATUS: Record<string, number> = { invalid: 400, unauthorized: 401, not_found: 404 };

/**
 * GET /api/tryout/:sessionId/time
 * Balasan: { status, serverNow, deadline, remainingSeconds, paused } — jam server yang berlaku.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/tryout/[sessionId]/time">) {
  const { sessionId } = await params;
  const result = await getSessionTimeAction(sessionId);
  if (result.ok) return NextResponse.json(result.data, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(
    { error: result.message, code: result.code },
    { status: STATUS[result.code] ?? 500 },
  );
}
