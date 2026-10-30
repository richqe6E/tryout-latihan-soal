import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { deliverStudyReminder, otpTargetForEmail } from "@/server/otp-delivery";

/** Pengingat dikirim paling lambat sekian jam setelah jam pilihan (mis. bila cron sempat tertunda). */
const SEND_WINDOW_HOURS = 2;

type ReminderRecipient = { user_id: string; name: string; email: string; phone: string | null };

/**
 * Kirim pengingat belajar yang sudah jatuh tempo. Dipanggil cron berkala (mis. tiap 15 menit).
 *
 * Seorang pengguna diingatkan bila: pengingatnya aktif, jam lokalnya (zona `reminder_timezone`)
 * sudah melewati `reminder_time` hari ini — tetapi belum lewat jendela 2 jam —, belum diingatkan
 * sejak jam itu, dan hari ini belum memulai tryout. Penerima "diklaim" dengan satu UPDATE atomik
 * (`last_reminder_sent_at`), jadi cron yang berjalan bersamaan tidak mengirim dua kali.
 */
export async function sendDueStudyReminders(now: Date = new Date()) {
  const result = await db.execute<ReminderRecipient>(sql`
    WITH due AS (
      SELECT
        s.id,
        date_trunc('day', ${now}::timestamptz AT TIME ZONE s.reminder_timezone) AS local_day,
        date_trunc('day', ${now}::timestamptz AT TIME ZONE s.reminder_timezone) + s.reminder_time::time AS local_due,
        ${now}::timestamptz AT TIME ZONE s.reminder_timezone AS local_now,
        s.reminder_timezone AS tz
      FROM user_settings s
      WHERE s.reminder_enabled
    )
    UPDATE user_settings s
    SET last_reminder_sent_at = ${now}
    FROM due, users u
    WHERE due.id = s.id
      AND u.id = s.user_id
      AND due.local_now >= due.local_due
      AND due.local_now < due.local_due + make_interval(hours => ${SEND_WINDOW_HOURS})
      AND (s.last_reminder_sent_at IS NULL OR (s.last_reminder_sent_at AT TIME ZONE due.tz) < due.local_due)
      AND NOT EXISTS (
        SELECT 1 FROM tryout_sessions t
        WHERE t.user_id = s.user_id
          AND t.deleted_at IS NULL
          AND t.started_at >= (due.local_day AT TIME ZONE due.tz)
      )
    RETURNING u.id AS user_id, u.name, u.email, u.phone
  `);

  for (const recipient of result.rows) {
    // Akun nomor HP diingatkan lewat SMS, selain itu lewat email.
    const target = recipient.phone
      ? { channel: "sms" as const, target: recipient.phone }
      : otpTargetForEmail(recipient.email);
    await deliverStudyReminder({ ...target, name: recipient.name });
  }
  return { sent: result.rows.length };
}
