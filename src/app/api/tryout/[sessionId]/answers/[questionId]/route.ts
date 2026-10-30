import { NextResponse } from "next/server";
import { saveAnswerAction } from "@/server/actions/tryout-actions";

const STATUS: Record<string, number> = {
  invalid: 400,
  unauthorized: 401,
  not_found: 404,
  finished: 409,
  expired: 409,
};

/**
 * PUT /api/tryout/:sessionId/answers/:questionId
 * Body: { selectedOptionId: string | null, isFlagged: boolean, lastOrderNumber?: number }
 */
export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/tryout/[sessionId]/answers/[questionId]">,
) {
  const { sessionId, questionId } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body harus JSON.", code: "invalid" }, { status: 400 });
  }
  const result = await saveAnswerAction({
    sessionId,
    questionId,
    selectedOptionId: (body.selectedOptionId ?? null) as string | null,
    isFlagged: body.isFlagged === true,
    lastOrderNumber: typeof body.lastOrderNumber === "number" ? body.lastOrderNumber : undefined,
  });
  if (result.ok) return NextResponse.json(result.data);
  return NextResponse.json(
    { error: result.message, code: result.code },
    { status: STATUS[result.code] ?? 500 },
  );
}
