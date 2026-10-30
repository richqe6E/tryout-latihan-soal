import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { TryoutResume } from "@/features/tryout/tryout-resume";
import { TryoutSkeleton } from "@/features/tryout/tryout-skeleton";
import { getTryoutSession } from "@/lib/tryout/data";
import { getCurrentDbUser } from "@/server/current-user";
import { getSessionForUser, isUuid } from "@/server/tryout-repository";

export const metadata: Metadata = {
  title: "Mengerjakan Tryout",
};

type Props = PageProps<"/tryout/[sessionId]">;

export default function TryoutPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<TryoutSkeleton />}>
      <TryoutLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function TryoutLoader({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ sessionId }, query] = await Promise.all([params, searchParams]);
  let session;
  if (isUuid(sessionId)) {
    // Sesi sungguhan dari database (hanya milik pengguna yang masuk).
    const user = await getCurrentDbUser();
    if (!user) redirect(`/masuk?next=/tryout/${sessionId}`);
    session = await getSessionForUser(sessionId, user.id);
  } else {
    // Sesi tiruan (frontend-first) — dipensiunkan bertahap oleh task backend.
    const rawSisa = Array.isArray(query.sisa) ? query.sisa[0] : query.sisa;
    const sisa = rawSisa ? Number(rawSisa) : Number.NaN;
    session = await getTryoutSession(sessionId, {
      remainingSeconds: Number.isFinite(sisa) ? sisa : undefined,
    });
  }
  if (!session) notFound();
  // Tryout yang sudah dikumpulkan tidak bisa dikerjakan ulang; tampilkan hasilnya.
  if (session.status === "selesai") redirect(`/tryout/${session.id}/hasil`);
  return <TryoutResume session={session} />;
}
