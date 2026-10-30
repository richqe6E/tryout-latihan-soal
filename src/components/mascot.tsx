import { cn } from "cn";

export type MascotMood = "happy" | "worried" | "proud";

/** Maskot anak ayam yang menetas — teman belajar di halaman tryout. */
export function Mascot({ mood = "happy", className }: { mood?: MascotMood; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={cn("shrink-0", className)} aria-hidden="true" focusable="false">
      <ellipse cx="60" cy="112" rx="34" ry="5" fill="var(--color-play-line)" />
      <path d="M53 26c2-10 10-12 13-6-4 0-7 3-8 7z" fill="var(--color-play-gold-shade)" />
      <ellipse cx="60" cy="60" rx="37" ry="35" fill="var(--color-play-gold)" />
      <path d="M25 60c-10 3-11 15-5 20 6-1 10-7 10-13z" fill="var(--color-play-gold-shade)" />
      <path d="M95 60c10 3 11 15 5 20-6-1-10-7-10-13z" fill="var(--color-play-gold-shade)" />

      {mood === "proud" ? (
        <>
          <path
            d="M41 52q6-7 12 0"
            fill="none"
            stroke="var(--color-play-ink)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M67 52q6-7 12 0"
            fill="none"
            stroke="var(--color-play-ink)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <ellipse cx="47" cy="52" rx="5" ry="6.5" fill="var(--color-play-ink)" />
          <ellipse cx="73" cy="52" rx="5" ry="6.5" fill="var(--color-play-ink)" />
          <circle cx="49" cy="49.5" r="1.8" fill="var(--color-play-snow)" />
          <circle cx="75" cy="49.5" r="1.8" fill="var(--color-play-snow)" />
        </>
      )}

      {mood === "worried" ? (
        <>
          <path d="M40 41l11 3" stroke="var(--color-play-ink)" strokeWidth="3" strokeLinecap="round" />
          <path d="M80 41l-11 3" stroke="var(--color-play-ink)" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : null}

      <path d="M53 60l7 8 7-8z" fill="var(--color-play-red)" />
      <circle cx="37" cy="64" r="5" fill="var(--color-play-red-soft)" />
      <circle cx="83" cy="64" r="5" fill="var(--color-play-red-soft)" />

      <path
        d="M22 76l9-8 9 8 10-8 10 8 10-8 10 8 9-8 9 8v4c0 18-17 27-38 27S22 98 22 80z"
        fill="var(--color-play-snow)"
        stroke="var(--color-play-line)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
