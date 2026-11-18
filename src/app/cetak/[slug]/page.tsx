import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrintPreviewScreen } from "@/features/pdf/print-preview-screen";
import { getKisiKisiPackage } from "@/lib/kisi-kisi";

type Props = PageProps<"/cetak/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pkg = getKisiKisiPackage(slug);
  return { title: pkg ? `Cetak ${pkg.meta.name}` : "Pratinjau Cetak" };
}

export default function CetakPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="p-8 font-bold">Menyiapkan pratinjau cetak…</div>}>
      <CetakLoader params={params} />
    </Suspense>
  );
}

async function CetakLoader({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const pkg = getKisiKisiPackage(slug);
  if (!pkg) notFound();
  return <PrintPreviewScreen pkg={pkg} />;
}
