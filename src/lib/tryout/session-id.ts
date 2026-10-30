import type { Difficulty } from "./types";

type SessionSize = { questionCount: number; durationMinutes: number };

/**
 * ID sesi tiruan menyandikan pilihan mapel, tingkat, seed acak, dan (opsional)
 * ukuran sesi dari pengaturan: `<mapel>--<tingkat>--<seed>--n<jumlah>d<menit>`.
 */
export function buildMockSessionId(
  subjectId: string,
  difficulty: Difficulty,
  seed?: string,
  size?: SessionSize,
) {
  const parts = [subjectId, difficulty];
  if (seed) parts.push(seed);
  if (seed && size) parts.push(`n${size.questionCount}d${size.durationMinutes}`);
  return parts.join("--");
}
