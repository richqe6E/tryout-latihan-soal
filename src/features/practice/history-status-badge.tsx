import { CircleCheck, Pause, Play } from "lucide-react";
import { cn } from "cn";

export type HistoryStatus = "berjalan" | "dijeda" | "selesai";

const STATUS = {
  berjalan: { label: "Berjalan", icon: Play, tone: "bg-play-blue-soft text-play-blue-ink" },
  dijeda: { label: "Dijeda", icon: Pause, tone: "bg-play-gold-soft text-play-gold-ink" },
  selesai: { label: "Selesai", icon: CircleCheck, tone: "bg-play-green-soft text-play-green-ink" },
} as const;

/** Badge status sesi di riwayat: ikon + teks, tidak hanya warna. */
export function HistoryStatusBadge({ status }: { status: HistoryStatus }) {
  const { label, icon: Icon, tone } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black",
        tone,
      )}
    >
      <Icon aria-hidden="true" className={cn("size-3", status !== "selesai" && "fill-current")} />
      {label}
    </span>
  );
}
