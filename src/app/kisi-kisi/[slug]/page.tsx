import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KisiKisiDetailScreen } from "@/features/kisi-kisi/kisi-kisi-detail-screen";
import { getKisiKisiPackage } from "@/lib/kisi-kisi";
import { getCurrentDbUser } from "@/server/current-user";

type Props = PageProps<"/kisi-kisi/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pkg = getKisiKisiPackage(slug);
  return { title: pkg ? `Kisi-Kisi ${pkg.meta.name}` : "Kisi-Kisi" };
}

export default function KisiKisiDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl p-8 font-bold">Memuat kisi-kisi…</div>}>
      <DetailLoader params={params} />
    </Suspense>
  );
}

async function DetailLoader({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const pkg = getKisiKisiPackage(slug);
  if (!pkg) notFound();
  const user = await getCurrentDbUser();
  return <KisiKisiDetailScreen pkg={pkg} signedIn={Boolean(user)} />;
}
