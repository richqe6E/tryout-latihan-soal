"use client";

import { useId, type ReactNode } from "react";
import { Flag } from "lucide-react";
import { cn } from "cn";
import type { AnswerState, TryoutQuestion } from "@/lib/tryout/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  STATUS_LABEL,
  countAnswers,
  getOptionLetter,
  getQuestionStatus,
  type QuestionStatus,
} from "./answer-status";

const TILE_TONE: Record<QuestionStatus, string> = {
  answered: "border-play-green border-b-play-green-strong bg-play-green-soft text-play-green-ink",
  flagged: "border-play-gold border-b-play-gold-shade bg-play-gold-soft text-play-gold-ink",
  empty: "border-play-line bg-white text-play-ink-muted",
};

type NumberPanelProps = {
  questions: TryoutQuestion[];
  answers: Record<string, AnswerState>;
  currentIndex: number;
  onSelect: (index: number) => void;
  /** Aksi di bagian bawah panel (mis. tombol kumpulkan). */
  action?: ReactNode;
  className?: string;
  /** Ganti elemen judul, mis. dengan judul sheet agar terbaca sebagai judul dialog. */
  renderTitle?: (props: { id: string; className: string; children: string }) => ReactNode;
  /** Tooltip status saat hover; matikan di layar sentuh/sheet. */
  showTooltips?: boolean;
};

const TITLE_CLASS = "text-xl font-black text-play-ink";

export function NumberPanel({
  questions,
  answers,
  currentIndex,
  onSelect,
  action,
  className,
  renderTitle,
  showTooltips = true,
}: NumberPanelProps) {
  const counts = countAnswers(questions, answers);
  const titleId = useId();

  return (
    <aside
      aria-labelledby={titleId}
      className={cn(
        "flex flex-col gap-5 rounded-2xl border-2 border-play-line bg-white p-5 md:p-6",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        {renderTitle ? (
          renderTitle({ id: titleId, className: TITLE_CLASS, children: "Daftar soal" })
        ) : (
          <h2 id={titleId} className={TITLE_CLASS}>
            Daftar soal
          </h2>
        )}
        <p className="text-sm font-bold text-play-ink-muted">
          {counts.answered}/{questions.length} terjawab
        </p>
      </div>

      <ol className="grid grid-cols-5 gap-3">
        {questions.map((question, index) => {
          const answer = answers[question.id];
          const status = getQuestionStatus(answer);
          const letter = getOptionLetter(question, answer?.selectedOptionId);
          const isCurrent = index === currentIndex;
          const label = [
            `Soal ${question.orderNumber}`,
            letter ? `dijawab ${letter}` : "belum dijawab",
            answer?.isFlagged ? "ditandai ragu-ragu" : null,
          ]
            .filter(Boolean)
            .join(", ");

          const tile = (
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-label={label}
              aria-current={isCurrent ? "step" : undefined}
              data-current={isCurrent || undefined}
              className={cn(
                "press-3d relative flex h-[52px] w-full flex-col items-center justify-center gap-0.5 rounded-[10px] border-solid leading-none font-black transition-[filter,background-color] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink",
                TILE_TONE[status],
                isCurrent && "outline-4 outline-offset-2 outline-play-blue",
              )}
            >
              <span className="text-base">{question.orderNumber}</span>
              {letter ? <span className="text-[11px] font-extrabold">{letter}</span> : null}
              {answer?.isFlagged ? (
                <Flag aria-hidden="true" className="absolute top-1 right-1 size-3" />
              ) : null}
            </button>
          );

          return (
            <li key={question.id}>
              {showTooltips ? (
                <Tooltip>
                  <TooltipTrigger asChild>{tile}</TooltipTrigger>
                  <TooltipContent side="top" className="font-bold">
                    Soal {question.orderNumber} · {STATUS_LABEL[status]}
                    {letter ? ` (${letter})` : ""}
                  </TooltipContent>
                </Tooltip>
              ) : (
                tile
              )}
            </li>
          );
        })}
      </ol>

      <ul aria-label="Keterangan warna" className="grid gap-2 text-sm font-bold text-play-ink-muted">
        {(["answered", "flagged", "empty"] as const).map((status) => (
          <li key={status} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn("press-3d size-5 rounded-[4px] border-solid", TILE_TONE[status])}
            />
            <span className="flex-1">{STATUS_LABEL[status]}</span>
            <span className="font-black text-play-ink">
              {status === "answered" ? counts.answered : status === "flagged" ? counts.flagged : counts.empty}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-5 rounded-[4px] border-2 border-play-line outline-2 outline-offset-1 outline-play-blue"
          />
          <span className="flex-1">Soal yang dibuka</span>
        </li>
      </ul>

      {action}
    </aside>
  );
}
