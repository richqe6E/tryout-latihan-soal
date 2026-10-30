import { Check, Minus, X } from "lucide-react";
import type { QuestionOutcome } from "@/lib/tryout/types";

/** Gaya & label tiap hasil soal; dipakai di hasil dan pembahasan. */
export const OUTCOME_STYLE: Record<
  QuestionOutcome,
  { label: string; chip: string; tile: string; icon: typeof Check }
> = {
  benar: {
    label: "Benar",
    chip: "bg-play-green-soft text-play-green-ink",
    tile: "border-play-green bg-play-green-soft text-play-green-ink",
    icon: Check,
  },
  salah: {
    label: "Salah",
    chip: "bg-play-red-soft text-play-red-ink",
    tile: "border-play-red bg-play-red-soft text-play-red-ink",
    icon: X,
  },
  kosong: {
    label: "Belum dijawab",
    chip: "bg-play-polar text-play-ink-muted",
    tile: "border-play-line bg-play-polar text-play-ink-muted",
    icon: Minus,
  },
};
