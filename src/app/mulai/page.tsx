import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StartScreen } from "@/features/start/start-screen";
import { getUserSettings } from "@/lib/user/data";
import { getSubjectCatalog } from "@/server/catalog-repository";

export const metadata: Metadata = {
  title: "Mulai Tryout",
};

export default function MulaiPage() {
  return (
    <Suspense fallback={null}>
      <MulaiLoader />
    </Suspense>
  );
}

async function MulaiLoader() {
  const [subjects, settings] = await Promise.all([getSubjectCatalog(), getUserSettings()]);
  if (!settings) redirect("/masuk?next=/mulai");
  return <StartScreen subjects={subjects} settings={settings} />;
}
