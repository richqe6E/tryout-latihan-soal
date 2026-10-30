/**
 * Isi bank soal secara aditif: mapel di-upsert berdasarkan slug, soal baru ditambahkan,
 * dan soal yang sudah ada (teks sama dalam mapel yang sama) dilewati tanpa diubah —
 * sehingga aman dijalankan berulang dan tidak menyentuh data pengguna.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { QUESTION_BANK, SUBJECTS, type BankQuestion } from "../lib/mock/question-bank";
import * as schema from "./schema";
import { EXTRA_QUESTIONS } from "./seed-data/extra-questions";

type Db = NodePgDatabase<typeof schema>;

/** Seluruh soal contoh untuk database: bank frontend + soal tambahan. */
export const SEED_QUESTIONS: BankQuestion[] = [...QUESTION_BANK, ...EXTRA_QUESTIONS];

export type BankSeedResult = {
  subjects: number;
  inserted: number;
  skipped: number;
  /** Kode soal bank → id soal di database. */
  questionIdByCode: Map<string, string>;
  /** Kode soal bank → id pilihan di database, urut posisi (0 = A). */
  optionIdsByCode: Map<string, string[]>;
};

export async function seedQuestionBank(db: Db): Promise<BankSeedResult> {
  const subjectRows = await db
    .insert(schema.subjects)
    .values(
      SUBJECTS.map((subject, position) => ({
        slug: subject.id,
        name: subject.name,
        description: subject.description,
        position,
      })),
    )
    .onConflictDoUpdate({
      target: schema.subjects.slug,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        position: sql`excluded.position`,
      },
    })
    .returning({ id: schema.subjects.id, slug: schema.subjects.slug });
  const subjectIdBySlug = new Map(subjectRows.map((row) => [row.slug, row.id]));

  const questionIdByCode = new Map<string, string>();
  const optionIdsByCode = new Map<string, string[]>();
  let inserted = 0;

  for (const item of SEED_QUESTIONS) {
    const subjectId = subjectIdBySlug.get(item.subjectId);
    if (!subjectId) throw new Error(`Mapel "${item.subjectId}" untuk soal ${item.id} tidak dikenal.`);

    const questionId = await db.transaction(async (tx) => {
      // Konflik pada index unik teks soal → soal sudah ada; lewati.
      const [created] = await tx
        .insert(schema.questions)
        .values({
          subjectId,
          questionText: item.text,
          difficulty: item.difficulty,
          explanation: item.explanation,
        })
        .onConflictDoNothing()
        .returning({ id: schema.questions.id });
      if (!created) {
        const [existing] = await tx
          .select({ id: schema.questions.id })
          .from(schema.questions)
          .where(
            and(
              eq(schema.questions.subjectId, subjectId),
              sql`md5(lower(btrim(${schema.questions.questionText}))) = md5(lower(btrim(${item.text})))`,
            ),
          )
          .limit(1);
        return existing.id;
      }
      await tx.insert(schema.options).values(
        item.options.map((option, position) => ({
          questionId: created.id,
          optionText: option.text,
          isCorrect: option.isCorrect,
          position,
          explanation: option.explanation ?? null,
        })),
      );
      inserted += 1;
      return created.id;
    });

    const optionRows = await db
      .select({ id: schema.options.id })
      .from(schema.options)
      .where(eq(schema.options.questionId, questionId))
      .orderBy(asc(schema.options.position));
    questionIdByCode.set(item.id, questionId);
    optionIdsByCode.set(
      item.id,
      optionRows.map((row) => row.id),
    );
  }

  return {
    subjects: subjectRows.length,
    inserted,
    skipped: SEED_QUESTIONS.length - inserted,
    questionIdByCode,
    optionIdsByCode,
  };
}
