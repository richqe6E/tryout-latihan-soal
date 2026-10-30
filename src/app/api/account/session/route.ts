import { NextResponse } from "next/server";
import { getAccountSession } from "@/server/account-service";

/**
 * GET /api/account/session — sesi masuk saat ini.
 * Balasan 200: { user: { id, name, email, phone, createdAt }, expiresAt } · 401 bila belum masuk.
 */
export async function GET(request: Request) {
  const session = await getAccountSession(request.headers);
  if (!session) {
    return NextResponse.json({ error: "Belum masuk.", code: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(session, { headers: { "Cache-Control": "private, no-store" } });
}
