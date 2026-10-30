import { NextResponse } from "next/server";
import { restoreHistoryAction } from "@/server/actions/history-actions";

/**
 * POST /api/history/restore — urungkan hapus riwayat (selama belum dibersihkan permanen).
 * Body: { sessionIds: string[] } (1–200 id). Balasan: { restored: string[] }.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { sessionIds?: unknown } | null;
  if (!body || !Array.isArray(body.sessionIds)) {
    return NextResponse.json({ error: "Kirim { sessionIds: [...] }.", code: "invalid" }, { status: 400 });
  }
  const result = await restoreHistoryAction(body.sessionIds.map(String));
  if (result.ok) return NextResponse.json(result.data);
  const status = result.code === "unauthorized" ? 401 : result.code === "invalid" ? 400 : 500;
  return NextResponse.json({ error: result.message, code: result.code }, { status });
}
