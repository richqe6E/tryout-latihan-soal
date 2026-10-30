import "server-only";

import { isInternalEmail } from "@/lib/auth/internal-email";

type OtpPurpose =
  "forget-password" | "email-verification" | "sign-in" | "change-email" | "phone-verification";

/** Tujuan OTP dari email akun: akun nomor HP (email internal) dikirimi SMS, selain itu email. */
export function otpTargetForEmail(email: string): { channel: "sms" | "email"; target: string } {
  return isInternalEmail(email)
    ? { channel: "sms", target: email.split("@")[0] }
    : { channel: "email", target: email };
}

/**
 * Kirim kode OTP ke pengguna. Penyedia SMS/email belum dihubungkan; selama pengembangan kode
 * dicatat di log server. Jangan di-await oleh pemanggil yang sensitif waktu (cegah timing attack).
 */
export async function deliverOtp({
  channel,
  target,
  otp,
  purpose,
}: {
  channel: "sms" | "email";
  target: string;
  otp: string;
  purpose: OtpPurpose;
}) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[auth] OTP ${purpose} via ${channel} untuk ${target}: ${otp}`);
    return;
  }
  // Produksi: sambungkan penyedia SMS/email di sini (mis. Resend untuk email, gateway SMS lokal).
  console.warn(`[auth] Penyedia ${channel} belum dikonfigurasi; OTP ${purpose} tidak terkirim.`);
}

/**
 * Kirim pengingat belajar harian. Sama seperti OTP: penyedia SMS/email belum dihubungkan,
 * jadi selama pengembangan isi pesan dicatat di log server.
 */
export async function deliverStudyReminder({
  channel,
  target,
  name,
}: {
  channel: "sms" | "email";
  target: string;
  name: string;
}) {
  const firstName = name.trim().split(/\s+/)[0] || "kamu";
  const message = `Hai ${firstName}, waktunya latihan! Satu tryout singkat hari ini, yuk.`;
  if (process.env.NODE_ENV !== "production") {
    console.info(`[pengingat] via ${channel} untuk ${target}: ${message}`);
    return;
  }
  console.warn(`[pengingat] Penyedia ${channel} belum dikonfigurasi; pengingat tidak terkirim.`);
}
