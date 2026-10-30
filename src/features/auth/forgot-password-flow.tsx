"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { PlayButton } from "@/components/ui/play-button";
import { useCountdown } from "@/features/timer/use-countdown";
import {
  maskIdentifier,
  parseIdentifier,
  validatePassword,
  type IdentifierKind,
} from "@/lib/auth/validation";
import {
  requestPasswordResetAction,
  resetPasswordAction,
  verifyResetCodeAction,
} from "@/server/actions/account-actions";
import { FormField } from "./form-field";

const RESEND_SECONDS = 30;

type Step = "identifier" | "code" | "password";
const STEP_NUMBER: Record<Step, number> = { identifier: 1, code: 2, password: 3 };

function resendDeadline() {
  return new Date(Date.now() + RESEND_SECONDS * 1000).toISOString();
}

/** Lupa password: kirim kode → verifikasi kode → buat password baru. */
export function ForgotPasswordFlow() {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<Step>("identifier");
  const [target, setTarget] = useState<{ kind: IdentifierKind; value: string } | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [resendAt, setResendAt] = useState<string | null>(null);
  // Kode yang sudah lolos pemeriksaan di langkah 2, dipakai lagi saat menyimpan password baru.
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);
  const resendIn = useCountdown(resendAt ?? new Date(0).toISOString(), resendAt === null);

  // Pindahkan fokus ke judul langkah baru supaya pembaca layar mengikuti alurnya.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const submitIdentifier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const raw = String(new FormData(event.currentTarget).get("identifier") ?? "");
    const parsed = parseIdentifier(raw);
    if (!parsed) {
      setError(
        raw.trim()
          ? "Gunakan email (nama@contoh.id) atau nomor HP (08xxxxxxxxxx)."
          : "Isi email atau nomor HP.",
      );
      return;
    }
    setError(undefined);
    setPending(true);
    const result = await requestPasswordResetAction(raw).catch(() => null);
    setPending(false);
    if (!result?.ok) {
      setError(result?.message ?? "Belum bisa mengirim kode. Periksa koneksi lalu coba lagi.");
      return;
    }
    setTarget(parsed);
    setResendAt(resendDeadline());
    setStep("code");
  };

  const resend = async () => {
    if (!target) return;
    setPending(true);
    const result = await requestPasswordResetAction(target.value).catch(() => null);
    setPending(false);
    if (!result?.ok) {
      toast.error("Kode belum terkirim", { description: result?.message ?? "Coba lagi sebentar lagi." });
      return;
    }
    setError(undefined);
    setResendAt(resendDeadline());
    toast.success("Kode baru sudah dikirim.");
  };

  const submitCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\D/g, "");
    if (code.length !== 6) {
      setError("Masukkan 6 digit kode.");
      return;
    }
    setError(undefined);
    if (!target) return;
    setPending(true);
    const result = await verifyResetCodeAction(target.value, code).catch(() => null);
    setPending(false);
    if (!result?.ok) {
      setError(result?.message ?? "Belum bisa memeriksa kode. Coba lagi.");
      return;
    }
    setVerifiedCode(code);
    setStep("password");
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    const problem = validatePassword(password) ?? (password !== confirm ? "Password belum sama." : undefined);
    if (problem) {
      setError(problem);
      return;
    }
    if (!target || !verifiedCode) return;
    setError(undefined);
    setPending(true);
    const result = await resetPasswordAction(target.value, verifiedCode, password).catch(() => null);
    if (!result?.ok) {
      setPending(false);
      setError(result?.message ?? "Password belum tersimpan. Coba lagi.");
      // Kode kedaluwarsa/terpakai: kembali ke langkah kode untuk minta kode baru.
      if (result && !result.field) {
        setVerifiedCode(null);
        setStep("code");
      }
      return;
    }
    toast.success("Password diperbarui. Silakan masuk dengan password baru.");
    router.push("/masuk");
  };

  return (
    <section aria-labelledby="reset-step-title" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-black tracking-[0.06em] text-play-blue-ink uppercase">
          Langkah {STEP_NUMBER[step]} dari 3
        </p>
        <div aria-hidden="true" className="flex gap-2">
          {[1, 2, 3].map((index) => (
            <span
              key={index}
              className={
                index <= STEP_NUMBER[step]
                  ? "h-2 flex-1 rounded-full bg-play-green"
                  : "h-2 flex-1 rounded-full bg-play-line"
              }
            />
          ))}
        </div>
        <h2 id="reset-step-title" ref={headingRef} tabIndex={-1} className="text-xl font-black outline-none">
          {step === "identifier"
            ? "Ke mana kodenya dikirim?"
            : step === "code"
              ? "Masukkan kode"
              : "Buat password baru"}
        </h2>
      </div>

      {step === "identifier" ? (
        <form noValidate onSubmit={submitIdentifier} className="flex flex-col gap-5">
          <FormField
            id="reset-identifier"
            name="identifier"
            label="Email atau nomor HP"
            autoComplete="username"
            inputMode="email"
            placeholder="nama@contoh.id atau 0812…"
            hint="Kami kirim kode verifikasi 6 digit."
            error={error}
            disabled={pending}
          />
          <PlayButton type="submit" tone="green" block disabled={pending}>
            {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            {pending ? "Mengirim…" : "Kirim kode"}
          </PlayButton>
        </form>
      ) : null}

      {step === "code" && target ? (
        <form noValidate onSubmit={submitCode} className="flex flex-col gap-5">
          <p
            role="status"
            className="flex items-start gap-3 rounded-2xl bg-play-green-soft p-4 text-left font-bold text-play-green-ink"
          >
            <MailCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <span>
              Jika akunnya terdaftar, kode dikirim ke{" "}
              <strong className="font-black">{maskIdentifier(target.kind, target.value)}</strong>.
              {process.env.NODE_ENV !== "production" ? (
                <span className="mt-1 block text-sm">Mode pengembangan: kodenya dicatat di log server.</span>
              ) : null}
            </span>
          </p>
          <FormField
            id="reset-code"
            name="code"
            label="Kode verifikasi"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6 digit"
            className="text-center text-2xl tracking-[0.5em]"
            error={error}
            disabled={pending}
          />
          <PlayButton type="submit" tone="green" block disabled={pending}>
            {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            {pending ? "Memeriksa…" : "Verifikasi"}
          </PlayButton>
          {resendIn !== null && resendIn > 0 ? (
            <p className="text-center text-sm font-bold text-play-ink-muted">
              Kirim ulang kode dalam {resendIn} detik
            </p>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={pending}
              className="self-center rounded-md px-2 py-1 font-black text-play-blue-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink disabled:opacity-50"
            >
              Kirim ulang kode
            </button>
          )}
        </form>
      ) : null}

      {step === "password" ? (
        <form noValidate onSubmit={submitPassword} className="flex flex-col gap-5">
          <FormField
            id="reset-password"
            name="password"
            type="password"
            label="Password baru"
            autoComplete="new-password"
            hint="Minimal 8 karakter, gabungkan huruf dan angka."
            disabled={pending}
          />
          <FormField
            id="reset-confirm"
            name="confirm"
            type="password"
            label="Ulangi password baru"
            autoComplete="new-password"
            error={error}
            disabled={pending}
          />
          <PlayButton type="submit" tone="green" block disabled={pending}>
            {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            {pending ? "Menyimpan…" : "Simpan password"}
          </PlayButton>
        </form>
      ) : null}
    </section>
  );
}
