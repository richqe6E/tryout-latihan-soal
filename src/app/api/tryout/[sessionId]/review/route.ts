import { NextResponse, type NextRequest } from "next/server";
import { isReviewFilter } from "@/lib/tryout/review-filter";
import { getReviewDetailForUser } from "@/server/tryout-repository";
import { PRIVATE_NO_STORE, requireApiUser } from "@/server/route-auth";

/**
 * GET /api/tryout/:sessionId/review — pembahasan sesi tryout yang sudah selesai.
 * Query: `filter` = semua (bawaan) | salah | kosong | benar — mis. `?filter=salah` untuk fokus soal salah.
 * Balasan: { sessionId, title, subject, difficulty, score, finishedAt, filter,
 *   counts: { semua, benar, salah, kosong } (selalu untuk semua soal),
 *   items: [{ number, questionId, text, options: [{ id, text, isCorrect, explanation? }],
 *             correctOptionId, selectedOptionId, outcome, flagged, explanation }] }
 * 400 bila `filter` tidak dikenal; 409 selama tryout belum dikumpulkan (kunci jawaban belum boleh
 * dilihat); 404 bila bukan milik pengguna.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/tryout/[sessionId]/review">) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const filter = request.nextUrl.searchParams.get("filter") ?? "semua";
  if (!isReviewFilter(filter)) {
    return NextResponse.json(
      { error: "Saringan harus salah satu dari: semua, salah, kosong, benar.", code: "invalid" },
      { status: 400 },
    );
  }
  const { sessionId } = await params;
  const lookup = await getReviewDetailForUser(sessionId, user.id, filter);
  if (lookup.status === "not_found") {
    return NextResponse.json({ error: "Sesi tryout tidak ditemukan.", code: "not_found" }, { status: 404 });
  }
  if (lookup.status === "not_finished") {
    return NextResponse.json(
      { error: "Pembahasan tersedia setelah tryout dikumpulkan.", code: "not_finished" },
      { status: 409 },
    );
  }
  return NextResponse.json(lookup.review, { headers: PRIVATE_NO_STORE });
}
