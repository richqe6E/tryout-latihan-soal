"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { toast } from "sonner";
import { PlayButton } from "@/components/ui/play-button";
import { startTryoutAction } from "@/server/actions/tryout-actions";
import { announceLimitedSession } from "./limited-session-notice";
import { DIFFICULTY_LABEL, type Difficulty, type UserSettings } from "@/lib/tryout/types";
import { ActiveSettingsCard } from "./active-settings-card";
import { DIFFICULTIES, DifficultyPicker } from "./difficulty-picker";
import { LimitedQuestionsNotice } from "./limited-questions-notice";
import { SubjectCard, type SubjectOption } from "./subject-card";

/** Pilih mata pelajaran dan tingkat kesulitan sebelum memulai tryout. */
export function StartScreen({ subjects, settings }: { subjects: SubjectOption[]; settings: UserSettings }) {
  const router = useRouter();
  const active = settings;
  const durationMinutes = Math.round(active.defaultDurationSeconds / 60);
  const [subjectId, setSubjectId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty>("sedang");
  const [starting, startTransition] = useTransition();

  const subject = subjects.find((item) => item.id === subjectId);
  const available = subject ? subject.counts[difficulty] : 0;
  const questionCount = Math.min(active.defaultQuestionCount, available);

  const start = () => {
    if (!subject || available === 0) return;
    startTransition(async () => {
      const result = await startTryoutAction({
        subjectSlug: subject.id,
        difficulty,
        questionCount,
        durationSeconds: durationMinutes * 60,
      });
      if (!result.ok) {
        toast.error("Tryout belum bisa dimulai", { description: result.message });
        return;
      }
      announceLimitedSession(result.data);
      router.push(`/tryout/${result.data.sessionId}`);
    });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white text-play-ink">
      <header className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 pt-4 md:px-8 md:pt-6">
        <Link
          href="/"
          aria-label="Kembali ke beranda"
          className="inline-flex size-12 items-center justify-center rounded-lg text-play-ink-muted transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-6" />
        </Link>
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Mulai tryout baru</h1>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pt-4 pb-8 md:px-8">
        <ActiveSettingsCard
          questionCount={active.defaultQuestionCount}
          durationMinutes={durationMinutes}
          effectiveCount={subject && available > 0 ? questionCount : null}
        />

        <section aria-labelledby="subject-title" className="flex flex-col gap-3">
          <h2 id="subject-title" className="text-xl font-black">
            Pilih mata pelajaran
          </h2>
          <RadioGroupPrimitive.Root
            value={subjectId}
            onValueChange={(id) => {
              setSubjectId(id);
              const counts = subjects.find((item) => item.id === id)?.counts;
              if (counts && counts[difficulty] === 0) {
                const firstAvailable = DIFFICULTIES.find((level) => counts[level] > 0);
                if (firstAvailable) setDifficulty(firstAvailable);
              }
            }}
            aria-labelledby="subject-title"
            className="grid gap-3 sm:grid-cols-2"
          >
            {subjects.map((item) => (
              <SubjectCard key={item.id} subject={item} />
            ))}
          </RadioGroupPrimitive.Root>
        </section>

        <section aria-labelledby="difficulty-title" className="flex flex-col gap-3">
          <h2 id="difficulty-title" className="text-xl font-black">
            Pilih tingkat kesulitan
          </h2>
          <DifficultyPicker
            value={difficulty}
            onChange={setDifficulty}
            counts={subject?.counts}
            labelledBy="difficulty-title"
          />
          {subject ? (
            <LimitedQuestionsNotice
              subjectName={subject.name}
              difficulty={difficulty}
              counts={subject.counts}
              onPick={setDifficulty}
            />
          ) : null}
        </section>
      </main>

      <footer className="sticky bottom-0 z-20 border-t-2 border-play-line bg-white">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-8 md:py-5">
          <p aria-live="polite" className="text-base font-bold text-play-ink-muted">
            {!subject
              ? "Pilih mata pelajaran dulu, ya."
              : available === 0
                ? `Soal ${subject.name} tingkat ${DIFFICULTY_LABEL[difficulty].toLowerCase()} belum tersedia.`
                : `${subject.name} · ${DIFFICULTY_LABEL[difficulty]} · ${questionCount} soal · ${durationMinutes} menit`}
          </p>
          <PlayButton
            tone="green"
            disabled={!subject || available === 0 || starting}
            onClick={start}
            className="sm:min-w-48"
          >
            {starting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            {starting ? "Menyiapkan…" : "Mulai tryout"}
          </PlayButton>
        </div>
      </footer>
    </div>
  );
}
