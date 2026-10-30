import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/auth-shell";
import { ForgotPasswordFlow } from "@/features/auth/forgot-password-flow";

export const metadata: Metadata = {
  title: "Lupa Password",
};

export default function LupaPasswordPage() {
  return (
    <AuthShell
      title="Lupa password?"
      subtitle="Tenang, kita atur ulang lewat email atau nomor HP."
      mood="worried"
      backHref="/masuk"
      footer={
        <>
          Ingat passwordnya?{" "}
          <Link href="/masuk" className="font-black text-play-blue-ink hover:underline">
            Masuk
          </Link>
        </>
      }
    >
      <ForgotPasswordFlow />
    </AuthShell>
  );
}
