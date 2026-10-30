"use client";

import { CircleCheck, CircleDashed, Flag, LoaderCircle } from "lucide-react";
import { cn } from "cn";
import { Mascot } from "@/components/mascot";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PlayButton } from "@/components/ui/play-button";

type Counts = { answered: number; flagged: number; empty: number };

type SubmitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counts: Counts;
  /** Lompat ke soal kosong / ragu-ragu pertama untuk dicek dulu. */
  onReview: (kind: "empty" | "flagged") => void;
  onConfirm: () => void;
  submitting?: boolean;
};

function SummaryPill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <li
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold",
        className,
      )}
    >
      {children}
    </li>
  );
}

export function SubmitDialog({
  open,
  onOpenChange,
  counts,
  onReview,
  onConfirm,
  submitting = false,
}: SubmitDialogProps) {
  const hasEmpty = counts.empty > 0;
  const hasFlagged = counts.flagged > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col items-center gap-4 rounded-2xl border-2 border-play-line bg-white px-6 pt-8 pb-6 text-center ring-0 sm:max-w-[440px]"
      >
        <Mascot mood={hasEmpty ? "worried" : "happy"} className="size-[72px]" />
        <DialogTitle className="text-2xl leading-tight font-black text-play-ink">
          Kumpulkan jawaban sekarang?
        </DialogTitle>

        <ul aria-label="Ringkasan jawaban" className="flex flex-wrap justify-center gap-2">
          <SummaryPill className="bg-play-green-soft text-play-green-ink">
            <CircleCheck aria-hidden="true" className="size-4" />
            {counts.answered} terjawab
          </SummaryPill>
          <SummaryPill className="bg-play-gold-soft text-play-gold-ink">
            <Flag aria-hidden="true" className="size-4" />
            {counts.flagged} ragu-ragu
          </SummaryPill>
          <SummaryPill className="bg-play-blue-soft text-play-blue-ink">
            <CircleDashed aria-hidden="true" className="size-4" />
            {counts.empty} kosong
          </SummaryPill>
        </ul>

        <DialogDescription className="text-base leading-relaxed font-bold text-play-ink-muted">
          {hasEmpty
            ? "Soal yang kosong tidak mendapat nilai. Mau dicek dulu?"
            : hasFlagged
              ? "Masih ada soal yang kamu tandai ragu-ragu. Yakin sudah mantap?"
              : "Semua soal sudah terjawab. Kerja bagus!"}
        </DialogDescription>

        <div className="flex w-full flex-col gap-3 pt-2">
          {hasEmpty ? (
            <PlayButton block disabled={submitting} onClick={() => onReview("empty")}>
              Cek soal kosong
            </PlayButton>
          ) : hasFlagged ? (
            <PlayButton block disabled={submitting} onClick={() => onReview("flagged")}>
              Cek soal ragu-ragu
            </PlayButton>
          ) : (
            <PlayButton block disabled={submitting} onClick={() => onOpenChange(false)}>
              Cek lagi
            </PlayButton>
          )}
          <PlayButton tone="green" block disabled={submitting} onClick={onConfirm}>
            {submitting ? (
              <>
                <LoaderCircle aria-hidden="true" className="animate-spin" />
                Mengumpulkan…
              </>
            ) : (
              "Kumpulkan"
            )}
          </PlayButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
