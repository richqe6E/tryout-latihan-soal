import { bahasaIndonesiaPackage } from "./bahasa-indonesia";
import { budayaKutaiPackage } from "./budaya-kutai";
import { matematikaPackage } from "./matematika";
import { pendidikanPancasilaPackage } from "./pendidikan-pancasila";
import { seniRupaPackage } from "./seni-rupa";
import type { KisiKisiQuestion, KisiKisiSubjectMeta, KisiKisiSubjectPackage } from "./types";

export const KISI_KISI_PACKAGES: KisiKisiSubjectPackage[] = [
  matematikaPackage,
  bahasaIndonesiaPackage,
  budayaKutaiPackage,
  pendidikanPancasilaPackage,
  seniRupaPackage,
];

export const KISI_KISI_BY_SLUG: Record<string, KisiKisiSubjectPackage> = Object.fromEntries(
  KISI_KISI_PACKAGES.map((pkg) => [pkg.meta.slug, pkg]),
);

export const KISI_KISI_SUBJECTS: KisiKisiSubjectMeta[] = KISI_KISI_PACKAGES.map((pkg) => pkg.meta);

export const ALL_KISI_KISI_QUESTIONS: KisiKisiQuestion[] = KISI_KISI_PACKAGES.flatMap((pkg) => pkg.questions);

export function getKisiKisiPackage(slug: string): KisiKisiSubjectPackage | null {
  return KISI_KISI_BY_SLUG[slug] ?? null;
}
