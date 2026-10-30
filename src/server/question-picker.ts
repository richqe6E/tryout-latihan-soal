import "server-only";

import { randomInt } from "node:crypto";
import { and, asc, eq, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { questions, sessionQuestions, tryoutSessions } from "@/db/schema";
import type { Difficulty } from "@/lib/tryout/types";

type PickInput = { userId: string; subjectId: string; difficulty: Difficulty; count: number };

/**
 * Undi soal untuk sesi baru tanpa mengulang soal antar sesi selama bank soal masih cukup:
 * 1. soal yang BELUM pernah muncul di sesi pengguna untuk mapel & tingkat ini (urutan acak),
 * 2. bila kurang, soal yang paling LAMA terakhir muncul (yang baru saja dikerjakan paling akhir).
 * Hasil akhirnya diacak ulang supaya soal lama tidak selalu menumpuk di nomor belakang.
 */
export async function pickQuestions({ userId, subjectId, difficulty, count }: PickInput): Promise<string[]> {
  // Kapan terakhir tiap soal muncul di sesi pengguna (mapel & tingkat yang sama).
  const seen = db
    .select({
      questionId: sessionQuestions.questionId,
      lastSeen: max(tryoutSessions.startedAt).as("last_seen"),
    })
    .from(sessionQuestions)
    .innerJoin(tryoutSessions, eq(tryoutSessions.id, sessionQuestions.sessionId))
    .where(
      and(
        eq(tryoutSessions.userId, userId),
        eq(tryoutSessions.subjectId, subjectId),
        eq(tryoutSessions.difficulty, difficulty),
      ),
    )
    .groupBy(sessionQuestions.questionId)
    .as("seen");

  const rows = await db
    .select({ id: questions.id })
    .from(questions)
    .leftJoin(seen, eq(seen.questionId, questions.id))
    .where(
      and(
        eq(questions.subjectId, subjectId),
        eq(questions.difficulty, difficulty),
        eq(questions.isActive, true),
      ),
    )
    .orderBy(sql`${seen.lastSeen} ASC NULLS FIRST`, sql`random()`, asc(questions.id))
    .limit(count);

  return shuffle(rows.map((row) => row.id));
}

/** Fisher–Yates dengan sumber acak kriptografis. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}
