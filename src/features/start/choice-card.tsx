"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "cn";

/** Kartu pilihan tebal (radio) dengan centang saat terpilih — dasar kartu mapel & tingkat. */
export function ChoiceCard({
  value,
  disabled,
  className,
  children,
}: {
  value: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        "press-3d group relative flex w-full items-center gap-4 rounded-2xl border-solid border-play-line bg-white p-4 pr-11 text-left transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-play-blue data-[state=checked]:border-b-play-blue-strong data-[state=checked]:bg-play-blue-soft",
        className,
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className="absolute top-3 right-3 inline-flex size-6 items-center justify-center rounded-full border-2 border-play-line bg-white text-white transition-colors group-data-[state=checked]:animate-pop group-data-[state=checked]:border-play-blue-strong group-data-[state=checked]:bg-play-blue-strong"
      >
        <Check className="size-4" strokeWidth={3} />
      </span>
    </RadioGroupPrimitive.Item>
  );
}
