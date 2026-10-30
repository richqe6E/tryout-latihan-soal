import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

type SettingsSectionProps = {
  id: string;
  icon: LucideIcon;
  tone: string;
  title: string;
  description: string;
  children: ReactNode;
};

/** Satu kelompok pengaturan: ikon, judul, penjelasan singkat, lalu kontrolnya. */
export function SettingsSection({
  id,
  icon: Icon,
  tone,
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-4 rounded-2xl border-2 border-play-line p-5"
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-2xl", tone)}
        >
          <Icon className="size-6" strokeWidth={2.5} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={`${id}-title`} className="text-xl font-black">
            {title}
          </h2>
          <p id={`${id}-desc`} className="font-bold text-play-ink-muted">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}
