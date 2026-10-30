"use client";

import { LoaderCircle } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PlayButton } from "@/components/ui/play-button";

type ExitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExit: () => void;
  /** Sedang menyimpan & menjeda di server. */
  pending?: boolean;
};

/** Konfirmasi berhenti sementara: jawaban & sisa waktu disimpan untuk dilanjutkan nanti. */
export function ExitDialog({ open, onOpenChange, onExit, pending = false }: ExitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col items-center gap-4 rounded-2xl border-2 border-play-line bg-white px-6 pt-8 pb-6 text-center ring-0 sm:max-w-[440px]"
      >
        <Mascot mood="worried" className="size-[72px]" />
        <DialogTitle className="text-2xl leading-tight font-black text-play-ink">
          Yakin mau berhenti dulu?
        </DialogTitle>
        <DialogDescription className="text-base leading-relaxed font-bold text-play-ink-muted">
          Jawaban dan sisa waktumu disimpan. Timer berhenti, dan kamu bisa melanjutkan tryout ini dari Riwayat
          Latihan.
        </DialogDescription>
        <div className="flex w-full flex-col gap-3 pt-2">
          <PlayButton tone="green" block onClick={() => onOpenChange(false)} disabled={pending}>
            Lanjut mengerjakan
          </PlayButton>
          <PlayButton tone="danger" block onClick={onExit} disabled={pending}>
            {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            {pending ? "Menyimpan…" : "Simpan & keluar"}
          </PlayButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
