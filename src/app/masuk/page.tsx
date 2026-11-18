import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/features/auth/auth-shell";
import { StudentLoginForm } from "@/features/auth/student-login-form";

export const metadata: Metadata = {
  title: "Masuk Siswa",
};

type Props = PageProps<"/masuk">;

export default function MasukPage({ searchParams }: Props) {
  return (
    <AuthShell
      title="Masuk Siswa"
      subtitle="Cukup tuliskan nama lengkap atau nama panggilanmu untuk mulai latihan tryout dan menyimpan nilai."
      footer={
        <Link href="/kisi-kisi" className="font-black text-play-blue-ink hover:underline">
          Atau langsung lihat Kisi-Kisi &amp; Unduh PDF tanpa masuk
        </Link>
      }
    >
      <Suspense fallback={<StudentLoginForm />}>
        <LoginWithNext searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function LoginWithNext({ searchParams }: Pick<Props, "searchParams">) {
  const { next } = await searchParams;
  return <StudentLoginForm next={typeof next === "string" ? next : undefined} />;
}
