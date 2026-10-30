import { NextResponse } from "next/server";
import { purgeExpiredAuthRecords } from "@/server/account-service";
import { DELETED_RETENTION_DAYS, purgeDeletedHistory } from "@/server/history-service";

/**
 * GET /api/cron/purge-history — bersih-bersih harian: riwayat yang dihapus lebih dari 30 hari lalu,
 * serta sesi masuk & kode verifikasi yang sudah kedaluwarsa.
 * Dipanggil penjadwal (mis. Vercel Cron) dengan header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  const [purged, expiredAuth] = await Promise.all([purgeDeletedHistory(), purgeExpiredAuthRecords()]);
  return NextResponse.json(
    { purged, retentionDays: DELETED_RETENTION_DAYS, expiredAuth },
    { headers: { "Cache-Control": "no-store" } },
  );
}
