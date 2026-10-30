import { NextResponse } from "next/server";
import { setFlagAction } from "@/server/actions/tryout-actions";

const STATUS: Record<string, number> = {
  invalid: 400,
  unauthorized: 401,
  not_found: 404,
  finished: 409,
  expired: 409,
};

/**
 * PUT /api/tryout/:sessionId/answers/:questionId/flag
 * Body: { isFlagged: boolean }
 */
export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/tryout/[sessionId]/answers/[questionId]/flag">,
) {
  const { sessionId, questionId } = await params;
  const body = (await request.json().catch(() => null)) as { isFlagged?: unknown } | null;
  if (!body || typeof body.isFlagged !== "boolean") {
    return NextResponse.json(
      { error: "Body harus { isFlagged: boolean }.", code: "invalid" },
      { status: 400 },
    );
  }
  const result = await setFlagAction({ sessionId, questionId, isFlagged: body.isFlagged });
  if (result.ok) return NextResponse.json(result.data);
  return NextResponse.json(
    { error: result.message, code: result.code },
    { status: STATUS[result.code] ?? 500 },
  );
}
