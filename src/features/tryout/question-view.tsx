import type { ReactNode } from "react";
import { Mascot } from "@/components/mascot";
import { QuestionVisual } from "@/components/question-visual";
import { SubjectIcon } from "@/components/subject-icon";
import { QUESTION_TYPE_LABEL, type Difficulty, type TryoutQuestion } from "@/lib/tryout/types";

type QuestionViewProps = {
  question: TryoutQuestion;
  total: number;
  subjectId: string;
  subjectName: string;
  difficulty: Difficulty;
  badges?: ReactNode;
  children: ReactNode;
  footnote?: ReactNode;
};

export function QuestionView({
  question,
  total,
  subjectId,
  subjectName,
  badges,
  children,
  footnote,
}: QuestionViewProps) {
  const qType = question.questionType ?? "pg";
  const typeHeading =
    qType === "pg"
      ? "Pilih jawaban yang tepat (a–d)"
      : qType === "isian"
        ? "Tuliskan jawaban singkat yang tepat"
        : "Tuliskan jawaban uraian dengan lengkap";

  return (
    <section aria-labelledby="tryout-question-title" className="min-w-0">
      <div className="flex animate-enter flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-sm font-black tracking-[0.06em] text-play-blue-ink uppercase">
            Soal {question.orderNumber} dari {total}
          </p>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-play-polar px-3 py-1 text-sm font-bold text-play-ink-muted">
            <SubjectIcon subjectId={subjectId} />
            {subjectName}
          </p>
          <span className="rounded-full bg-play-blue-soft px-3 py-1 text-xs font-black text-play-blue-ink uppercase">
            {question.typeLabel ?? QUESTION_TYPE_LABEL[qType]}
            {question.cognitiveLevel ? ` · ${question.cognitiveLevel}` : ""}
          </span>
          {badges}
        </div>

        <h1
          id="tryout-question-title"
          className="text-2xl leading-tight font-black tracking-tight text-play-ink md:text-[30px]"
        >
          {typeHeading}
        </h1>

        {question.indicator ? (
          <p className="rounded-xl border border-play-line bg-play-polar px-3.5 py-2 text-xs font-bold text-play-ink-muted">
            <strong className="font-black text-play-ink">Indikator Kisi-Kisi:</strong> {question.indicator}
          </p>
        ) : null}

        {question.stimulusText ? (
          <div className="rounded-2xl border-2 border-play-line bg-neutral-50 p-4 text-base leading-relaxed font-semibold text-play-ink">
            <p className="mb-1 text-sm font-black text-play-blue-ink uppercase">
              {question.stimulusTitle ?? "Bacaan"}
            </p>
            <p>{question.stimulusText}</p>
          </div>
        ) : null}

        {question.visualAsset ? (
          <QuestionVisual assetId={question.visualAsset} caption={question.visualCaption} />
        ) : null}

        <div className="flex items-start gap-3 md:gap-4">
          <Mascot className="size-12 sm:size-[68px] md:size-20" />
          <p className="relative min-w-0 flex-1 whitespace-pre-line rounded-2xl border-2 border-play-line bg-white px-4 py-3 text-lg leading-relaxed font-bold [overflow-wrap:anywhere] text-play-ink before:absolute before:top-6 before:-left-[9px] before:size-4 before:rotate-45 before:border-b-2 before:border-l-2 before:border-play-line before:bg-white before:content-[''] sm:px-5 sm:py-4 sm:text-xl sm:before:top-8">
            {question.text}
          </p>
        </div>

        {children}

        {footnote}
      </div>
    </section>
  );
}
