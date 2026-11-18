import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Latihan Soal Kisi-Kisi · Tryout Yuk",
    template: "%s · Latihan Kisi-Kisi",
  },
  description:
    "Latihan tryout dan belajar kisi-kisi Kelas IV SD (PG, Isian, Uraian) lengkap dengan pembahasan dan unduhan PDF Soal & Kunci Jawaban terpisah.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
