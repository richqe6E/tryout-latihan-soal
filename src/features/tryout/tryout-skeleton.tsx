/** Kerangka halaman tryout selagi sesi dimuat. */
export function TryoutSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-white" aria-busy="true" aria-label="Memuat tryout">
      <div className="mx-auto grid w-full max-w-[1080px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 md:gap-5 md:px-8 md:pt-6">
        <div className="size-12 rounded-lg bg-play-polar" />
        <div className="h-4 animate-pulse rounded-full bg-play-line" />
        <div className="h-11 w-28 animate-pulse rounded-full bg-play-polar" />
      </div>
      <div className="mx-auto grid w-full max-w-[1080px] gap-8 px-4 pt-4 md:px-8 md:pt-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        <div className="flex flex-col gap-6">
          <div className="h-5 w-40 animate-pulse rounded-full bg-play-polar" />
          <div className="h-9 w-72 max-w-full animate-pulse rounded-xl bg-play-polar" />
          <div className="h-28 animate-pulse rounded-2xl bg-play-polar" />
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-play-polar" />
          ))}
        </div>
        <div className="hidden h-80 animate-pulse rounded-2xl bg-play-polar lg:block" />
      </div>
    </div>
  );
}
