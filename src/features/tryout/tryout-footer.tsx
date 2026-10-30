import type { ReactNode } from "react";

/** Bilah aksi bawah yang selalu terlihat, seperti di aplikasi belajar. */
export function TryoutFooter({ start, end }: { start?: ReactNode; end?: ReactNode }) {
  return (
    <footer className="sticky bottom-0 z-20 border-t-2 border-play-line bg-white">
      <div className="mx-auto flex w-full max-w-[1080px] items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4 md:px-8 md:py-5">
        <div className="flex items-center gap-2 sm:gap-3">{start}</div>
        {end}
      </div>
    </footer>
  );
}
