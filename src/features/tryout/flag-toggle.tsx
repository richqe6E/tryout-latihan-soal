import { Flag } from "lucide-react";
import { PlayButton } from "@/components/ui/play-button";

/** Tandai soal untuk dicek ulang nanti; tidak mengubah jawaban yang sudah dipilih. */
export function FlagToggle({ pressed, onToggle }: { pressed: boolean; onToggle: () => void }) {
  return (
    <PlayButton
      aria-pressed={pressed}
      onClick={onToggle}
      className="max-sm:px-4"
      title={pressed ? "Hapus tanda ragu-ragu" : "Tandai soal ini untuk dicek ulang"}
    >
      <Flag aria-hidden="true" className={pressed ? "fill-current" : undefined} />
      <span>
        Ragu<span className="max-sm:hidden">-ragu</span>
      </span>
    </PlayButton>
  );
}
