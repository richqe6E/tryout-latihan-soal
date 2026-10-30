"use client";

import { SubjectIcon } from "@/components/subject-icon";
import { DIFFICULTY_LABEL, type Difficulty, type Subject } from "@/lib/tryout/types";
import { ChoiceCard } from "./choice-card";

export type SubjectOption = Subject & { counts: Record<Difficulty, number>; total?: number };

const LEVELS: Difficulty[] = ["mudah", "sedang", "sulit"];

/** Kartu pilihan mata pelajaran: ikon, deskripsi, dan jumlah soal per tingkat. */
export function SubjectCard({ subject }: { subject: SubjectOption }) {
  const total = LEVELS.reduce((sum, level) => sum + subject.counts[level], 0);

  return (
    <ChoiceCard value={subject.id} disabled={total === 0} className="items-start">
      <SubjectIcon subjectId={subject.id} tile />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-lg leading-tight font-black group-data-[state=checked]:text-play-blue-ink">
          {subject.name}
        </span>
        <span className="text-sm leading-snug font-bold text-play-ink-muted">{subject.description}</span>
        <span className="mt-1 flex flex-wrap gap-1.5">
          {total === 0 ? (
            <span className="text-xs font-black text-play-ink-muted uppercase">Soal segera hadir</span>
          ) : (
            LEVELS.map((level) => (
              <span
                key={level}
                className="rounded-full bg-play-polar px-2 py-0.5 text-xs font-extrabold text-play-ink-muted group-data-[state=checked]:bg-white"
              >
                {DIFFICULTY_LABEL[level]} {subject.counts[level]}
              </span>
            ))
          )}
        </span>
      </span>
    </ChoiceCard>
  );
}
