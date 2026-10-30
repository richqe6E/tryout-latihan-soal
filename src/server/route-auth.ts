import "server-only";

import { NextResponse } from "next/server";
import { getCurrentDbUser, type CurrentUser } from "@/server/current-user";

/** Header untuk data pribadi pengguna: jangan disimpan cache bersama/peramban. */
export const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" } as const;

/** Respons 401 seragam untuk API yang wajib masuk. */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Silakan masuk dulu.", code: "unauthorized" },
    { status: 401, headers: PRIVATE_NO_STORE },
  );
}

/**
 * Penjaga Route Handler data pribadi (nilai, riwayat, sesi tryout): sesi divalidasi di server.
 * Proxy hanya menolak cepat permintaan tanpa cookie; pemeriksaan sesungguhnya di sini.
 */
export async function requireApiUser(): Promise<
  { user: CurrentUser; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const user = await getCurrentDbUser();
  return user ? { user } : { response: unauthorizedResponse() };
}
