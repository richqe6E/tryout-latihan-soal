"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "cn";

type FormFieldProps = Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

/** Label + input tebal + petunjuk/galat yang terhubung lewat aria-describedby. */
export function FormField({ id, label, hint, error, type = "text", className, ...props }: FormFieldProps) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={id} className="text-base font-black text-play-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && reveal ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-13 w-full rounded-xl border-2 border-b-4 border-play-line bg-play-polar px-4 text-lg font-bold text-play-ink transition-colors outline-none placeholder:font-semibold placeholder:text-play-ink-faint focus-visible:border-play-blue focus-visible:bg-white aria-invalid:border-play-red aria-invalid:bg-play-red-soft/40",
            isPassword && "pr-14",
            className,
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setReveal((value) => !value)}
            aria-label={reveal ? "Sembunyikan password" : "Tampilkan password"}
            aria-pressed={reveal}
            aria-controls={id}
            className="absolute top-1/2 right-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-play-ink-muted hover:bg-play-line/60 focus-visible:outline-2 focus-visible:outline-play-ink"
          >
            {reveal ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
          </button>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm font-bold text-play-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-extrabold text-play-red-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
