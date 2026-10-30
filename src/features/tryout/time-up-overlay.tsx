import { LoaderCircle } from "lucide-react";
import { Mascot } from "@/components/mascot";

/** Layar penutup saat waktu habis, selagi jawaban dikumpulkan otomatis. */
export function TimeUpOverlay() {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="time-up-title"
      aria-describedby="time-up-desc"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-white/95 px-6 text-center"
    >
      <Mascot mood="worried" className="size-28 animate-bounce-in" />
      <h2 id="time-up-title" className="text-3xl font-black text-play-red-ink">
        Waktu habis!
      </h2>
      <p id="time-up-desc" className="flex items-center gap-2 text-lg font-bold text-play-ink-muted">
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
        Jawabanmu sedang dikumpulkan otomatis…
      </p>
    </div>
  );
}
