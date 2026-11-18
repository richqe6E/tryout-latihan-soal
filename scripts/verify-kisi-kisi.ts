import assert from "node:assert/strict";
import { KISI_KISI_PACKAGES } from "../src/lib/kisi-kisi";
import { gradeAnswers } from "../src/lib/tryout/grading";

const EXPECTED_COUNTS: Record<string, { total: number; pg: number; isian: number; uraian: number }> = {
  matematika: { total: 25, pg: 15, isian: 10, uraian: 0 },
  "bahasa-indonesia": { total: 35, pg: 20, isian: 10, uraian: 5 },
  "budaya-kutai": { total: 35, pg: 20, isian: 10, uraian: 5 },
  "pendidikan-pancasila": { total: 35, pg: 20, isian: 10, uraian: 5 },
  "seni-rupa": { total: 35, pg: 20, isian: 10, uraian: 5 },
};

assert.equal(KISI_KISI_PACKAGES.length, 5, "Harus ada tepat 5 mata pelajaran.");

let grandTotal = 0;
for (const pkg of KISI_KISI_PACKAGES) {
  const expected = EXPECTED_COUNTS[pkg.meta.slug];
  assert.ok(expected, `Mapel tidak dikenal: ${pkg.meta.slug}`);
  assert.equal(pkg.questions.length, expected.total, `Jumlah soal ${pkg.meta.slug} harus ${expected.total}`);

  const pg = pkg.questions.filter((q) => q.type === "pg");
  const isian = pkg.questions.filter((q) => q.type === "isian");
  const uraian = pkg.questions.filter((q) => q.type === "uraian");
  assert.equal(pg.length, expected.pg, `${pkg.meta.slug}: PG harus ${expected.pg}`);
  assert.equal(isian.length, expected.isian, `${pkg.meta.slug}: Isian harus ${expected.isian}`);
  assert.equal(uraian.length, expected.uraian, `${pkg.meta.slug}: Uraian harus ${expected.uraian}`);

  pkg.questions.forEach((q, idx) => {
    assert.equal(q.number, idx + 1, `${pkg.meta.slug}: nomor urut soal harus ${idx + 1}`);
    assert.ok(q.indicator.trim().length > 0, `${q.code}: indikator kosong`);
    assert.ok(q.explanation.trim().length > 0, `${q.code}: pembahasan kosong`);
    assert.ok(q.expectedAnswer.trim().length > 0, `${q.code}: expectedAnswer kosong`);
    if (q.type === "pg") {
      assert.ok(q.options && q.options.length === 4, `${q.code}: PG harus tepat 4 opsi (a-d)`);
      const correctCount = q.options.filter((o) => o.isCorrect).length;
      assert.equal(correctCount, 1, `${q.code}: PG harus memiliki tepat 1 kunci benar`);
    }
  });
  grandTotal += pkg.questions.length;
}

// Verifikasi catatan khusus Seni Rupa No. 7 (opsi C = index 2 adalah alat/kunci)
const seni7 = KISI_KISI_PACKAGES.find((p) => p.meta.slug === "seni-rupa")!.questions[6];
assert.equal(seni7.options![2].isCorrect, true, "Seni Rupa No. 7 opsi C harus menjadi kunci jawaban");

// Verifikasi fungsi penilaian PG + Isian + Uraian
const sampleQuestions = [
  { id: "q1", questionType: "pg" as const, correctOptionId: "opt-b" },
  { id: "q2", questionType: "isian" as const, correctOptionId: "", expectedAnswer: "8.539", acceptedAnswers: ["8.539", "8539"] },
  { id: "q3", questionType: "uraian" as const, correctOptionId: "", expectedAnswer: "Contoh uraian" },
];
const scoreResult = gradeAnswers(sampleQuestions, {
  q1: { selectedOptionId: "opt-b", isFlagged: false },
  q2: { selectedOptionId: null, answerText: " 8539 ", isFlagged: false },
  q3: { selectedOptionId: null, answerText: "Jawaban siswa...", isFlagged: false },
});
assert.equal(scoreResult.score, 100);
assert.equal(scoreResult.correct, 3);

console.log(`VERIFICATION OK: 5 subjects, ${grandTotal} total questions validated & grading tests passed.`);
