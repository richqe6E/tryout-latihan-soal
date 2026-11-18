"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { PlayButton } from "@/components/ui/play-button";
import { safeNextPath } from "@/lib/auth/validation";
import { studentLoginAction } from "@/server/actions/student-auth-actions";
import { FormField } from "./form-field";

/** Form masuk sederhana: cukup isi nama siswa saja. */
export function StudentLoginForm({ next, compact = false }: { next?: string; compact?: boolean }) {
  const router = useRouter();
  const alertRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();

    if (name.length < 2) {
      setError("Tuliskan nama siswa minimal 2 huruf ya.");
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }

    setError(null);
    setPending(true);
    const result = await studentLoginAction({ name }).catch(() => null);
    if (!result?.ok) {
      setPending(false);
      setError(result?.message ?? "Gagal masuk. Coba lagi sebentar.");
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }

    toast.success(`Selamat belajar, ${result.user.name}!`);
    router.push(safeNextPath(next, "/"));
    router.refresh();
  };

  return (
    <form noValidate onSubmit={onSubmit} className="flex w-full flex-col gap-4 text-left" aria-busy={pending}>
      {error ? (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="flex animate-drop items-start gap-3 rounded-2xl border-2 border-play-red bg-play-red-soft p-3.5 text-sm font-extrabold text-play-red-ink outline-none"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {error}
        </div>
      ) : null}

      <FormField
        id={compact ? "home-student-name" : "login-student-name"}
        name="name"
        label="Nama Siswa"
        autoComplete="name"
        placeholder="Contoh: Yerzan"
        disabled={pending}
      />

      <PlayButton type="submit" tone="green" block disabled={pending}>
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
        {pending ? "Menyiapkan…" : "Masuk & Mulai Belajar"}
      </PlayButton>
    </form>
  );
}
