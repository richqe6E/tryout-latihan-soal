import { NextResponse } from "next/server";
import { listAccountSessions } from "@/server/account-service";

/**
 * GET /api/account/sessions — perangkat yang sedang masuk ke akun ini.
 * Balasan: { sessions: [{ id, userAgent, createdAt, lastActiveAt, expiresAt, current }] } · 401 bila belum masuk.
 */
export async function GET(request: Request) {
  const sessions = await listAccountSessions(request.headers);
  if (!sessions) {
    return NextResponse.json({ error: "Belum masuk.", code: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ sessions }, { headers: { "Cache-Control": "private, no-store" } });
}
