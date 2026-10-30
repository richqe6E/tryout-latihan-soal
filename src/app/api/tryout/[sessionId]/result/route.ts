import { NextResponse } from "next/server";
import { submitTryoutAction } from "@/server/actions/tryout-actions";
import { getResultDetailForUser, getResultLookupForUser } from "@/server/tryout-repository";
import { PRIVATE_NO_STORE, requireApiUser } from "@/server/route-auth";

const STATUS: Record<string, number> = { invalid: 400, unauthorized: 401, not_found: 404 };

/**
 * GET /api/tryout/:sessionId/result — detail hasil tryout.
 * Balasan: metadata pilihan (mapel, tingkat, jumlah soal diminta & didapat, durasi), nilai,
 * benar/salah/kosong, akurasi, alasan kumpul, lama pengerjaan,
 * `items` (nomor, status benar/salah/kosong, ditandai ragu) per soal, `history` nilai mapel sama
 * sebelum sesi ini, dan `scoreChange` terhadap tryout sebelumnya. Tanpa teks soal/kunci jawaban.
 * 404 bila sesi tidak ada / bukan milik pengguna; 409 `not_finished` bila belum dikumpulkan.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/tryout/[sessionId]/result">) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const { sessionId } = await params;
  const lookup = await getResultLookupForUser(sessionId, user.id);
  if (lookup.status === "not_found") {
    return NextResponse.json({ error: "Hasil tryout tidak ditemukan.", code: "not_found" }, { status: 404 });
  }
  if (lookup.status === "not_finished") {
    return NextResponse.json(
      { error: "Tryout ini belum dikumpulkan.", code: "not_finished" },
      { status: 409 },
    );
  }
  return NextResponse.json(lookup.result, { headers: PRIVATE_NO_STORE });
}

/**
 * POST /api/tryout/:sessionId/result — simpan hasil setelah tryout selesai.
 * Body (opsional): { reason?: "manual" | "timeout", answers?: Record<questionId, { selectedOptionId, isFlagged }> }
 * Server menilai jawaban (kunci tidak pernah dari klien), menyimpan nilai, rincian benar/salah/kosong,
 * dan lama pengerjaan, lalu membalas dengan detail hasil yang sama seperti GET.
 * 201 bila hasil baru disimpan; 200 bila sesi sudah dikumpulkan sebelumnya (idempoten, hasil tidak berubah).
 */
export async function POST(request: Request, { params }: RouteContext<"/api/tryout/[sessionId]/result">) {
  const { sessionId } = await params;
  const raw = await request.text();
  const body = raw.trim() ? (safeJson(raw) as Record<string, unknown> | null) : {};
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body harus JSON.", code: "invalid" }, { status: 400 });
  }

  const saved = await submitTryoutAction({
    sessionId,
    reason: body.reason === "timeout" ? "timeout" : "manual",
    answers: body.answers as
      Record<string, { selectedOptionId: string | null; isFlagged: boolean }> | undefined,
  });
  if (!saved.ok) {
    return NextResponse.json(
      { error: saved.message, code: saved.code },
      { status: STATUS[saved.code] ?? 500 },
    );
  }

  const { user, response } = await requireApiUser();
  if (response) return response;
  const result = await getResultDetailForUser(sessionId, user.id);
  if (!result) return NextResponse.json({ error: "Hasil tryout tidak ditemukan." }, { status: 404 });
  return NextResponse.json(result, {
    status: saved.data.alreadySubmitted ? 200 : 201,
    headers: PRIVATE_NO_STORE,
  });
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
