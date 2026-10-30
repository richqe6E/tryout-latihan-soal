import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";
import { DEMO_ACCOUNT } from "@/lib/auth/demo-account";

export const metadata: Metadata = {
  title: "Masuk",
};

type Props = PageProps<"/masuk">;

export default function MasukPage({ searchParams }: Props) {
  return (
    <AuthShell
      title="Masuk"
      subtitle="Lanjutkan latihan dan lihat lagi riwayat nilaimu."
      footer={
        <>
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-black text-play-blue-ink hover:underline">
            Daftar
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Suspense fallback={<LoginForm />}>
          <LoginWithNext searchParams={searchParams} />
        </Suspense>
        <aside className="rounded-2xl bg-play-blue-soft p-4 text-left text-sm font-bold text-play-blue-ink">
          <p className="font-black">Akun contoh (data tiruan)</p>
          <p>
            {DEMO_ACCOUNT.email} · password <code className="font-black">{DEMO_ACCOUNT.password}</code>
          </p>
        </aside>
      </div>
    </AuthShell>
  );
}

async function LoginWithNext({ searchParams }: Pick<Props, "searchParams">) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}
