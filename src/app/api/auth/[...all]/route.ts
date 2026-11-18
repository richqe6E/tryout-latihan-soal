import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { hasDatabase } from "@/db";
import { getAuth } from "@/server/auth";

function handleAuth(method: "GET" | "POST") {
  return async (request: Request) => {
    if (!hasDatabase()) {
      return NextResponse.json(
        { error: "Mode lokal aktif. Gunakan login nama siswa." },
        { status: 503 },
      );
    }
    const auth = getAuth()!;
    const handlers = toNextJsHandler(auth);
    return handlers[method](request);
  };
}

export const GET = handleAuth("GET");
export const POST = handleAuth("POST");
