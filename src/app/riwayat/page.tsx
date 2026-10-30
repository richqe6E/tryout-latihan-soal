import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PracticeHistoryScreen } from "@/features/practice/practice-history-screen";
import { getCurrentDbUser } from "@/server/current-user";
import { getPracticeHistoryForUser } from "@/server/tryout-repository";

export const metadata: Metadata = {
  title: "Riwayat Latihan",
};

export default function RiwayatPage() {
  return (
    <Suspense fallback={<RiwayatSkeleton />}>
      <RiwayatLoader />
    </Suspense>
  );
}

async function RiwayatLoader() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/masuk?next=/riwayat");
  const { items, now } = await getPracticeHistoryForUser(user.id, { limit: 100 });
  return <PracticeHistoryScreen items={items} now={now} />;
}

function RiwayatSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat riwayat latihan"
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-6 md:px-8"
    >
      <div className="h-10 w-56 animate-pulse rounded-xl bg-play-polar" />
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-2xl bg-play-polar" />
      ))}
    </div>
  );
}
