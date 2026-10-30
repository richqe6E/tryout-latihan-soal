"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { PlayButton } from "@/components/ui/play-button";
import { ArrowLeft, Bell, ListOrdered, Timer } from "lucide-react";
import type { UserSettings } from "@/lib/tryout/types";
import { ChipRadioGroup } from "./chip-radio-group";
import { ReminderControl } from "./reminder-control";
import { DURATION_MINUTE_OPTIONS, QUESTION_COUNT_OPTIONS } from "./settings-options";
import { SettingsSection } from "./settings-section";
import { validateSessionSize } from "@/lib/tryout/limits";
import { saveSettingsAction } from "@/server/actions/settings-actions";

/** "1 menit 30 detik" — rata-rata waktu per soal. */
function formatPerQuestion(seconds: number) {
  const rounded = Math.round(seconds / 15) * 15;
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (minutes === 0) return `${rest} detik`;
  return rest === 0 ? `${minutes} menit` : `${minutes} menit ${rest} detik`;
}

/** Pengaturan tryout: jumlah soal, durasi, dan pengingat belajar. */
export function SettingsScreen({ settings }: { settings: UserSettings }) {
  // Draf perubahan; disimpan lewat tombol Simpan.
  const [saved, setSaved] = useState<UserSettings>(settings);
  const [draft, setDraft] = useState<UserSettings>(settings);
  const [saving, setSaving] = useState(false);
  const update = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const dirty = (Object.keys(draft) as (keyof UserSettings)[]).some((key) => draft[key] !== saved[key]);
  // Aturan yang sama dengan server: batas jumlah soal & durasi, minimal 30 detik per soal.
  const sizeErrors = validateSessionSize({
    questionCount: draft.defaultQuestionCount,
    durationSeconds: draft.defaultDurationSeconds,
  });
  const sizeError = sizeErrors.questionCount ?? sizeErrors.durationSeconds;

  // Cegah perubahan hilang tanpa sengaja saat menutup/me-reload tab.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const save = async () => {
    setSaving(true);
    try {
      const result = await saveSettingsAction(draft);
      if (!result.ok) {
        toast.error("Pengaturan belum disimpan", { description: result.message });
        return;
      }
      setSaved(result.data);
      setDraft(result.data);
      toast.success("Pengaturan disimpan", {
        description: "Berlaku untuk tryout berikutnya yang kamu mulai.",
      });
    } catch {
      toast.error("Gagal menyimpan pengaturan", { description: "Coba lagi sebentar lagi." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white text-play-ink">
      <header className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pt-4 md:px-8 md:pt-6">
        <Link
          href="/akun"
          aria-label="Kembali ke akun"
          className="inline-flex size-12 items-center justify-center rounded-lg text-play-ink-muted transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-6" />
        </Link>
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Pengaturan</h1>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-4 pb-12 md:px-8">
        <SettingsSection
          id="question-count"
          icon={ListOrdered}
          tone="bg-play-blue-soft text-play-blue-ink"
          title="Jumlah soal"
          description="Banyak soal di setiap tryout baru."
        >
          <ChipRadioGroup
            value={draft.defaultQuestionCount}
            options={QUESTION_COUNT_OPTIONS}
            onChange={(value) => update("defaultQuestionCount", value)}
            labelledBy="question-count-title"
            describedBy="question-count-desc"
          />
          <p className="text-sm font-bold text-play-ink-muted">
            Tryout baru akan berisi {draft.defaultQuestionCount} soal (atau semua soal yang tersedia jika bank
            soalnya lebih sedikit).
          </p>
        </SettingsSection>

        <SettingsSection
          id="duration"
          icon={Timer}
          tone="bg-play-gold-soft text-play-gold-ink"
          title="Durasi ujian"
          description="Lama waktu pengerjaan sebelum jawaban dikumpulkan otomatis."
        >
          <ChipRadioGroup
            value={Math.round(draft.defaultDurationSeconds / 60)}
            options={DURATION_MINUTE_OPTIONS}
            onChange={(minutes) => update("defaultDurationSeconds", minutes * 60)}
            labelledBy="duration-title"
            describedBy="duration-desc"
            columns="grid-cols-3 sm:grid-cols-6"
          />
          <p className="text-sm font-bold text-play-ink-muted">
            Sekitar {formatPerQuestion(draft.defaultDurationSeconds / draft.defaultQuestionCount)} per soal
            untuk {draft.defaultQuestionCount} soal.
          </p>
        </SettingsSection>

        <SettingsSection
          id="reminder"
          icon={Bell}
          tone="bg-play-green-soft text-play-green-ink"
          title="Pengingat belajar"
          description="Notifikasi harian supaya latihanmu konsisten."
        >
          <ReminderControl
            enabled={draft.reminderEnabled}
            time={draft.reminderTime}
            onEnabledChange={(enabled) => update("reminderEnabled", enabled)}
            onTimeChange={(time) => update("reminderTime", time)}
          />
        </SettingsSection>
      </main>

      {dirty ? (
        <div
          role="region"
          aria-label="Simpan perubahan"
          className="sticky bottom-0 z-20 animate-drop border-t-2 border-play-line bg-white"
        >
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-8 md:py-4">
            <p
              aria-live="polite"
              className={sizeError ? "font-bold text-play-red-ink" : "font-bold text-play-ink-muted"}
            >
              {sizeError ?? "Ada perubahan yang belum disimpan."}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <PlayButton size="sm" disabled={saving} onClick={() => setDraft(saved)}>
                Batalkan
              </PlayButton>
              <PlayButton
                size="sm"
                tone="green"
                disabled={saving || Boolean(sizeError)}
                onClick={save}
                className="sm:min-w-32"
              >
                {saving ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
                {saving ? "Menyimpan…" : "Simpan"}
              </PlayButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
