"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Keyboard, Send, X } from "lucide-react";
import { toast } from "sonner";
import { PlayButton } from "@/components/ui/play-button";
import { TimeWarningBanner } from "@/features/timer/time-warning-banner";
import { TimerChip } from "@/features/timer/timer-chip";
import { getTimerLevel } from "@/features/timer/timer-level";
import { useCountdown } from "@/features/timer/use-countdown";
import { useCountdownTitle } from "@/features/timer/use-countdown-title";
import { useServerClock } from "@/features/timer/use-server-clock";
import {
  clearPersistentDeadline,
  resumePersistentDeadline,
  usePersistentDeadline,
} from "@/features/timer/use-persistent-deadline";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { AnswerState, TryoutSession } from "@/lib/tryout/types";
import { countAnswers, getOptionLetter, getQuestionStatus } from "./answer-status";
import { FlagToggle } from "./flag-toggle";
import { NumberPanel } from "./number-panel";
import { OptionList } from "./option-list";
import { QuestionView } from "./question-view";
import { StatusBadge } from "./status-badge";
import { submitTryout, type SubmitReason } from "./mock-api";
import { TimeUpOverlay } from "./time-up-overlay";
import { SubmitDialog } from "./submit-dialog";
import { TryoutFooter } from "./tryout-footer";
import { ExitDialog } from "./exit-dialog";
import { clearProgress, readProgress, writeProgress, type SavedProgress } from "./progress-store";
import { TryoutTopBar } from "./tryout-top-bar";
import { SaveStatusText } from "./save-status";
import { useOptionShortcuts } from "./use-option-shortcuts";
import { useServerAutosave } from "./use-server-autosave";
import { pauseTryoutAction, resumeTryoutAction, submitTryoutAction } from "@/server/actions/tryout-actions";

/** Lanjutkan dari soal terakhir yang dibuka, atau soal pertama yang belum dijawab. */
function getInitialIndex(session: TryoutSession, saved: SavedProgress | null) {
  if (saved) return Math.min(Math.max(saved.lastIndex, 0), session.questions.length - 1);
  if (session.lastOrderNumber) {
    return Math.min(Math.max(session.lastOrderNumber - 1, 0), session.questions.length - 1);
  }
  const index = session.questions.findIndex((item) => !session.answers[item.id]?.selectedOptionId);
  return index === -1 ? 0 : index;
}

type TryoutScreenProps = {
  session: TryoutSession;
  /** Progres tersimpan di perangkat (jika tryout ini pernah dijeda/ditinggal). */
  saved: SavedProgress | null;
};

const TIMEOUT_RETRY_MS = 5000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function TryoutScreen({ session, saved }: TryoutScreenProps) {
  // Sesi dari database disimpan ke server; sesi tiruan disimpan di perangkat.
  const serverBacked = UUID_PATTERN.test(session.id);
  const [currentIndex, setCurrentIndex] = useState(() => getInitialIndex(session, saved));
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => ({
    ...session.answers,
    ...saved?.answers,
  }));
  const [exitOpen, setExitOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const router = useRouter();
  // Sesi tiruan: deadline disimpan di perangkat. Sesi database: jam server yang berlaku.
  const localDeadline = usePersistentDeadline(session.id, session.deadline, session.startedAt);
  const serverClock = useServerClock(session.id, serverBacked, session.deadline);
  const deadline = serverBacked ? serverClock.deadline : localDeadline;
  const pausedRef = useRef(false);
  const remaining = useCountdown(deadline, submitting, serverBacked ? serverClock.offsetMs : 0);
  useCountdownTitle(remaining);
  const autosave = useServerAutosave({
    enabled: serverBacked && !submitting,
    sessionId: session.id,
    questions: session.questions,
    answers,
    currentIndex,
  });

  const total = session.questions.length;
  const question = session.questions[currentIndex];
  const counts = countAnswers(session.questions, answers);
  const currentAnswer = answers[question.id];
  const selectedOptionId = currentAnswer?.selectedOptionId ?? null;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  // Saat pindah soal di layar kecil, bawa pengguna kembali ke awal soal.
  const hasNavigated = useRef(false);
  useEffect(() => {
    if (!hasNavigated.current) {
      hasNavigated.current = true;
      return;
    }
    if (window.scrollY > 0) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }, [currentIndex]);

  const goTo = (index: number) => {
    setCurrentIndex(Math.min(Math.max(index, 0), total - 1));
  };

  const buildProgress = (pausedRemaining: number | null): SavedProgress => ({
    sessionId: session.id,
    title: session.title,
    subjectId: session.subject.id,
    subjectName: session.subject.name,
    difficulty: session.difficulty,
    totalQuestions: total,
    answers,
    lastIndex: currentIndex,
    pausedRemaining,
    savedAt: new Date().toISOString(),
  });

  // Setiap layar ini tampil (pertama kali, atau kembali dari halaman lain), lanjutkan sesi
  // yang dijeda: timer mulai lagi dari sisa waktu saat dijeda.
  const resumeIfPaused = useEffectEvent(async () => {
    pausedRef.current = false;
    if (serverBacked) {
      // Sesi database: server menetapkan batas waktu baru dari sisa waktu saat dijeda.
      const sentAt = Date.now();
      const result = await resumeTryoutAction(session.id);
      if (result.ok) serverClock.apply(result.data, sentAt, Date.now());
      return;
    }
    const stored = readProgress(session.id);
    if (stored?.pausedRemaining != null) {
      resumePersistentDeadline(session.id, stored.pausedRemaining, session.deadline);
    }
    if (!submittingRef.current) writeProgress(buildProgress(null));
  });
  useEffect(() => {
    void resumeIfPaused();
  }, [session.id]);

  // Simpan otomatis setiap ada perubahan jawaban/posisi soal.
  const persist = useEffectEvent(() => {
    if (serverBacked) return;
    if (!submittingRef.current && !pausedRef.current) writeProgress(buildProgress(null));
  });
  useEffect(() => {
    persist();
  }, [answers, currentIndex]);

  /** Jeda: simpan jawaban + sisa waktu, hentikan timer, lalu keluar. */
  const [pausing, setPausing] = useState(false);
  const pauseAndExit = async () => {
    pausedRef.current = true; // cegah autosave/auto-submit selama berpindah halaman
    if (serverBacked) {
      setPausing(true);
      const result = await pauseTryoutAction({
        sessionId: session.id,
        lastOrderNumber: currentIndex + 1,
        answers,
      });
      setPausing(false);
      if (!result.ok) {
        pausedRef.current = false;
        toast.error("Gagal menjeda tryout", {
          description: "Timer masih berjalan. Periksa koneksi lalu coba lagi.",
        });
        return;
      }
    } else {
      writeProgress(buildProgress(remaining));
      clearPersistentDeadline(session.id);
    }
    setExitOpen(false);
    router.push("/riwayat");
  };

  const selectAnswer = useCallback(
    (optionId: string) => {
      setAnswers((prev) => {
        const previous = prev[question.id];
        if (previous?.selectedOptionId === optionId) return prev;
        return {
          ...prev,
          [question.id]: { selectedOptionId: optionId, isFlagged: previous?.isFlagged ?? false },
        };
      });
    },
    [question.id],
  );

  const reviewFirst = (kind: "empty" | "flagged") => {
    const index = session.questions.findIndex((item) =>
      kind === "empty" ? !answers[item.id]?.selectedOptionId : answers[item.id]?.isFlagged,
    );
    setSubmitOpen(false);
    if (index >= 0) goTo(index);
  };

  const submit = async (reason: SubmitReason) => {
    if (submittingRef.current || pausedRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitOpen(false);
    setPanelOpen(false);
    try {
      if (serverBacked) {
        // Nilai dihitung di server; kirim snapshot jawaban terakhir sekaligus.
        const result = await submitTryoutAction({ sessionId: session.id, reason, answers });
        if (!result.ok) throw new Error(result.message);
      } else {
        const usedSeconds = session.durationSeconds - (remaining ?? 0);
        await submitTryout(session.id, total, answers, reason, usedSeconds);
      }
      clearPersistentDeadline(session.id);
      clearProgress(session.id);
      // Biarkan status "Mengumpulkan…" tampil sampai halaman hasil terbuka.
      router.replace(
        reason === "timeout"
          ? `/tryout/${session.id}/hasil?alasan=waktu-habis`
          : `/tryout/${session.id}/hasil`,
      );
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
      if (reason === "timeout") {
        // Waktu habis tapi gagal terkirim (mis. offline): coba lagi otomatis.
        toast.error("Gagal mengumpulkan jawaban", {
          id: "timeout-submit",
          description: "Kami coba kirim lagi otomatis begitu koneksi kembali.",
        });
        setTimeoutRetries((count) => count + 1);
        return;
      }
      toast.error("Gagal mengumpulkan jawaban", {
        description: "Periksa koneksi lalu coba lagi.",
        action: { label: "Coba lagi", onClick: () => void submit(reason) },
      });
    }
  };

  // Waktu habis → kumpulkan otomatis, apa pun yang sedang terbuka.
  const timeUp = remaining === 0;
  const onTimeUp = useEffectEvent(() => {
    void submit("timeout");
  });
  useEffect(() => {
    if (remaining === 0) onTimeUp();
  }, [remaining]);

  // Pengumpulan otomatis yang gagal dicoba ulang berkala dan saat perangkat kembali online.
  const [timeoutRetries, setTimeoutRetries] = useState(0);
  useEffect(() => {
    if (timeoutRetries === 0) return;
    const id = window.setTimeout(() => onTimeUp(), TIMEOUT_RETRY_MS);
    const onOnline = () => onTimeUp();
    window.addEventListener("online", onOnline);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("online", onOnline);
    };
  }, [timeoutRetries]);

  // Server sudah menutup sesi (waktu habis saat perangkat tidur, atau dikumpulkan di tab lain):
  // hentikan pengerjaan dan buka hasilnya.
  const closedByServer = serverBacked && (serverClock.finished || autosave.closed);
  const onClosedByServer = useEffectEvent(() => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    clearProgress(session.id);
    toast.info("Tryout ini sudah dikumpulkan", { description: "Membuka hasilnya…" });
    router.replace(`/tryout/${session.id}/hasil`);
  });
  useEffect(() => {
    if (closedByServer) onClosedByServer();
  }, [closedByServer]);

  const toggleFlag = () => {
    setAnswers((prev) => {
      const previous = prev[question.id];
      return {
        ...prev,
        [question.id]: {
          selectedOptionId: previous?.selectedOptionId ?? null,
          isFlagged: !previous?.isFlagged,
        },
      };
    });
  };

  const pickByIndex = useCallback(
    (index: number) => {
      const option = question.options[index];
      if (option) selectAnswer(option.id);
    },
    [question.options, selectAnswer],
  );

  useOptionShortcuts(!submitOpen && !panelOpen && !exitOpen, question.options.length, pickByIndex);

  return (
    <div className="flex min-h-dvh flex-col bg-white text-play-ink">
      <TryoutTopBar
        answered={counts.answered}
        total={total}
        onOpenPanel={() => setPanelOpen(true)}
        trailing={<TimerChip remaining={remaining} />}
        leading={
          <button
            type="button"
            onClick={() => setExitOpen(true)}
            aria-label="Keluar dari tryout"
            aria-haspopup="dialog"
            className="inline-flex size-12 items-center justify-center rounded-lg text-play-ink-muted transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
          >
            <X aria-hidden="true" className="size-7" />
          </button>
        }
      />

      <TimeWarningBanner level={getTimerLevel(remaining)} />

      <main className="mx-auto grid w-full max-w-[1080px] flex-1 items-start gap-8 px-4 pt-4 pb-8 md:px-8 md:pt-6 md:pb-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        <QuestionView
          key={question.id}
          question={question}
          total={total}
          subjectId={session.subject.id}
          subjectName={session.subject.name}
          difficulty={session.difficulty}
          badges={
            <StatusBadge
              status={getQuestionStatus(currentAnswer)}
              letter={getOptionLetter(question, selectedOptionId)}
            />
          }
          footnote={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="hidden items-center gap-2 text-sm font-bold text-play-ink-muted md:flex">
                <Keyboard aria-hidden="true" className="size-4" />
                Tip: tekan A–E atau 1–5 di keyboard untuk memilih jawaban
              </p>
              {serverBacked ? <SaveStatusText status={autosave.status} onRetry={autosave.retry} /> : null}
            </div>
          }
        >
          <OptionList question={question} selectedOptionId={selectedOptionId} onSelect={selectAnswer} />
        </QuestionView>

        <NumberPanel
          questions={session.questions}
          answers={answers}
          currentIndex={currentIndex}
          onSelect={goTo}
          className="hidden lg:sticky lg:top-28 lg:flex"
          action={
            <PlayButton tone="blue" block onClick={() => setSubmitOpen(true)}>
              <Send aria-hidden="true" />
              Kumpulkan
            </PlayButton>
          }
        />
      </main>

      <TryoutFooter
        start={
          <>
            <PlayButton
              aria-label="Soal sebelumnya"
              disabled={isFirst}
              onClick={() => goTo(currentIndex - 1)}
              className="max-sm:w-[52px] max-sm:px-0"
            >
              <ArrowLeft aria-hidden="true" />
              <span className="max-sm:hidden">Sebelumnya</span>
            </PlayButton>
            <FlagToggle pressed={Boolean(currentAnswer?.isFlagged)} onToggle={toggleFlag} />
          </>
        }
        end={
          isLast ? (
            <PlayButton
              tone="green"
              onClick={() => setSubmitOpen(true)}
              className="min-w-0 flex-1 sm:min-w-40 sm:flex-none"
            >
              <span>Selesai</span>
              <Check aria-hidden="true" className="max-sm:hidden" />
            </PlayButton>
          ) : (
            <PlayButton
              tone="green"
              aria-label="Soal berikutnya"
              onClick={() => goTo(currentIndex + 1)}
              className="min-w-0 flex-1 sm:min-w-40 sm:flex-none"
            >
              <span>Lanjut</span>
              <ArrowRight aria-hidden="true" className="max-sm:hidden" />
            </PlayButton>
          )
        }
      />

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent
          side="bottom"
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            // Fokus ke nomor soal yang sedang dibuka, bukan nomor 1.
            const current = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(
              "[data-current]",
            );
            if (current) {
              event.preventDefault();
              current.focus();
            }
          }}
          className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-3xl border-t-2 border-play-line bg-white p-0 pb-[env(safe-area-inset-bottom)] shadow-none"
        >
          <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-play-line" />
          <SheetDescription className="sr-only">Pilih nomor untuk membuka soal.</SheetDescription>
          <NumberPanel
            questions={session.questions}
            answers={answers}
            currentIndex={currentIndex}
            onSelect={(index) => {
              goTo(index);
              setPanelOpen(false);
            }}
            className="rounded-none border-0 pt-8"
            showTooltips={false}
            renderTitle={(props) => <SheetTitle {...props} />}
            action={
              <PlayButton
                tone="blue"
                block
                onClick={() => {
                  setPanelOpen(false);
                  setSubmitOpen(true);
                }}
              >
                <Send aria-hidden="true" />
                Kumpulkan
              </PlayButton>
            }
          />
        </SheetContent>
      </Sheet>

      {timeUp ? <TimeUpOverlay /> : null}

      <ExitDialog
        open={exitOpen}
        onOpenChange={(open) => {
          if (!pausing) setExitOpen(open);
        }}
        onExit={() => void pauseAndExit()}
        pending={pausing}
      />

      <SubmitDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        counts={counts}
        onReview={reviewFirst}
        onConfirm={() => void submit("manual")}
        submitting={submitting}
      />
    </div>
  );
}
