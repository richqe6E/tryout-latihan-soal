"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { parseReviewFilter as parseFilter, type ReviewFilter } from "@/lib/tryout/review-filter";

/** Saringan yang tampil di halaman pembahasan (subset dari saringan API). */
export type ReviewFilterOption = Exclude<ReviewFilter, "benar">;

/** Saringan halaman dari URL; yang tidak punya tab (mis. "benar") kembali ke "semua". */
export function parseReviewFilterOption(value: string | null): ReviewFilterOption {
  const filter = parseFilter(value);
  return filter === "benar" ? "semua" : filter;
}

export const REVIEW_FILTERS: { value: ReviewFilterOption; label: string; shortLabel: string }[] = [
  { value: "semua", label: "Semua", shortLabel: "Semua" },
  { value: "salah", label: "Salah", shortLabel: "Salah" },
  { value: "kosong", label: "Belum dijawab", shortLabel: "Kosong" },
];

type ReviewFilterBarProps = {
  value: ReviewFilterOption;
  counts: Record<ReviewFilterOption, number>;
  onChange: (value: ReviewFilterOption) => void;
};

/** Saring soal pembahasan; panah kiri/kanan berpindah pilihan. */
export function ReviewFilterBar({ value, counts, onChange }: ReviewFilterBarProps) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={(next) => onChange(parseReviewFilterOption(next))}
      aria-label="Tampilkan soal"
      orientation="horizontal"
      loop
      className="flex flex-wrap gap-2"
    >
      {REVIEW_FILTERS.map((filter) => (
        <RadioGroupPrimitive.Item
          key={filter.value}
          value={filter.value}
          className="press-3d inline-flex h-11 items-center gap-2 rounded-xl border-solid border-play-line bg-white px-3 text-base font-extrabold text-play-ink-muted transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink data-[state=checked]:border-play-blue data-[state=checked]:border-b-play-blue-strong data-[state=checked]:bg-play-blue-soft data-[state=checked]:text-play-blue-ink sm:px-4"
        >
          <span className="sm:hidden">{filter.shortLabel}</span>
          <span className="max-sm:hidden">{filter.label}</span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-sm tabular-nums">
            {counts[filter.value]}
          </span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
