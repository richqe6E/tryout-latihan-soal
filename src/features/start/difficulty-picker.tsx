"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "cn";
import { DIFFICULTY_LABEL, type Difficulty } from "@/lib/tryout/types";
import { ChoiceCard } from "./choice-card";

export const DIFFICULTIES: Difficulty[] = ["mudah", "sedang", "sulit"];

const DIFFICULTY_INFO: Record<Difficulty, { hint: string; bars: number }> = {
  mudah: { hint: "Pemanasan, konsep dasar", bars: 1 },
  sedang: { hint: "Setara soal ujian", bars: 2 },
  sulit: { hint: "Tantangan untuk naik level", bars: 3 },
};

function DifficultyBars({ level }: { level: number }) {
  return (
    <span aria-hidden="true" className="flex h-7 shrink-0 items-end gap-1">
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className={cn(
            "w-2 rounded-t-[3px]",
            bar === 1 ? "h-3" : bar === 2 ? "h-5" : "h-7",
            bar <= level ? "bg-play-blue-strong" : "bg-play-line",
          )}
        />
      ))}
    </span>
  );
}

type DifficultyPickerProps = {
  value: Difficulty;
  onChange: (value: Difficulty) => void;
  /** Jumlah soal per tingkat untuk mapel terpilih; tingkat tanpa soal dinonaktifkan. */
  counts?: Record<Difficulty, number>;
  labelledBy?: string;
};

/** Pilih tingkat kesulitan: mudah, sedang, atau sulit. */
export function DifficultyPicker({ value, onChange, counts, labelledBy }: DifficultyPickerProps) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={(next) => onChange(next as Difficulty)}
      aria-labelledby={labelledBy}
      className="grid gap-3 sm:grid-cols-3"
    >
      {DIFFICULTIES.map((level) => {
        const count = counts?.[level];
        return (
          <ChoiceCard key={level} value={level} disabled={count === 0}>
            <DifficultyBars level={DIFFICULTY_INFO[level].bars} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-lg font-black group-data-[state=checked]:text-play-blue-ink">
                {DIFFICULTY_LABEL[level]}
              </span>
              <span className="text-sm leading-snug font-bold text-play-ink-muted">
                {DIFFICULTY_INFO[level].hint}
              </span>
              {count !== undefined ? (
                <span className="text-xs font-black tracking-[0.04em] text-play-ink-muted uppercase">
                  {count > 0 ? `${count} soal tersedia` : "Belum ada soal"}
                </span>
              ) : null}
            </span>
          </ChoiceCard>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}
