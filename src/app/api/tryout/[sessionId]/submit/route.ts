import { NextResponse } from "next/server";
import { submitTryoutAction } from "@/server/actions/tryout-actions";

const STATUS: Record<string, number> = { invalid: 400, unauthorized: 401, not_found: 404 };

/**
 * POST /api/tryout/:sessionId/submit
 * Body: { reason: "manual" | "timeout", answers?: Record<questionId, { selectedOptionId, isFlagged }> }
 * Balasan: { score, correct, wrong, empty, total, usedSeconds, alreadySubmitted }
 */
export async function POST(request: Request, { params }: RouteContext<"/api/tryout/[sessionId]/submit">) {
  const { sessionId } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Body harus JSON.", code: "invalid" }, { status: 400 });
  const result = await submitTryoutAction({
    sessionId,
    reason: body.reason === "timeout" ? "timeout" : "manual",
    answers: body.answers as
      Record<string, { selectedOptionId: string | null; isFlagged: boolean }> | undefined,
  });
  if (result.ok) return NextResponse.json(result.data);
  return NextResponse.json(
    { error: result.message, code: result.code },
    { status: STATUS[result.code] ?? 500 },
  );
}
