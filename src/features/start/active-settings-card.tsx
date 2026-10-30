import Link from "next/link";
import { ListOrdered, Settings2, Timer } from "lucide-react";

type ActiveSettingsCardProps = {
  questionCount: number;
  durationMinutes: number;
  /** Jumlah soal yang benar-benar dipakai (dibatasi bank soal). */
  effectiveCount: number | null;
};

/** Ringkasan pengaturan yang berlaku untuk tryout baru, dengan tautan untuk mengubahnya. */
export function ActiveSettingsCard({
  questionCount,
  durationMinutes,
  effectiveCount,
}: ActiveSettingsCardProps) {
  const limited = effectiveCount !== null && effectiveCount < questionCount;
  return (
    <section
      aria-labelledby="active-settings-title"
      className="flex flex-col gap-3 rounded-2xl border-2 border-play-line bg-play-polar p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="active-settings-title"
          className="text-sm font-black tracking-[0.06em] text-play-ink-muted uppercase"
        >
          Pengaturan aktif
        </h2>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-lg font-black">
          <span className="inline-flex items-center gap-1.5">
            <ListOrdered aria-hidden="true" className="size-5 text-play-blue-ink" />
            {questionCount} soal
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Timer aria-hidden="true" className="size-5 text-play-gold-ink" />
            {durationMinutes} menit
          </span>
        </p>
        {limited ? (
          <p className="text-sm font-bold text-play-ink-muted">
            Bank soal pilihan ini baru {effectiveCount} soal, jadi tryout berisi {effectiveCount} soal.
          </p>
        ) : null}
      </div>
      <Link
        href="/pengaturan"
        className="inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 font-black text-play-blue-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink sm:self-center"
      >
        <Settings2 aria-hidden="true" className="size-4" />
        Ubah pengaturan
      </Link>
    </section>
  );
}
