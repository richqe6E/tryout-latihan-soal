import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SettingsLoader } from "@/features/settings/settings-loader";
import { getUserSettings } from "@/lib/user/data";

export const metadata: Metadata = {
  title: "Pengaturan",
};

export default function PengaturanPage() {
  return (
    <Suspense fallback={<PengaturanSkeleton />}>
      <PengaturanLoader />
    </Suspense>
  );
}

async function PengaturanLoader() {
  const settings = await getUserSettings();
  if (!settings) redirect("/masuk?next=/pengaturan");
  return <SettingsLoader settings={settings} />;
}

function PengaturanSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat pengaturan"
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-6 md:px-8"
    >
      <div className="h-10 w-48 animate-pulse rounded-xl bg-play-polar" />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-2xl bg-play-polar" />
      ))}
    </div>
  );
}
