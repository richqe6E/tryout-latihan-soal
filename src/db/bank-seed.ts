import { and, asc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { KISI_KISI_PACKAGES } from "../lib/kisi-kisi";
import * as schema from "./schema";

type Db = NodePgDatabase<typeof schema>;

export type BankSeedResult = {
  subjects: number;
  inserted: number;
  skipped: number;
  questionIdByCode: Map<string, string>;
  optionIdsByCode: Map<string, string[]>;
};

export async function seedQuestionBank(db: Db): Promise<BankSeedResult> {
  const subjectRows = await db
    .insert(schema.subjects)
    .values(
      KISI_KISI_PACKAGES.map((pkg, position) => ({
        slug: pkg.meta.slug,
        name: pkg.meta.name,
        description: pkg.meta.description,
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
  const allQuestions = KISI_KISI_PACKAGES.flatMap((pkg) => pkg.questions);

  const questionIdByCode = new Map<string, string>();
  const optionIdsByCode = new Map<string, string[]>();
  let inserted = 0;

  for (const item of allQuestions) {
    const subjectId = subjectIdBySlug.get(item.subjectSlug);
    if (!subjectId) throw new Error(`Mapel "${item.subjectSlug}" untuk soal ${item.code} tidak dikenal.`);

    const questionId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.questions)
        .values({
          subjectId,
          questionText: item.text,
          difficulty: item.difficulty,
          questionType: item.type,
          typeLabel: item.typeLabel ?? null,
          questionNumber: item.number,
          topic: item.topic,
          indicator: item.indicator,
          cognitiveLevel: item.cognitiveLevel,
          stimulusTitle: item.stimulusTitle ?? null,
          stimulusText: item.stimulusText ?? null,
          visualAsset: item.visualAsset ?? null,
          visualCaption: item.visualCaption ?? null,
          expectedAnswer: item.expectedAnswer,
          acceptedAnswers: item.acceptedAnswers ? JSON.stringify(item.acceptedAnswers) : null,
          rubricNotes: item.rubricNotes ?? null,
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

      if (item.options && item.options.length > 0) {
        await tx.insert(schema.options).values(
          item.options.map((option, position) => ({
            questionId: created.id,
            optionText: option.text,
            isCorrect: option.isCorrect,
            position,
            explanation: option.explanation ?? null,
          })),
        );
      }

      inserted += 1;
      return created.id;
    });

    const optionRows = await db
      .select({ id: schema.options.id })
      .from(schema.options)
      .where(eq(schema.options.questionId, questionId))
      .orderBy(asc(schema.options.position));

    questionIdByCode.set(item.code, questionId);
    optionIdsByCode.set(
      item.code,
      optionRows.map((row) => row.id),
    );
  }

  return {
    subjects: subjectRows.length,
    inserted,
    skipped: allQuestions.length - inserted,
    questionIdByCode,
    optionIdsByCode,
  };
}
