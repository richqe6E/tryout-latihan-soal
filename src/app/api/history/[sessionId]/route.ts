import { NextResponse } from "next/server";
import { deleteHistoryAction } from "@/server/actions/history-actions";
import { getResultLookupForUser } from "@/server/tryout-repository";
import { PRIVATE_NO_STORE, requireApiUser } from "@/server/route-auth";

/**
 * GET /api/history/:sessionId — detail hasil satu tryout selesai dari riwayat latihan.
 * Balasan 200 sama dengan GET /api/tryout/:sessionId/result: metadata pilihan, nilai,
 *   benar/salah/kosong, akurasi, lama pengerjaan, status per soal, dan riwayat nilai pembanding.
 * 409 `not_finished` bila tryout belum selesai — disertai { lastOrderNumber, remainingSeconds, paused,
 *   resumeUrl } untuk melanjutkannya. 404 bila tidak ada, bukan milik pengguna, atau sudah dihapus.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/history/[sessionId]">) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const { sessionId } = await params;
  const lookup = await getResultLookupForUser(sessionId, user.id);
  if (lookup.status === "not_found") {
    return NextResponse.json(
      { error: "Riwayat tryout tidak ditemukan.", code: "not_found" },
      { status: 404 },
    );
  }
  if (lookup.status === "not_finished") {
    const { lastOrderNumber, remainingSeconds, paused } = lookup;
    return NextResponse.json(
      {
        error: "Tryout ini belum selesai, jadi hasilnya belum ada.",
        code: "not_finished",
        lastOrderNumber,
        remainingSeconds,
        paused,
        resumeUrl: `/tryout/${sessionId}`,
      },
      { status: 409 },
    );
  }
  return NextResponse.json(lookup.result, { headers: PRIVATE_NO_STORE });
}

/**
 * DELETE /api/history/:sessionId — hapus satu riwayat tryout (berjalan maupun selesai).
 * Riwayat disembunyikan dan bisa dipulihkan lewat POST /api/history/restore selama 30 hari,
 * setelah itu dibersihkan permanen. Balasan: { deleted: [sessionId] }.
 * 404 bila tidak ada, bukan milik pengguna, atau sudah dihapus.
 */
export async function DELETE(_request: Request, { params }: RouteContext<"/api/history/[sessionId]">) {
  const { sessionId } = await params;
  const result = await deleteHistoryAction([sessionId]);
  if (!result.ok) {
    const status = result.code === "unauthorized" ? 401 : result.code === "invalid" ? 404 : 500;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }
  if (result.data.deleted.length === 0) {
    return NextResponse.json(
      { error: "Riwayat tryout tidak ditemukan.", code: "not_found" },
      { status: 404 },
    );
  }
  return NextResponse.json(result.data);
}
