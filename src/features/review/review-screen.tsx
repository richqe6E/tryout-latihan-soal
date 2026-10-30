"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { PlayButton } from "@/components/ui/play-button";
import { useSubmittedAnswers } from "@/features/result/use-submitted-answers";
import { gradeAnswers } from "@/lib/tryout/grading";
import type { TryoutReview } from "@/lib/tryout/types";
import {
  ReviewFilterBar,
  parseReviewFilterOption,
  type ReviewFilterOption as ReviewFilter,
} from "./review-filter";
import { ReviewQuestionCard } from "./review-question-card";

const EMPTY_MESSAGE: Record<Exclude<ReviewFilter, "semua">, { title: string; body: string }> = {
  salah: { title: "Tidak ada jawaban yang salah", body: "Hebat! Semua soal yang kamu jawab sudah tepat." },
  kosong: { title: "Semua soal sudah dijawab", body: "Tidak ada soal yang terlewat. Mantap!" },
};

/** Halaman pembahasan: soal, kunci, jawaban pengguna, dan penjelasan — bisa disaring. */
export function ReviewScreen({ review }: { review: TryoutReview }) {
  const { ready, submission } = useSubmittedAnswers(review.sessionId);
  const answers = submission?.answers ?? review.answers;
  const result = gradeAnswers(review.questions, answers);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = parseReviewFilterOption(searchParams.get("filter"));

  const setFilter = (next: ReviewFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "semua") params.delete("filter");
    else params.set("filter", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const counts: Record<ReviewFilter, number> = {
    semua: review.questions.length,
    salah: result.wrong,
    kosong: result.empty,
  };
  const visible =
    filter === "semua"
      ? review.questions
      : review.questions.filter((question) => result.outcomes[question.id] === filter);

  return (
    <div className="flex min-h-dvh flex-col bg-white text-play-ink">
      <header className="scroll-edge sticky top-0 z-20 border-b-2 border-transparent bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 md:px-8 md:py-4">
          <Link
            href={`/tryout/${review.sessionId}/hasil`}
            aria-label="Kembali ke hasil"
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg text-play-ink-muted transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
          >
            <ArrowLeft aria-hidden="true" className="size-6" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-tight md:text-3xl">Pembahasan</h1>
            <p className="truncate text-sm font-bold text-play-ink-muted">
              {review.title}
              {ready ? (
                <span className="max-sm:hidden">
                  {` · ${result.correct} benar · ${result.wrong} salah · ${result.empty} kosong`}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pt-2 pb-12 md:px-8">
        {ready ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ReviewFilterBar value={filter} counts={counts} onChange={setFilter} />
              <p aria-live="polite" className="text-sm font-bold text-play-ink-muted">
                Menampilkan {visible.length} dari {review.questions.length} soal
              </p>
            </div>

            {visible.length > 0 ? (
              visible.map((question) => (
                <ReviewQuestionCard
                  key={question.id}
                  question={question}
                  total={review.questions.length}
                  selectedOptionId={answers[question.id]?.selectedOptionId ?? null}
                  outcome={result.outcomes[question.id] ?? "kosong"}
                />
              ))
            ) : filter !== "semua" ? (
              <section className="flex flex-col items-center gap-4 rounded-2xl border-2 border-play-line px-6 py-12 text-center">
                <Mascot mood="proud" className="size-24" />
                <h2 className="text-2xl font-black">{EMPTY_MESSAGE[filter].title}</h2>
                <p className="text-lg font-bold text-play-ink-muted">{EMPTY_MESSAGE[filter].body}</p>
                <PlayButton onClick={() => setFilter("semua")}>Lihat semua soal</PlayButton>
              </section>
            ) : null}
          </>
        ) : (
          <div aria-busy="true" aria-label="Memuat pembahasan" className="flex flex-col gap-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-2xl bg-play-polar" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
