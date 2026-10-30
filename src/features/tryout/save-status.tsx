import { CloudAlert, CloudCheck, LoaderCircle } from "lucide-react";
import type { SaveStatus } from "./use-server-autosave";

/** Status simpan otomatis jawaban ke server. */
export function SaveStatusText({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  return (
    <p role="status" className="ml-auto flex items-center gap-1.5 text-sm font-bold text-play-ink-muted">
      {status === "saving" ? (
        <>
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Menyimpan…
        </>
      ) : status === "error" ? (
        <span className="flex items-center gap-1.5 text-play-red-ink">
          <CloudAlert aria-hidden="true" className="size-4" />
          Gagal menyimpan.
          <button type="button" onClick={onRetry} className="font-black underline">
            Coba lagi
          </button>
        </span>
      ) : status === "saved" ? (
        <span className="flex items-center gap-1.5 text-play-green-ink">
          <CloudCheck aria-hidden="true" className="size-4" />
          Tersimpan otomatis
        </span>
      ) : null}
    </p>
  );
}
