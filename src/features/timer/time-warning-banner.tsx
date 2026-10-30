import { Hourglass } from "lucide-react";
import type { TimerLevel } from "./timer-level";

/**
 * Banner peringatan waktu. Wadahnya selalu ada (aria-live) supaya pembaca layar
 * mengumumkan pesan saat level berubah.
 */
export function TimeWarningBanner({ level }: { level: TimerLevel }) {
  return (
    <div aria-live="polite" className="mx-auto w-full max-w-[1080px] px-4 md:px-8">
      {level !== "normal" ? (
        <p
          key={level}
          className="flex animate-drop items-center gap-3 rounded-2xl border-2 border-play-red bg-play-red-soft px-4 py-3 text-base leading-snug font-extrabold text-play-red-ink"
        >
          <Hourglass aria-hidden="true" className="size-6 shrink-0" />
          {level === "critical"
            ? "Waktu tinggal kurang dari 1 menit! Jawabanmu akan dikumpulkan otomatis saat waktu habis."
            : "Waktu tinggal kurang dari 5 menit! Cek lagi soal yang kosong atau ragu-ragu."}
        </p>
      ) : null}
    </div>
  );
}
