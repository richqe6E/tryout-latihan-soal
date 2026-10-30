import type { ReactNode } from "react";
import { Mascot } from "@/components/mascot";
import { SubjectIcon } from "@/components/subject-icon";
import { DIFFICULTY_LABEL, type Difficulty, type TryoutQuestion } from "@/lib/tryout/types";

type QuestionViewProps = {
  question: TryoutQuestion;
  total: number;
  subjectId: string;
  subjectName: string;
  difficulty: Difficulty;
  /** Chip tambahan di baris meta (mis. penanda ragu-ragu). */
  badges?: ReactNode;
  /** Daftar pilihan jawaban. */
  children: ReactNode;
  /** Baris status di bawah pilihan (mis. status simpan otomatis). */
  footnote?: ReactNode;
};

export function QuestionView({
  question,
  total,
  subjectId,
  subjectName,
  difficulty,
  badges,
  children,
  footnote,
}: QuestionViewProps) {
  return (
    <section aria-labelledby="tryout-question-title" className="min-w-0">
      <div className="flex animate-enter flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-black tracking-[0.06em] text-play-blue-ink uppercase">
            Soal {question.orderNumber} dari {total}
          </p>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-play-polar px-3 py-1 text-sm font-bold text-play-ink-muted">
            <SubjectIcon subjectId={subjectId} />
            {subjectName} · {DIFFICULTY_LABEL[difficulty]}
          </p>
          {badges}
        </div>

        <h1
          id="tryout-question-title"
          className="text-2xl leading-tight font-black tracking-tight text-play-ink md:text-[32px]"
        >
          Pilih jawaban yang tepat
        </h1>

        <div className="flex items-start gap-3 md:gap-4">
          <Mascot className="size-12 sm:size-[72px] md:size-24" />
          <p className="relative min-w-0 flex-1 rounded-2xl border-2 border-play-line bg-white px-4 py-3 text-lg leading-relaxed font-bold [overflow-wrap:anywhere] text-play-ink before:absolute before:top-6 before:-left-[9px] before:size-4 before:rotate-45 before:border-b-2 before:border-l-2 before:border-play-line before:bg-white before:content-[''] sm:px-5 sm:py-4 sm:text-xl sm:before:top-8">
            {question.text}
          </p>
        </div>

        {children}

        {footnote}
      </div>
    </section>
  );
}
