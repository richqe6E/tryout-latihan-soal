"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "cn";

export type ChipOption = { value: number; label: string; caption?: string };

type ChipRadioGroupProps = {
  value: number;
  options: ChipOption[];
  onChange: (value: number) => void;
  labelledBy: string;
  describedBy?: string;
  /** Kelas grid kolom, mis. untuk 6 pilihan. */
  columns?: string;
};

/** Pilihan angka berbentuk chip tebal; panah kiri/kanan berpindah pilihan. */
export function ChipRadioGroup({
  value,
  options,
  onChange,
  labelledBy,
  describedBy,
  columns = "grid-cols-2 sm:grid-cols-4",
}: ChipRadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      value={String(value)}
      onValueChange={(next) => onChange(Number(next))}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      orientation="horizontal"
      loop
      className={cn("grid gap-2 sm:gap-3", columns)}
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={String(option.value)}
          className="press-3d flex flex-col items-center justify-center gap-0.5 rounded-xl border-solid border-play-line bg-white px-3 py-3 text-center transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink data-[state=checked]:border-play-blue data-[state=checked]:border-b-play-blue-strong data-[state=checked]:bg-play-blue-soft data-[state=checked]:text-play-blue-ink"
        >
          <span className="text-xl leading-none font-black">{option.label}</span>
          {option.caption ? (
            <span className="text-xs font-extrabold opacity-80">{option.caption}</span>
          ) : null}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
