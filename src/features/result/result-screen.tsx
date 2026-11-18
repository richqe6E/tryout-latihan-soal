"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { startTryoutAction } from "@/server/actions/tryout-actions";
import { announceLimitedSession } from "@/features/start/limited-session-notice";
import {
  BookOpen,
  ChartLine,
  CircleCheck,
  FileText,
  Gauge,
  ListOrdered,
  RotateCcw,
  Shuffle,
  Target,
  Timer,
} from "lucide-react";
import { cn } from "cn";
import { Mascot } from "@/components/mascot";
import { SubjectIcon } from "@/components/subject-icon";
import { PlayButton } from "@/components/ui/play-button";
import { TimeoutNotice } from "@/features/timer/timeout-notice";
import { formatClock } from "@/lib/format";
import { gradeAnswers, isQuestionAnswered } from "@/lib/tryout/grading";
import { DIFFICULTY_LABEL, type TryoutReview } from "@/lib/tryout/types";
import { ScoreBreakdown } from "./score-breakdown";
import { ScoreComparison } from "./score-comparison";
import { ScoreHero } from "./score-hero";
import { useSubmittedAnswers } from "./use-submitted-answers";

type ResultScreenProps = {
  review: TryoutReview;
  timedOut: boolean;
};

const STAT_TONE = {
  green: "border-play-green bg-play-green-soft text-play-green-ink",
  gold: "border-play-gold bg-play-gold-soft text-play-gold-ink",
  blue: "border-play-blue bg-play-blue-soft text-play-blue-ink",
} as const;

function StatCard({
  tone,
  label,
  value,
  icon: Icon,
}: {
  tone: keyof typeof STAT_TONE;
  label: string;
  value: string | number;
  icon: typeof CircleCheck;
}) {
  return (
    <li className={cn("flex flex-col overflow-hidden rounded-2xl border-2", STAT_TONE[tone])}>
      <p className="py-1.5 text-center text-xs font-black tracking-[0.06em] uppercase">{label}</p>
      <p className="m-0.5 mt-0 flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-xl font-black tabular-nums sm:text-2xl">
        <Icon aria-hidden="true" className="size-4 shrink-0 max-[359px]:hidden sm:size-5" />
        {value}
      </p>
    </li>
  );
}

export function ResultScreen({ review, timedOut }: ResultScreenProps) {
  const { ready, submission } = useSubmittedAnswers(review.sessionId);
  const answers = submission?.answers ?? review.answers;
  const result = gradeAnswers(review.questions, answers);
  const usedSeconds =
    submission?.usedSeconds ??
    review.usedSeconds ??
    Math.round((new Date(review.finishedAt).getTime() - new Date(review.startedAt).getTime()) / 1000);
  const passed = result.score >= 60;
  const answeredCount = result.correct + result.wrong;
  const accuracy = answeredCount > 0 ? Math.round((result.correct / answeredCount) * 100) : 0;

  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const retry = () => {
    startRetry(async () => {
      const next = await startTryoutAction({
        subjectSlug: review.subject.id,
        difficulty: review.difficulty,
        mode: review.mode ?? "kisi-kisi",
        questionCount: review.questions.length,
        durationSeconds: review.durationSeconds,
      });
      if (!next.ok) {
        toast.error("Tryout belum bisa dimulai", { description: next.message });
        return;
      }
      announceLimitedSession(next.data);
      router.push(`/tryout/${next.data.sessionId}`);
    });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center gap-6 px-4 py-10 text-center md:py-14">
      <Mascot
        mood={timedOut || !passed ? "worried" : "proud"}
        className="size-28 animate-bounce-in md:size-32"
      />

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-play-green-ink md:text-4xl">
          {timedOut ? "Waktu habis!" : "Tryout selesai!"}
        </h1>
      </div>

      <ul aria-label="Pilihan tryout" className="flex flex-wrap justify-center gap-2">
        <li className="inline-flex items-center gap-1.5 rounded-full bg-play-polar px-3 py-1.5 text-sm font-extrabold text-play-ink">
          <SubjectIcon subjectId={review.subject.id} />
          {review.subject.name}
        </li>
        <li className="inline-flex items-center gap-1.5 rounded-full bg-play-polar px-3 py-1.5 text-sm font-extrabold text-play-ink">
          <Gauge aria-hidden="true" className="size-4" />
          {review.mode === "kisi-kisi" ? "Paket Kisi-Kisi" : DIFFICULTY_LABEL[review.difficulty]}
        </li>
        <li className="inline-flex items-center gap-1.5 rounded-full bg-play-polar px-3 py-1.5 text-sm font-extrabold text-play-ink">
          <ListOrdered aria-hidden="true" className="size-4" />
          {review.questions.length} soal
        </li>
      </ul>

      {timedOut ? (
        <TimeoutNotice
          sessionId={review.sessionId}
          fallback={{
            submittedAt: review.finishedAt,
            answered: Object.values(review.answers).filter((answer) => isQuestionAnswered(answer)).length,
            total: review.questions.length,
          }}
        />
      ) : null}

      <ScoreHero score={result.score} ready={ready} />

      {(result.essayTotal ?? 0) > 0 ? (
        <p className="w-full rounded-2xl border-2 border-play-blue bg-play-blue-soft px-4 py-3 text-sm font-bold text-play-blue-ink">
          Paket ini memiliki {result.essayTotal} soal Uraian/Essay ({result.essayAnswered ?? 0} terisi). Cek kesesuaian jawaban uraianmu dengan pedoman resmi di halaman <strong className="font-black">Pembahasan</strong>.
        </p>
      ) : null}

      <ul aria-label="Ringkasan" className="grid w-full grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          tone="green"
          label="Terjawab"
          value={ready ? `${answeredCount}/${result.total}` : "–"}
          icon={CircleCheck}
        />
        <StatCard tone="gold" label="Akurasi" value={ready ? `${accuracy}%` : "–"} icon={Target} />
        <StatCard
          tone="blue"
          label="Waktu"
          value={ready ? formatClock(Math.min(usedSeconds, review.durationSeconds)) : "–"}
          icon={Timer}
        />
      </ul>

      {ready ? (
        <>
          <ScoreComparison score={result.score} history={review.history} title={review.title} />
          <ScoreBreakdown sessionId={review.sessionId} questions={review.questions} result={result} />
        </>
      ) : null}

      <nav aria-label="Langkah berikutnya" className="flex w-full flex-col gap-3">
        <PlayButton tone="green" block asChild>
          <Link href={`/tryout/${review.sessionId}/pembahasan`}>
            <BookOpen aria-hidden="true" />
            Lihat pembahasan
          </Link>
        </PlayButton>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PlayButton block asChild>
            <Link href="/nilai">
              <ChartLine aria-hidden="true" />
              Riwayat nilai
            </Link>
          </PlayButton>
          <PlayButton block onClick={retry} disabled={retrying}>
            <RotateCcw aria-hidden="true" />
            Ulangi tryout
          </PlayButton>
        </div>
        <PlayButton block asChild>
          <Link href={`/kisi-kisi/${review.subject.id}`}>
            <FileText aria-hidden="true" />
            Lihat Kisi-Kisi &amp; Unduh PDF
          </Link>
        </PlayButton>
        <PlayButton block asChild>
          <Link href="/mulai">
            <Shuffle aria-hidden="true" />
            Pilih mapel lain
          </Link>
        </PlayButton>
        <Link
          href="/"
          className="self-center rounded-md px-2 py-1 font-black text-play-blue-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
        >
          Kembali ke beranda
        </Link>
      </nav>
    </main>
  );
}
