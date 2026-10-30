import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ReviewScreen } from "@/features/review/review-screen";
import { getTryoutReview } from "@/lib/tryout/data";
import { getCurrentDbUser } from "@/server/current-user";
import { getReviewForUser, isUuid } from "@/server/tryout-repository";

export const metadata: Metadata = {
  title: "Pembahasan Soal",
};

type Props = PageProps<"/tryout/[sessionId]/pembahasan">;

export default function PembahasanPage({ params }: Props) {
  return (
    <Suspense fallback={<PembahasanSkeleton />}>
      <PembahasanLoader params={params} />
    </Suspense>
  );
}

async function PembahasanLoader({ params }: Pick<Props, "params">) {
  const { sessionId } = await params;
  let review;
  if (isUuid(sessionId)) {
    const user = await getCurrentDbUser();
    if (!user) redirect(`/masuk?next=/tryout/${sessionId}/pembahasan`);
    review = await getReviewForUser(sessionId, user.id);
    // Belum dikumpulkan → kunci jawaban belum boleh dilihat; kembali ke tryout.
    if (!review) redirect(`/tryout/${sessionId}`);
  } else {
    review = await getTryoutReview(sessionId);
  }
  if (!review) notFound();
  return <ReviewScreen review={review} />;
}

function PembahasanSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat pembahasan"
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-4 md:px-8"
    >
      <div className="h-12 w-56 animate-pulse rounded-xl bg-play-polar" />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-80 animate-pulse rounded-2xl bg-play-polar" />
      ))}
    </div>
  );
}
