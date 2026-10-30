import type { AnswerState, TryoutQuestion } from "@/lib/tryout/types";

export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

export type QuestionStatus = "answered" | "flagged" | "empty";

export const STATUS_LABEL: Record<QuestionStatus, string> = {
  answered: "Terjawab",
  flagged: "Ragu-ragu",
  empty: "Belum dijawab",
};

/** Ragu-ragu diprioritaskan supaya soal yang perlu dicek ulang selalu menonjol. */
export function getQuestionStatus(answer: AnswerState | undefined): QuestionStatus {
  if (answer?.isFlagged) return "flagged";
  if (answer?.selectedOptionId) return "answered";
  return "empty";
}

export function countAnswers(questions: TryoutQuestion[], answers: Record<string, AnswerState>) {
  let answered = 0;
  let flagged = 0;
  for (const question of questions) {
    const answer = answers[question.id];
    if (answer?.selectedOptionId) answered += 1;
    if (answer?.isFlagged) flagged += 1;
  }
  return { answered, flagged, empty: questions.length - answered };
}

/** Huruf pilihan (A–E) untuk id pilihan pada sebuah soal. */
export function getOptionLetter(question: TryoutQuestion, optionId: string | null | undefined) {
  if (!optionId) return null;
  const index = question.options.findIndex((option) => option.id === optionId);
  return index >= 0 ? OPTION_LETTERS[index] : null;
}
