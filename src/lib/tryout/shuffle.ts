/**
 * Pengacakan deterministik: seed yang sama → urutan yang sama.
 * Dipakai supaya satu sesi selalu menampilkan urutan soal yang sama
 * (saat dikerjakan, di hasil, dan di pembahasan), tapi tiap sesi baru berbeda.
 */

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** PRNG mulberry32 → angka 0 ≤ x < 1. */
function mulberry32(state: number) {
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates dengan PRNG ber-seed; tidak mengubah array asli. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const random = mulberry32(hashSeed(seed));
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

/** Seed acak pendek untuk sesi baru (dipanggil di event handler, bukan saat render). */
export function createSessionSeed() {
  return Math.random().toString(36).slice(2, 8);
}
