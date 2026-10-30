import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/auth-shell";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = {
  title: "Daftar Akun",
};

export default function DaftarPage() {
  return (
    <AuthShell
      title="Buat akun"
      subtitle="Simpan nilai dan riwayat latihanmu supaya tidak hilang."
      footer={
        <>
          Sudah punya akun?{" "}
          <Link href="/masuk" className="font-black text-play-blue-ink hover:underline">
            Masuk
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
