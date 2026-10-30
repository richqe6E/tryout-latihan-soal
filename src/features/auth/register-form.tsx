"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { PlayButton } from "@/components/ui/play-button";
import {
  PASSWORD_MIN_LENGTH,
  validateRegister,
  type FieldErrors,
  type RegisterValues,
} from "@/lib/auth/validation";
import { registerAction } from "@/server/actions/account-actions";
import { FormField } from "./form-field";

const FIELD_ORDER: (keyof RegisterValues)[] = ["name", "identifier", "password"];

/** Form daftar akun dengan email atau nomor HP. */
export function RegisterForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors<keyof RegisterValues>>({});
  const [pending, setPending] = useState(false);

  const focusFirstError = (next: FieldErrors<keyof RegisterValues>) => {
    const first = FIELD_ORDER.find((field) => next[field]);
    if (first) formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values: RegisterValues = {
      name: String(data.get("name") ?? ""),
      identifier: String(data.get("identifier") ?? ""),
      password: String(data.get("password") ?? ""),
    };
    const nextErrors = validateRegister(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    setPending(true);
    const result = await registerAction(values).catch(() => null);
    if (!result?.ok) {
      setPending(false);
      if (!result || !result.field) {
        toast.error("Akun belum bisa dibuat", {
          description: result?.message ?? "Periksa koneksi lalu coba lagi.",
        });
        return;
      }
      const serverErrors = { [result.field]: result.message };
      setErrors(serverErrors);
      focusFirstError(serverErrors);
      return;
    }
    toast.success(`Akun dibuat! Selamat datang, ${result.user.name.split(/\s+/)[0]} 🎉`);
    router.push("/mulai");
    router.refresh();
  };

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-5" aria-busy={pending}>
      <FormField
        id="register-name"
        name="name"
        label="Nama"
        autoComplete="name"
        placeholder="Nama lengkapmu"
        error={errors.name}
        disabled={pending}
      />
      <FormField
        id="register-identifier"
        name="identifier"
        label="Email atau nomor HP"
        autoComplete="username"
        inputMode="email"
        placeholder="nama@contoh.id atau 0812…"
        hint="Dipakai untuk masuk dan memulihkan password."
        error={errors.identifier}
        disabled={pending}
      />
      <FormField
        id="register-password"
        name="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        placeholder={`Minimal ${PASSWORD_MIN_LENGTH} karakter`}
        hint="Gabungkan huruf dan angka."
        error={errors.password}
        disabled={pending}
      />
      <PlayButton type="submit" tone="green" block disabled={pending} className="mt-2">
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
        {pending ? "Membuat akun…" : "Buat akun"}
      </PlayButton>
    </form>
  );
}
