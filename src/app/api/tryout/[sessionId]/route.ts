import { NextResponse } from "next/server";
import { getResumeInfo, getSessionForUser } from "@/server/tryout-repository";
import { PRIVATE_NO_STORE, requireApiUser } from "@/server/route-auth";

/**
 * GET /api/tryout/:sessionId — ambil sesi tryout untuk dikerjakan / dilanjutkan.
 * Balasan 200: sesi (soal berurutan TANPA kunci jawaban, jawaban & tanda ragu tersimpan, batas waktu)
 *   + `resume`: { orderNumber, answeredCount, flaggedCount, remainingSeconds, paused, serverNow }.
 *   Sesi yang dijeda menampilkan batas waktu seolah dilanjutkan sekarang; panggil POST …/resume
 *   saat pengguna benar-benar melanjutkan agar timer server berjalan lagi.
 * 409 `finished` bila sudah dikumpulkan (termasuk ditutup otomatis karena waktu habis) — lihat `resultUrl`.
 * 401 bila belum masuk, 404 bila sesi tidak ada / bukan milik pengguna / sudah dihapus.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/tryout/[sessionId]">) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const { sessionId } = await params;
  const session = await getSessionForUser(sessionId, user.id);
  if (!session) {
    return NextResponse.json({ error: "Sesi tryout tidak ditemukan.", code: "not_found" }, { status: 404 });
  }
  if (session.status === "selesai") {
    return NextResponse.json(
      {
        error: "Tryout ini sudah dikumpulkan.",
        code: "finished",
        resultUrl: `/tryout/${session.id}/hasil`,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ...session, resume: getResumeInfo(session) }, { headers: PRIVATE_NO_STORE });
}
