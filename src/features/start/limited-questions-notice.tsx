"use client";

import { Mascot } from "@/components/mascot";
import { PlayButton } from "@/components/ui/play-button";
import { DIFFICULTY_LABEL, type Difficulty } from "@/lib/tryout/types";
import { DIFFICULTIES } from "./difficulty-picker";

/** Di bawah jumlah ini, soal dianggap terbatas. */
export const RECOMMENDED_MIN_QUESTIONS = 5;

type LimitedQuestionsNoticeProps = {
  subjectName: string;
  difficulty: Difficulty;
  counts: Record<Difficulty, number>;
  onPick: (difficulty: Difficulty) => void;
};

/** Pesan ramah saat bank soal untuk pilihan ini masih sedikit atau kosong. */
export function LimitedQuestionsNotice({
  subjectName,
  difficulty,
  counts,
  onPick,
}: LimitedQuestionsNoticeProps) {
  const available = counts[difficulty];
  if (available >= RECOMMENDED_MIN_QUESTIONS) return null;

  const alternative = DIFFICULTIES.filter((level) => level !== difficulty && counts[level] > available).sort(
    (a, b) => counts[b] - counts[a],
  )[0];
  const level = DIFFICULTY_LABEL[difficulty].toLowerCase();

  return (
    <div
      role="status"
      className="flex animate-drop items-start gap-3 rounded-2xl border-2 border-play-blue bg-play-blue-soft p-4"
    >
      <Mascot mood="worried" className="size-12 shrink-0" />
      <div className="flex flex-col gap-2">
        <p className="text-lg leading-snug font-black text-play-blue-ink">
          {available === 0 ? "Soalnya belum tersedia" : `Baru ada ${available} soal`}
        </p>
        <p className="leading-relaxed font-bold text-play-ink">
          {available === 0
            ? `Bank soal ${subjectName} tingkat ${level} masih disiapkan.`
            : `Bank soal ${subjectName} tingkat ${level} masih sedikit. Kamu tetap bisa mulai, tapi soalnya akan lebih sering berulang.`}
          {alternative
            ? ` Tingkat ${DIFFICULTY_LABEL[alternative].toLowerCase()} punya ${counts[alternative]} soal.`
            : ""}
        </p>
        {alternative ? (
          <PlayButton size="sm" tone="blue" className="self-start" onClick={() => onPick(alternative)}>
            Pakai tingkat {DIFFICULTY_LABEL[alternative]}
          </PlayButton>
        ) : null}
      </div>
    </div>
  );
}
