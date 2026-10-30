import { NextResponse } from "next/server";
import { revokeAccountSession } from "@/server/account-service";

/**
 * DELETE /api/account/sessions/:sessionId — hapus satu sesi masuk (keluarkan perangkat itu).
 * Balasan: { revoked: true, signedOut: boolean } — `signedOut` true bila yang dihapus sesi perangkat ini.
 * 401 bila belum masuk · 404 bila sesi tidak ada atau bukan milik pengguna.
 */
export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/account/sessions/[sessionId]">,
) {
  const { sessionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return NextResponse.json({ error: "Sesi tidak ditemukan.", code: "not_found" }, { status: 404 });
  }
  const outcome = await revokeAccountSession(request.headers, sessionId);
  if (outcome === "unauthorized") {
    return NextResponse.json({ error: "Belum masuk.", code: "unauthorized" }, { status: 401 });
  }
  if (outcome === "not_found") {
    return NextResponse.json({ error: "Sesi tidak ditemukan.", code: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ revoked: true, signedOut: outcome === "signed_out" });
}
