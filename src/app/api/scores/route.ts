import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getScoreHistoryForUser } from "@/server/tryout-repository";
import { PRIVATE_NO_STORE, requireApiUser } from "@/server/route-auth";

const querySchema = z.object({
  subject: z
    .string()
    .regex(/^[a-z0-9-]{1,60}$/)
    .optional(),
  difficulty: z.enum(["mudah", "sedang", "sulit"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  before: z.iso.datetime({ offset: true }).optional(),
});

/**
 * GET /api/scores — riwayat nilai pengguna yang sedang masuk (tryout selesai, terbaru dulu).
 * Query: `subject` (slug mapel), `difficulty` (mudah|sedang|sulit), `limit` (1–100, bawaan 50),
 *   `before` (kursor ISO dari `nextCursor`).
 * Balasan: { items: ScoreHistoryEntry[], nextCursor: string | null, summary: { count, average, best } }
 *   Tiap item membawa metadata pilihan saat memulai: subjectId, subjectName, difficulty,
 *   requestedQuestions, total, durationSeconds.
 */
export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parameter riwayat nilai tidak valid.", code: "invalid" },
      { status: 400 },
    );
  }
  const { subject, difficulty, limit, before } = parsed.data;
  const page = await getScoreHistoryForUser(user.id, {
    subject,
    difficulty,
    limit,
    before: before ? new Date(before) : undefined,
  });
  return NextResponse.json(page, { headers: PRIVATE_NO_STORE });
}
