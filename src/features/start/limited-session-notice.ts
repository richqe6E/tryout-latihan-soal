import { toast } from "sonner";

/**
 * Beri tahu bila sesi berisi lebih sedikit soal dari yang diminta karena bank soal terbatas
 * (server selalu mengembalikan sebanyak mungkin soal yang tersedia).
 */
export function announceLimitedSession({
  requestedQuestions,
  totalQuestions,
}: {
  requestedQuestions: number;
  totalQuestions: number;
}) {
  if (totalQuestions >= requestedQuestions) return;
  toast.info(`Tryout berisi ${totalQuestions} soal`, {
    description: `Bank soal pilihan ini baru punya ${totalQuestions} dari ${requestedQuestions} soal yang diminta.`,
  });
}
