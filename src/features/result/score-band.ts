export type ScoreBand = {
  label: string;
  /** Warna cincin (CSS color). */
  ring: string;
  /** Kelas teks predikat. */
  text: string;
  chip: string;
};

/** Predikat nilai untuk memberi semangat sesuai rentang skor. */
export function getScoreBand(score: number): ScoreBand {
  if (score >= 80)
    return {
      label: "Luar biasa!",
      ring: "var(--color-play-green)",
      text: "text-play-green-ink",
      chip: "bg-play-green-soft text-play-green-ink",
    };
  if (score >= 60)
    return {
      label: "Bagus!",
      ring: "var(--color-play-blue)",
      text: "text-play-blue-ink",
      chip: "bg-play-blue-soft text-play-blue-ink",
    };
  if (score >= 40)
    return {
      label: "Lumayan!",
      ring: "var(--color-play-gold)",
      text: "text-play-gold-ink",
      chip: "bg-play-gold-soft text-play-gold-ink",
    };
  return {
    label: "Ayo coba lagi!",
    ring: "var(--color-play-red)",
    text: "text-play-red-ink",
    chip: "bg-play-red-soft text-play-red-ink",
  };
}
