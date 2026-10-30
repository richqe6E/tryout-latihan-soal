import { Check, X } from "lucide-react";
import { cn } from "cn";
import { Mascot } from "@/components/mascot";
import { OPTION_LETTERS } from "@/features/tryout/answer-status";
import type { QuestionOutcome, ReviewQuestion } from "@/lib/tryout/types";
import { OUTCOME_STYLE } from "./outcome-style";

type ReviewQuestionCardProps = {
  question: ReviewQuestion;
  total: number;
  selectedOptionId: string | null;
  outcome: QuestionOutcome;
};

type OptionRole = "kunci" | "salah" | "biasa";

const OPTION_TONE: Record<OptionRole, { row: string; badge: string }> = {
  kunci: {
    row: "border-play-green bg-play-green-soft text-play-green-ink",
    badge: "border-play-green bg-white text-play-green-ink",
  },
  salah: {
    row: "border-play-red bg-play-red-soft text-play-red-ink",
    badge: "border-play-red bg-white text-play-red-ink",
  },
  biasa: {
    row: "border-play-line text-play-ink",
    badge: "border-play-line text-play-ink-muted",
  },
};

/** Satu soal di halaman pembahasan: kunci jawaban vs jawaban pengguna. */
export function ReviewQuestionCard({ question, total, selectedOptionId, outcome }: ReviewQuestionCardProps) {
  const style = OUTCOME_STYLE[outcome];
  const OutcomeIcon = style.icon;
  const titleId = `soal-${question.orderNumber}-judul`;
  const keyIndex = question.options.findIndex((option) => option.id === question.correctOptionId);
  const selectedIndex = question.options.findIndex((option) => option.id === selectedOptionId);
  // Catatan pengecoh: kenapa pilihan yang dipilih pengguna keliru (bila penyusun soal mengisinya).
  const wrongNote = outcome === "salah" ? question.options[selectedIndex]?.explanation : undefined;

  return (
    <article
      id={`soal-${question.orderNumber}`}
      aria-labelledby={titleId}
      className="flex scroll-mt-28 flex-col gap-4 rounded-2xl border-2 border-play-line bg-white p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-center gap-3">
        <h2 id={titleId} className="text-sm font-black tracking-[0.06em] text-play-blue-ink uppercase">
          Soal {question.orderNumber} dari {total}
        </h2>
        <p
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black",
            style.chip,
          )}
        >
          <OutcomeIcon aria-hidden="true" className="size-4" strokeWidth={3} />
          {style.label}
        </p>
      </header>

      <p className="text-lg leading-relaxed font-bold [overflow-wrap:anywhere] text-play-ink sm:text-xl">
        {question.text}
      </p>

      <ul aria-label="Pilihan jawaban" className="grid gap-2">
        {question.options.map((option, index) => {
          const isKey = option.id === question.correctOptionId;
          const isSelected = option.id === selectedOptionId;
          const role: OptionRole = isKey ? "kunci" : isSelected ? "salah" : "biasa";
          const tone = OPTION_TONE[role];
          const tags = [isKey ? "Kunci" : null, isSelected ? "Jawabanmu" : null].filter(
            (tag) => tag !== null,
          );

          return (
            <li
              key={option.id}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border-2 px-3 py-3 text-lg leading-relaxed font-bold sm:px-4",
                tone.row,
              )}
            >
              <span
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-black",
                  tone.badge,
                )}
              >
                {role === "kunci" ? (
                  <Check aria-hidden="true" className="size-4" strokeWidth={3} />
                ) : role === "salah" ? (
                  <X aria-hidden="true" className="size-4" strokeWidth={3} />
                ) : (
                  OPTION_LETTERS[index]
                )}
              </span>
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                {role !== "biasa" ? <span className="sr-only">{OPTION_LETTERS[index]}. </span> : null}
                {option.text}
              </span>
              {tags.length ? (
                <span className="ml-auto flex flex-wrap justify-end gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white px-2 py-0.5 text-xs font-black tracking-[0.04em] uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <section
        aria-label={`Pembahasan soal ${question.orderNumber}`}
        className="flex items-start gap-3 rounded-2xl bg-play-blue-soft p-3 sm:p-4"
      >
        <Mascot
          mood={outcome === "benar" ? "proud" : "happy"}
          className="size-10 shrink-0 max-[359px]:hidden sm:size-12"
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="font-bold text-play-ink">
            {outcome === "kosong" ? (
              <>
                Kamu belum menjawab soal ini. Kunci jawabannya{" "}
                <strong className="font-black">{OPTION_LETTERS[keyIndex]}</strong>.
              </>
            ) : outcome === "benar" ? (
              <>
                Jawabanmu <strong className="font-black">{OPTION_LETTERS[selectedIndex]}</strong> sudah tepat!
              </>
            ) : (
              <>
                Jawabanmu <strong className="font-black">{OPTION_LETTERS[selectedIndex]}</strong>, kunci
                jawabannya <strong className="font-black">{OPTION_LETTERS[keyIndex]}</strong>.
              </>
            )}
          </p>
          <h3 className="text-xs font-black tracking-[0.06em] text-play-blue-ink uppercase">Penjelasan</h3>
          <p className="leading-relaxed font-bold [overflow-wrap:anywhere] text-play-ink">
            {question.explanation}
          </p>
          {wrongNote ? (
            <>
              <h3 className="pt-1 text-xs font-black tracking-[0.06em] text-play-red-ink uppercase">
                Kenapa {OPTION_LETTERS[selectedIndex]} keliru?
              </h3>
              <p className="leading-relaxed font-bold [overflow-wrap:anywhere] text-play-ink">{wrongNote}</p>
            </>
          ) : null}
        </div>
      </section>
    </article>
  );
}
