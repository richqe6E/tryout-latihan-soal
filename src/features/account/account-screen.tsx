"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ChartLine,
  ChevronRight,
  History,
  LogOut,
  Mail,
  Phone,
  Rocket,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PlayButton } from "@/components/ui/play-button";
import { logoutAction } from "@/server/actions/account-actions";
import { useHiddenSessions } from "@/features/practice/history-store";
import { formatMonthYear } from "@/lib/format";
import type { ScoreHistoryEntry, UserProfile } from "@/lib/tryout/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** 081234567890 → 0812-3456-7890 */
function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.replace(/^(\d{4})(\d{4})(\d+)$/, "$1-$2-$3");
}

const MENU = [
  { href: "/mulai", label: "Mulai tryout baru", icon: Rocket },
  { href: "/riwayat", label: "Riwayat latihan", icon: History },
  { href: "/nilai", label: "Riwayat nilai", icon: ChartLine },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
] as const;

type AccountScreenProps = {
  user: UserProfile;
  history: ScoreHistoryEntry[];
};

/** Profil pengguna, ringkasan belajar, dan aksi akun. */
export function AccountScreen({ user, history: allHistory }: AccountScreenProps) {
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { hidden } = useHiddenSessions();
  const history = allHistory.filter((entry) => !hidden.has(entry.sessionId));

  const average = history.length
    ? Math.round(history.reduce((sum, entry) => sum + entry.score, 0) / history.length)
    : 0;
  const best = history.reduce((max, entry) => Math.max(max, entry.score), 0);

  const [loggingOut, setLoggingOut] = useState(false);
  const logout = async (allDevices = false) => {
    setLoggingOut(true);
    await logoutAction({ allDevices }).catch(() => null);
    setLogoutOpen(false);
    toast.success(allDevices ? "Kamu sudah keluar dari semua perangkat" : "Kamu sudah keluar", {
      description: "Sampai jumpa di latihan berikutnya!",
    });
    router.push("/masuk");
    router.refresh();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white text-play-ink">
      <header className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pt-4 md:px-8 md:pt-6">
        <Link
          href="/"
          aria-label="Kembali ke beranda"
          className="inline-flex size-12 items-center justify-center rounded-lg text-play-ink-muted transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-6" />
        </Link>
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Akun saya</h1>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-4 pb-12 md:px-8">
        <section
          aria-label="Profil"
          className="flex items-center gap-4 rounded-2xl border-2 border-play-line p-5"
        >
          <span
            aria-hidden="true"
            className="flex size-20 shrink-0 items-center justify-center rounded-full bg-play-green-soft text-3xl font-black text-play-green-ink"
          >
            {initials(user.name)}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-2xl font-black">{user.name}</p>
            {user.email ? (
              <p className="flex items-center gap-1.5 truncate font-bold text-play-ink-muted">
                <Mail aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
            ) : null}
            {user.phone ? (
              <p className="flex items-center gap-1.5 font-bold text-play-ink-muted">
                <Phone aria-hidden="true" className="size-4 shrink-0" />
                {formatPhone(user.phone)}
              </p>
            ) : null}
            <p className="text-sm font-bold text-play-ink-muted">
              Bergabung sejak {formatMonthYear(user.createdAt)}
            </p>
          </div>
        </section>

        <section aria-labelledby="stats-title" className="flex flex-col gap-3">
          <h2 id="stats-title" className="text-xl font-black">
            Ringkasan belajar
          </h2>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="flex flex-col gap-1 rounded-2xl border-2 border-play-line p-3 sm:p-4">
              <dt className="text-xs font-black tracking-[0.04em] text-play-ink-muted uppercase sm:text-sm">
                Tryout selesai
              </dt>
              <dd className="text-2xl font-black sm:text-3xl">{history.length}</dd>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border-2 border-play-line p-3 sm:p-4">
              <dt className="text-xs font-black tracking-[0.04em] text-play-ink-muted uppercase sm:text-sm">
                Rata-rata
              </dt>
              <dd className="text-2xl font-black sm:text-3xl">{average}</dd>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border-2 border-play-line p-3 sm:p-4">
              <dt className="text-xs font-black tracking-[0.04em] text-play-ink-muted uppercase sm:text-sm">
                Terbaik
              </dt>
              <dd className="text-2xl font-black sm:text-3xl">{best}</dd>
            </div>
          </dl>
        </section>

        <nav aria-label="Menu akun" className="overflow-hidden rounded-2xl border-2 border-play-line">
          <ul className="divide-y-2 divide-play-line">
            {MENU.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-5 py-4 text-lg font-black transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-play-ink"
                >
                  <Icon aria-hidden="true" className="size-5 text-play-blue-ink" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight aria-hidden="true" className="size-5 text-play-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <PlayButton tone="danger" block onClick={() => setLogoutOpen(true)} aria-haspopup="dialog">
          <LogOut aria-hidden="true" />
          Keluar
        </PlayButton>
      </main>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-play-line bg-white px-6 pt-8 pb-6 text-center ring-0 sm:max-w-[440px]"
        >
          <DialogTitle className="text-2xl font-black text-play-ink">Keluar dari akun?</DialogTitle>
          <DialogDescription className="text-base font-bold text-play-ink-muted">
            Riwayat dan nilaimu tetap tersimpan. Masuk lagi kapan saja untuk melanjutkan latihan.
          </DialogDescription>
          <div className="flex w-full flex-col gap-3 pt-2">
            <PlayButton block onClick={() => setLogoutOpen(false)} disabled={loggingOut}>
              Batal
            </PlayButton>
            <PlayButton tone="danger" block onClick={() => void logout()} disabled={loggingOut}>
              {loggingOut ? "Keluar…" : "Keluar"}
            </PlayButton>
            <button
              type="button"
              onClick={() => void logout(true)}
              disabled={loggingOut}
              className="self-center rounded-md px-2 py-1 text-sm font-black text-play-ink-muted hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink disabled:opacity-50"
            >
              Keluar dari semua perangkat
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
