import type { Metadata } from "next";
import { KisiKisiCatalogScreen } from "@/features/kisi-kisi/kisi-kisi-catalog-screen";

export const metadata: Metadata = {
  title: "Kisi-Kisi & Unduh PDF",
};

export default function KisiKisiPage() {
  return <KisiKisiCatalogScreen />;
}
