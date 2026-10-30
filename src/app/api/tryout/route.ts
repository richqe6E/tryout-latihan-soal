import { NextResponse } from "next/server";
import { startTryoutAction } from "@/server/actions/tryout-actions";

const STATUS: Record<string, number> = { invalid: 400, unauthorized: 401, not_found: 404, unavailable: 422 };

/**
 * POST /api/tryout — mulai tryout baru sesuai mapel & tingkat kesulitan.
 * Body: { subjectSlug, difficulty: "mudah" | "sedang" | "sulit", questionCount?, durationSeconds? }
 *   `questionCount` 1–50 (bawaan 10), `durationSeconds` 60–10800 (bawaan 1800), minimal 30 detik per soal.
 * Soal diundi acak dari soal AKTIF mapel & tingkat itu; bila bank soal kurang, sesi berisi
 * soal sebanyak yang tersedia (`totalQuestions` < `requestedQuestions`).
 * Balasan 201: { sessionId, subject: { id, name }, difficulty, requestedQuestions, totalQuestions,
 *   durationSeconds, startedAt, expiresAt }
 * 400 data tidak valid · 401 belum masuk · 404 mapel tidak ada/nonaktif · 422 belum ada soal untuk tingkat itu.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body harus JSON.", code: "invalid" }, { status: 400 });
  }
  const result = await startTryoutAction({
    subjectSlug: String(body.subjectSlug ?? ""),
    difficulty: body.difficulty as "mudah" | "sedang" | "sulit",
    questionCount: body.questionCount === undefined ? undefined : Number(body.questionCount),
    durationSeconds: body.durationSeconds === undefined ? undefined : Number(body.durationSeconds),
  });
  if (result.ok) return NextResponse.json(result.data, { status: 201 });
  return NextResponse.json(
    { error: result.message, code: result.code, fieldErrors: result.fields },
    { status: STATUS[result.code] ?? 500 },
  );
}
