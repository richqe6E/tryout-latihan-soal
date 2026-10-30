/**
 * Isi database pengembangan: bank soal, akun demo, dan satu sesi demo yang sedang berjalan.
 * Jalankan: npm run db:seed  (menghapus data lama!)
 * Hanya ingin menambah soal tanpa menghapus data? Pakai npm run db:seed:bank.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { DEMO_ACCOUNT } from "../lib/auth/demo-account";
import { QUESTION_BANK } from "../lib/mock/question-bank";
import { seedQuestionBank } from "./bank-seed";
import * as schema from "./schema";

const DEMO_USER = { name: "Nadia Putri", email: DEMO_ACCOUNT.email, phoneNumber: DEMO_ACCOUNT.phone };
/** Jawaban awal sesi demo: kode soal bank → huruf pilihan (null = ragu tanpa jawaban). */
const DEMO_ANSWERS: Record<string, { letter: number; flagged: boolean }> = {
  "mtk-001": { letter: 2, flagged: false },
  "mtk-002": { letter: 1, flagged: false },
  "mtk-003": { letter: 1, flagged: true },
  "mtk-005": { letter: 1, flagged: false },
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diatur.");
  const pool = new Pool({ connectionString: url });
  const db = drizzle({ client: pool, schema });

  await db.execute(
    sql`TRUNCATE ${schema.answers}, ${schema.sessionQuestions}, ${schema.tryoutSessions}, ${schema.options}, ${schema.questions}, ${schema.subjects}, ${schema.authSessions}, ${schema.authAccounts}, ${schema.authVerifications}, ${schema.userSettings}, ${schema.users} CASCADE`,
  );

  const bank = await seedQuestionBank(db);
  const { questionIdByCode, optionIdsByCode } = bank;
  const subjectIdBySlug = new Map(
    (await db.select({ id: schema.subjects.id, slug: schema.subjects.slug }).from(schema.subjects)).map(
      (row) => [row.slug, row.id],
    ),
  );

  const [user] = await db.insert(schema.users).values(DEMO_USER).returning({ id: schema.users.id });
  await db.insert(schema.userSettings).values({ userId: user.id });
  // Akun "credential" Better Auth: password demo di-hash (scrypt) seperti saat daftar biasa.
  await db.insert(schema.authAccounts).values({
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: await hashPassword(DEMO_ACCOUNT.password),
  });

  // Sesi demo: Matematika sedang, 10 soal, 30 menit, sudah berjalan 10 menit.
  const demoQuestions = QUESTION_BANK.filter(
    (item) => item.subjectId === "matematika" && item.difficulty === "sedang",
  );
  const durationSeconds = demoQuestions.length * 3 * 60;
  const startedAt = new Date(Date.now() - 10 * 60 * 1000);
  const [session] = await db
    .insert(schema.tryoutSessions)
    .values({
      userId: user.id,
      subjectId: subjectIdBySlug.get("matematika")!,
      difficulty: "sedang",
      totalQuestions: demoQuestions.length,
      requestedQuestions: demoQuestions.length,
      durationSeconds,
      startedAt,
      deadlineAt: new Date(startedAt.getTime() + durationSeconds * 1000),
      lastOrderNumber: 4,
    })
    .returning({ id: schema.tryoutSessions.id });

  await db.insert(schema.sessionQuestions).values(
    demoQuestions.map((item, index) => ({
      sessionId: session.id,
      questionId: questionIdByCode.get(item.id)!,
      orderNumber: index + 1,
    })),
  );
  await db.insert(schema.answers).values(
    Object.entries(DEMO_ANSWERS).map(([code, answer]) => ({
      sessionId: session.id,
      questionId: questionIdByCode.get(code)!,
      selectedOptionId: optionIdsByCode.get(code)![answer.letter],
      isFlagged: answer.flagged,
    })),
  );

  console.log(`✓ ${bank.subjects} mapel, ${bank.inserted} soal, akun demo ${DEMO_USER.email}`);
  console.log(`✓ Sesi demo: /tryout/${session.id}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
