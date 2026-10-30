import type { AnswerState, QuestionOutcome, ReviewQuestion, TryoutScore } from "./types";

/**
 * Penilaian tryout: tiap soal benar bernilai sama, nilai akhir 0–100 (dibulatkan).
 * Fungsi murni — dipakai di UI sekarang dan di backend nanti.
 */
export function gradeAnswers(
  questions: Pick<ReviewQuestion, "id" | "correctOptionId">[],
  answers: Record<string, AnswerState>,
): TryoutScore {
  const outcomes: Record<string, QuestionOutcome> = {};
  let correct = 0;
  let wrong = 0;
  let empty = 0;

  for (const question of questions) {
    const selected = answers[question.id]?.selectedOptionId ?? null;
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
  return { score, correct, wrong, empty, total, outcomes };
}
