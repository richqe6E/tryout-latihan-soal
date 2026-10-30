import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ScoreHistoryScreen } from "@/features/history/score-history-screen";
import { getCurrentDbUser } from "@/server/current-user";
import { getScoreHistoryForUser } from "@/server/tryout-repository";

export const metadata: Metadata = {
  title: "Riwayat Nilai",
};

export default function NilaiPage() {
  return (
    <Suspense fallback={<NilaiSkeleton />}>
      <NilaiLoader />
    </Suspense>
  );
}

async function NilaiLoader() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/masuk?next=/nilai");
  const { items } = await getScoreHistoryForUser(user.id, { limit: 100 });
  return <ScoreHistoryScreen history={items} />;
}

function NilaiSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat riwayat nilai"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-6 md:px-8"
    >
      <div className="h-10 w-56 animate-pulse rounded-xl bg-play-polar" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-play-polar" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-play-polar" />
    </div>
  );
}
