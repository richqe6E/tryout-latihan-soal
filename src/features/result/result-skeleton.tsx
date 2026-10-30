/** Kerangka halaman hasil selagi data dimuat. */
export function ResultSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat hasil"
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center gap-6 px-4 py-10 md:py-14"
    >
      <div className="size-28 animate-pulse rounded-full bg-play-polar md:size-32" />
      <div className="h-9 w-60 animate-pulse rounded-xl bg-play-polar" />
      <div className="h-[72px] w-28 animate-pulse rounded-2xl bg-play-polar" />
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-play-polar" />
        ))}
      </div>
    </div>
  );
}
