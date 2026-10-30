import { NextResponse } from "next/server";
import { sendDueStudyReminders } from "@/server/reminder-service";

/**
 * GET /api/cron/study-reminders — kirim pengingat belajar yang sudah jatuh tempo (jam pilihan pengguna).
 * Jadwalkan tiap 15 menit, dengan header `Authorization: Bearer <CRON_SECRET>`. Balasan: { sent }.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  const result = await sendDueStudyReminders();
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
