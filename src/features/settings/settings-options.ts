import type { ChipOption } from "./chip-radio-group";

/** Pilihan jumlah soal per sesi. */
export const QUESTION_COUNT_OPTIONS: ChipOption[] = [
  { value: 5, label: "5", caption: "Kilat" },
  { value: 10, label: "10", caption: "Standar" },
  { value: 20, label: "20", caption: "Serius" },
  { value: 30, label: "30", caption: "Simulasi" },
];

/** Pilihan durasi ujian (menit). */
export const DURATION_MINUTE_OPTIONS: ChipOption[] = [15, 30, 45, 60, 90, 120].map((minutes) => ({
  value: minutes,
  label: String(minutes),
  caption: "menit",
}));
