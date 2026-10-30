import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountScreen } from "@/features/account/account-screen";
import { getCurrentUser } from "@/lib/user/data";
import { getCurrentDbUser } from "@/server/current-user";
import { getScoreHistoryForUser } from "@/server/tryout-repository";

export const metadata: Metadata = {
  title: "Akun Saya",
};

export default function AkunPage() {
  return (
    <Suspense fallback={<AkunSkeleton />}>
      <AkunLoader />
    </Suspense>
  );
}

async function AkunLoader() {
  const [user, dbUser] = await Promise.all([getCurrentUser(), getCurrentDbUser()]);
  if (!user || !dbUser) redirect("/masuk?next=/akun");
  const { items } = await getScoreHistoryForUser(dbUser.id, { limit: 100 });
  return <AccountScreen user={user} history={items} />;
}

function AkunSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat akun"
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-6 md:px-8"
    >
      <div className="h-10 w-48 animate-pulse rounded-xl bg-play-polar" />
      <div className="h-32 animate-pulse rounded-2xl bg-play-polar" />
      <div className="h-24 animate-pulse rounded-2xl bg-play-polar" />
      <div className="h-48 animate-pulse rounded-2xl bg-play-polar" />
    </div>
  );
}
