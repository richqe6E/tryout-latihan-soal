import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Mascot, type MascotMood } from "@/components/mascot";
import { RedirectIfSignedIn } from "./redirect-if-signed-in";

type AuthShellProps = {
  title: string;
  subtitle: string;
  mood?: MascotMood;
  backHref?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Kerangka halaman akun (daftar, masuk, lupa password). */
export function AuthShell({
  title,
  subtitle,
  mood = "happy",
  backHref = "/",
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-play-ink">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <header className="mx-auto flex w-full max-w-md items-center px-4 pt-4">
        <Link
          href={backHref}
          aria-label="Kembali"
          className="inline-flex size-12 items-center justify-center rounded-lg text-play-ink-muted transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-6" />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6 px-6 pt-2 pb-12">
        <Mascot mood={mood} className="size-24" />
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-black tracking-tight">{title}</h1>
          <p className="text-lg font-bold text-play-ink-muted">{subtitle}</p>
        </div>
        <div className="w-full">{children}</div>
        {footer ? <div className="text-center font-bold text-play-ink-muted">{footer}</div> : null}
      </main>
    </div>
  );
}
