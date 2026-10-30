import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { deleteAllFinishedHistoryAction, deleteHistoryAction } from "@/server/actions/history-actions";
import { getPracticeHistoryForUser } from "@/server/tryout-repository";
import { PRIVATE_NO_STORE, requireApiUser } from "@/server/route-auth";

const querySchema = z.object({
  status: z.enum(["berjalan", "selesai"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  before: z.iso.datetime({ offset: true }).optional(),
});

/**
 * GET /api/history — riwayat latihan pengguna yang sedang masuk.
 * Query: `status` (berjalan | selesai; bawaan keduanya), `limit` (sesi selesai per halaman, 1–100,
 *   bawaan 50), `before` (kursor ISO dari `nextCursor`).
 * Balasan: { items: PracticeHistoryItem[], nextCursor: string | null, now: number }
 *   Sesi berjalan selalu di depan (beserta `answeredCount`, `remainingSeconds`, `paused`,
 *   `lastOrderNumber` untuk dilanjutkan), lalu sesi selesai terbaru dulu (nilai, benar, lama pengerjaan).
 *   Sesi yang dihapus pengguna tidak ikut.
 */
export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Parameter riwayat tidak valid.", code: "invalid" }, { status: 400 });
  }
  const { status, limit, before } = parsed.data;
  const page = await getPracticeHistoryForUser(user.id, {
    status,
    limit,
    before: before ? new Date(before) : undefined,
  });
  return NextResponse.json(page, { headers: PRIVATE_NO_STORE });
}

/**
 * DELETE /api/history — hapus beberapa riwayat sekaligus (bisa dipulihkan 30 hari).
 * Body: { sessionIds: string[] } (1–200 id), atau query `?status=selesai` untuk menghapus
 * semua riwayat yang sudah selesai ("Hapus semua").
 * Balasan: { deleted: string[] } — hanya id milik pengguna yang benar-benar dihapus.
 */
export async function DELETE(request: NextRequest) {
  if (request.nextUrl.searchParams.get("status") === "selesai") {
    return respond(await deleteAllFinishedHistoryAction());
  }
  const body = (await request.json().catch(() => null)) as { sessionIds?: unknown } | null;
  if (!body || !Array.isArray(body.sessionIds)) {
    return NextResponse.json(
      { error: "Kirim { sessionIds: [...] } atau pakai ?status=selesai.", code: "invalid" },
      { status: 400 },
    );
  }
  return respond(await deleteHistoryAction(body.sessionIds.map(String)));
}

function respond(result: Awaited<ReturnType<typeof deleteHistoryAction>>) {
  if (result.ok) return NextResponse.json(result.data);
  const status = result.code === "unauthorized" ? 401 : result.code === "invalid" ? 400 : 500;
  return NextResponse.json({ error: result.message, code: result.code }, { status });
}
