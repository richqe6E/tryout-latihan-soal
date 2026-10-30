import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ResultScreen } from "@/features/result/result-screen";
import { ResultSkeleton } from "@/features/result/result-skeleton";
import { getTryoutReview } from "@/lib/tryout/data";
import { getCurrentDbUser } from "@/server/current-user";
import { getReviewForUser, isUuid } from "@/server/tryout-repository";

export const metadata: Metadata = {
  title: "Hasil Tryout",
};

type Props = PageProps<"/tryout/[sessionId]/hasil">;

export default function HasilPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<ResultSkeleton />}>
      <HasilLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function HasilLoader({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ sessionId }, { alasan }] = await Promise.all([params, searchParams]);
  let review;
  const serverBacked = isUuid(sessionId);
  if (serverBacked) {
    const user = await getCurrentDbUser();
    if (!user) redirect(`/masuk?next=/tryout/${sessionId}/hasil`);
    review = await getReviewForUser(sessionId, user.id);
    // Belum dikumpulkan → kunci jawaban belum boleh dilihat; kembali ke tryout.
    if (!review) redirect(`/tryout/${sessionId}`);
  } else {
    review = await getTryoutReview(sessionId);
  }
  if (!review) notFound();
  return (
    <ResultScreen
      review={review}
      // Sesi database: alasan kumpul dari server, bukan dari URL.
      timedOut={review.submitReason === "timeout" || (!serverBacked && alasan === "waktu-habis")}
    />
  );
}
