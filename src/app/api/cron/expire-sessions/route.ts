import { NextResponse } from "next/server";
import { expireOverdueSessions } from "@/server/tryout-service";

/**
 * GET /api/cron/expire-sessions — tutup semua sesi yang lewat batas waktu.
 * Dipanggil penjadwal (mis. Vercel Cron) dengan header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  const closed = await expireOverdueSessions();
  return NextResponse.json({ closed }, { headers: { "Cache-Control": "no-store" } });
}
