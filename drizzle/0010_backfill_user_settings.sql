-- Setiap pengguna lama mendapat pengaturan bawaan (pengguna baru dibuat lewat hook Better Auth).
INSERT INTO "user_settings" ("user_id")
SELECT "id" FROM "users"
ON CONFLICT ("user_id") DO NOTHING;
