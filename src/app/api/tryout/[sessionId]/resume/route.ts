import { NextResponse } from "next/server";
import { resumeTryoutAction } from "@/server/actions/tryout-actions";

const STATUS: Record<string, number> = {
  invalid: 400,
  unauthorized: 401,
  not_found: 404,
  finished: 409,
  expired: 409,
};

/**
 * POST /api/tryout/:sessionId/resume — lanjutkan sesi yang dijeda.
 * Balasan: { deadline, remainingSeconds, serverNow } — batas waktu baru = sekarang + sisa waktu saat dijeda.
 * Idempoten untuk sesi yang sedang berjalan. 409 bila sudah dikumpulkan atau waktunya habis.
 */
export async function POST(_request: Request, { params }: RouteContext<"/api/tryout/[sessionId]/resume">) {
  const { sessionId } = await params;
  const result = await resumeTryoutAction(sessionId);
  if (result.ok) return NextResponse.json(result.data);
  return NextResponse.json(
    { error: result.message, code: result.code },
    { status: STATUS[result.code] ?? 500 },
  );
}
