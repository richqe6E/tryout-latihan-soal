import { BookA, Calculator, FlaskConical, Languages, type LucideIcon } from "lucide-react";
import { cn } from "cn";

const SUBJECT_ICON: Record<string, { icon: LucideIcon; tone: string }> = {
  matematika: { icon: Calculator, tone: "bg-play-blue-soft text-play-blue-ink" },
  "bahasa-indonesia": { icon: BookA, tone: "bg-play-red-soft text-play-red-ink" },
  "bahasa-inggris": { icon: Languages, tone: "bg-play-gold-soft text-play-gold-ink" },
  ipa: { icon: FlaskConical, tone: "bg-play-green-soft text-play-green-ink" },
};

/** Ikon mata pelajaran; `tile` menampilkannya dalam kotak berwarna. */
export function SubjectIcon({
  subjectId,
  tile = false,
  className,
}: {
  subjectId: string;
  tile?: boolean;
  className?: string;
}) {
  const entry = SUBJECT_ICON[subjectId] ?? SUBJECT_ICON.matematika;
  const Icon = entry.icon;
  if (!tile) return <Icon aria-hidden="true" className={cn("size-4", className)} />;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-14 shrink-0 items-center justify-center rounded-2xl",
        entry.tone,
        className,
      )}
    >
      <Icon className="size-7" strokeWidth={2.5} />
    </span>
  );
}
