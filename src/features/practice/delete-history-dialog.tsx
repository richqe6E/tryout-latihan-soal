"use client";

import type { RefObject } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PlayButton } from "@/components/ui/play-button";

type DeleteHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** Elemen yang menerima fokus setelah dialog tertutup (pemicunya bisa ikut terhapus). */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

/** Konfirmasi sebelum menghapus riwayat latihan. */
export function DeleteHistoryDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  returnFocusRef,
}: DeleteHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          if (returnFocusRef?.current) {
            event.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
        className="flex flex-col items-center gap-4 rounded-2xl border-2 border-play-line bg-white px-6 pt-8 pb-6 text-center ring-0 sm:max-w-[440px]"
      >
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-play-red-soft text-play-red-ink">
          <Trash2 aria-hidden="true" className="size-8" />
        </span>
        <DialogTitle className="text-2xl leading-tight font-black text-play-ink">{title}</DialogTitle>
        <DialogDescription className="text-base leading-relaxed font-bold text-play-ink-muted">
          {description}
        </DialogDescription>
        <div className="flex w-full flex-col gap-3 pt-2">
          <PlayButton block onClick={() => onOpenChange(false)}>
            Batal
          </PlayButton>
          <PlayButton tone="danger" block onClick={onConfirm}>
            {confirmLabel}
          </PlayButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
