import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/server/current-user";

/**
 * Halaman khusus tamu (daftar/masuk/lupa password): pengguna yang SUDAH masuk diarahkan ke beranda.
 * Dicek dengan sesi yang divalidasi server — bukan sekadar ada cookie — supaya cookie basi
 * tidak mengunci pengguna di luar halaman masuk.
 */
export async function RedirectIfSignedIn() {
  if (await getCurrentDbUser()) redirect("/");
  return null;
}
