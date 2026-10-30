"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type { TryoutQuestion } from "@/lib/tryout/types";
import { OPTION_LETTERS } from "./answer-status";

type OptionListProps = {
  question: TryoutQuestion;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
};

/** Pilihan ganda: tepat satu jawaban per soal. Panah atas/bawah berpindah pilihan. */
export function OptionList({ question, selectedOptionId, onSelect }: OptionListProps) {
  return (
    <RadioGroupPrimitive.Root
      value={selectedOptionId ?? ""}
      onValueChange={onSelect}
      aria-label={`Pilihan jawaban soal ${question.orderNumber}`}
      className="grid gap-3"
      loop
    >
      {question.options.map((option, index) => (
        <RadioGroupPrimitive.Item
          key={option.id}
          value={option.id}
          className="group press-3d flex w-full items-center gap-4 rounded-2xl border-solid border-play-line bg-white px-4 py-3 text-left text-lg leading-relaxed font-bold text-play-ink transition-colors duration-150 hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink data-[state=checked]:border-play-blue data-[state=checked]:border-b-play-blue-strong data-[state=checked]:bg-play-blue-soft data-[state=checked]:text-play-blue-ink"
        >
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-2 border-play-line bg-white text-sm font-black text-play-ink-muted transition-colors group-data-[state=checked]:animate-pop group-data-[state=checked]:border-play-blue group-data-[state=checked]:text-play-blue-ink">
            {OPTION_LETTERS[index]}
          </span>
          <span className="min-w-0 [overflow-wrap:anywhere]">{option.text}</span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
