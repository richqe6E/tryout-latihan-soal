import { NextResponse } from "next/server";
import { pauseTryoutAction } from "@/server/actions/tryout-actions";

const STATUS: Record<string, number> = { invalid: 400, unauthorized: 401, not_found: 404, finished: 409 };

/**
 * POST /api/tryout/:sessionId/pause — "Simpan & keluar": hentikan timer sesi yang berjalan.
 * Body (opsional): { lastOrderNumber?, answers?: Record<questionId, { selectedOptionId, isFlagged }> }
 * Balasan: { status: "dijeda", remainingSeconds, lastOrderNumber } — atau { status: "selesai" } bila
 * waktunya ternyata sudah habis dan sesi dikumpulkan otomatis. 409 bila sudah dikumpulkan.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/tryout/[sessionId]/pause">) {
  const { sessionId } = await params;
  const raw = await request.text();
  let body: Record<string, unknown> = {};
  if (raw.trim()) {
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Body harus JSON.", code: "invalid" }, { status: 400 });
    }
  }
  const result = await pauseTryoutAction({
    sessionId,
    lastOrderNumber: body.lastOrderNumber === undefined ? undefined : Number(body.lastOrderNumber),
    answers: body.answers as
      Record<string, { selectedOptionId: string | null; isFlagged: boolean }> | undefined,
  });
  if (result.ok) return NextResponse.json(result.data);
  return NextResponse.json(
    { error: result.message, code: result.code },
    { status: STATUS[result.code] ?? 500 },
  );
}
