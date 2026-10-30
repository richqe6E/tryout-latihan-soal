import { CircleCheck, CircleDashed, Flag } from "lucide-react";
import { cn } from "cn";
import { STATUS_LABEL, type QuestionStatus } from "./answer-status";

const BADGE_TONE: Record<QuestionStatus, string> = {
  answered: "bg-play-green-soft text-play-green-ink",
  flagged: "bg-play-gold-soft text-play-gold-ink",
  empty: "bg-play-polar text-play-ink-muted",
};

const BADGE_ICON = {
  answered: CircleCheck,
  flagged: Flag,
  empty: CircleDashed,
} satisfies Record<QuestionStatus, unknown>;

/** Chip status soal yang sedang dibuka: terjawab, ragu-ragu, atau belum dijawab. */
export function StatusBadge({ status, letter }: { status: QuestionStatus; letter?: string | null }) {
  const Icon = BADGE_ICON[status];
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-extrabold",
        BADGE_TONE[status],
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {STATUS_LABEL[status]}
      {letter ? <span>· {letter}</span> : null}
    </p>
  );
}
