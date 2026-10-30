"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { PlayButton } from "@/components/ui/play-button";
import { safeNextPath, validateLogin, type FieldErrors, type LoginValues } from "@/lib/auth/validation";
import { loginAction } from "@/server/actions/account-actions";
import { FormField } from "./form-field";

const FIELD_ORDER: (keyof LoginValues)[] = ["identifier", "password"];

/** Form masuk dengan email atau nomor HP. */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<FieldErrors<keyof LoginValues>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values: LoginValues = {
      identifier: String(data.get("identifier") ?? ""),
      password: String(data.get("password") ?? ""),
    };
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    setFormError(null);
    const first = FIELD_ORDER.find((field) => nextErrors[field]);
    if (first) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setPending(true);
    const result = await loginAction(values).catch(() => null);
    if (!result?.ok) {
      setPending(false);
      setFormError(result?.message ?? "Belum bisa masuk. Periksa koneksi lalu coba lagi.");
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }
    toast.success(`Selamat datang kembali, ${result.user.name.split(/\s+/)[0]}!`);
    router.push(safeNextPath(next, "/"));
    router.refresh();
  };

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-5" aria-busy={pending}>
      {formError ? (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="flex animate-drop items-start gap-3 rounded-2xl border-2 border-play-red bg-play-red-soft p-4 text-left font-extrabold text-play-red-ink outline-none"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {formError}
        </div>
      ) : null}
      <FormField
        id="login-identifier"
        name="identifier"
        label="Email atau nomor HP"
        autoComplete="username"
        inputMode="email"
        placeholder="nama@contoh.id atau 0812…"
        error={errors.identifier}
        disabled={pending}
      />
      <div className="flex flex-col gap-2">
        <FormField
          id="login-password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          placeholder="Password kamu"
          error={errors.password}
          disabled={pending}
        />
        <Link
          href="/lupa-password"
          className="self-end rounded-md text-sm font-black text-play-blue-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
        >
          Lupa password?
        </Link>
      </div>
      <PlayButton type="submit" tone="green" block disabled={pending}>
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
        {pending ? "Masuk…" : "Masuk"}
      </PlayButton>
    </form>
  );
}
