import { NextResponse } from "next/server";
import { PRIVATE_NO_STORE, requireApiUser } from "@/server/route-auth";
import { getSettingsForUser, saveSettingsForUser, settingsInputSchema } from "@/server/settings-service";

/**
 * GET /api/settings — pengaturan pengguna yang sedang masuk.
 * Balasan: { defaultQuestionCount, defaultDurationSeconds, reminderEnabled, reminderTime } (bawaan bila belum disimpan).
 */
export async function GET() {
  const { user, response } = await requireApiUser();
  if (response) return response;
  return NextResponse.json(await getSettingsForUser(user.id), { headers: PRIVATE_NO_STORE });
}

/**
 * PUT /api/settings — simpan pengaturan. Body boleh sebagian; kolom yang tidak dikirim tidak berubah.
 *   defaultQuestionCount 1–50 · defaultDurationSeconds 60–10800 (minimal 30 detik per soal)
 *   reminderEnabled boolean · reminderTime "HH:MM" (WIB)
 * Balasan: pengaturan lengkap setelah disimpan.
 * 400 bila ada nilai di luar batas / kolom tak dikenal — `fieldErrors` berisi pesan per isian.
 */
export async function PUT(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const body = await request.json().catch(() => null);
  const parsed = settingsInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Pengaturan tidak valid.",
        code: "invalid",
        fields: parsed.error.issues.map((issue) => issue.path.join(".")).filter(Boolean),
      },
      { status: 400 },
    );
  }
  const result = await saveSettingsForUser(user.id, parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.message,
        code: "invalid",
        fields: Object.keys(result.fields),
        fieldErrors: result.fields,
      },
      { status: 400 },
    );
  }
  return NextResponse.json(result.settings, { headers: PRIVATE_NO_STORE });
}
