import type { AnswerState, QuestionOutcome, ReviewQuestion, TryoutScore } from "./types";

/** Normalisasi teks jawaban isian singkat untuk perbandingan otomatis. */
export function normalizeAnswerText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?()"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isQuestionAnswered(answer: AnswerState | undefined): boolean {
  if (!answer) return false;
  if (answer.selectedOptionId) return true;
  return Boolean(answer.answerText && answer.answerText.trim().length > 0);
}

/**
 * Penilaian isian singkat terhadap daftar variasi jawaban benar.
 */
export function isShortAnswerCorrect(
  userText: string | null | undefined,
  expectedAnswer?: string,
  acceptedAnswers?: string[],
): boolean {
  const normUser = normalizeAnswerText(userText);
  if (!normUser) return false;

  const candidates = [
    ...(acceptedAnswers ?? []),
    ...(expectedAnswer ? [expectedAnswer] : []),
  ]
    .map((item) => normalizeAnswerText(item))
    .filter(Boolean);

  return candidates.some(
    (candidate) => normUser === candidate || (candidate.length >= 4 && normUser.includes(candidate)),
  );
}

/**
 * Penilaian tryout:
 * - Pilihan Ganda (pg): pencocokan ID opsi benar.
 * - Isian (isian): pencocokan teks ternormalisasi terhadap daftar kunci jawaban.
 * - Uraian (uraian): jika diisi siswa, dihitung benar sementara untuk latihan mandiri dan
 *   ditampilkan kunci jawaban serta rubrik lengkap di halaman Pembahasan.
 */
export function gradeAnswers(
  questions: Pick<
    ReviewQuestion,
    "id" | "correctOptionId" | "questionType" | "expectedAnswer" | "acceptedAnswers"
  >[],
  answers: Record<string, AnswerState>,
): TryoutScore {
  const outcomes: Record<string, QuestionOutcome> = {};
  let correct = 0;
  let wrong = 0;
  let empty = 0;
  let essayAnswered = 0;
  let essayTotal = 0;

  for (const question of questions) {
    const answer = answers[question.id];
    const qType = question.questionType ?? "pg";

    if (qType === "uraian") {
      essayTotal += 1;
      const text = answer?.answerText?.trim() ?? "";
      if (!text) {
        outcomes[question.id] = "kosong";
        empty += 1;
      } else {
        outcomes[question.id] = "benar";
        correct += 1;
        essayAnswered += 1;
      }
      continue;
    }

    if (qType === "isian") {
      const text = answer?.answerText?.trim() ?? "";
      if (!text) {
        outcomes[question.id] = "kosong";
        empty += 1;
      } else if (isShortAnswerCorrect(text, question.expectedAnswer, question.acceptedAnswers)) {
        outcomes[question.id] = "benar";
        correct += 1;
      } else {
        outcomes[question.id] = "salah";
        wrong += 1;
      }
      continue;
    }

    const selected = answer?.selectedOptionId ?? null;
    if (!selected) {
      outcomes[question.id] = "kosong";
      empty += 1;
    } else if (selected === question.correctOptionId) {
      outcomes[question.id] = "benar";
      correct += 1;
    } else {
      outcomes[question.id] = "salah";
      wrong += 1;
    }
  }

  const total = questions.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { score, correct, wrong, empty, total, essayAnswered, essayTotal, outcomes };
}
