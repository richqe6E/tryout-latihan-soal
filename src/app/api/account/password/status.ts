/** Status HTTP untuk kode hasil layanan akun. */
export const ACCOUNT_STATUS = {
  invalid: 400,
  unauthorized: 401,
  conflict: 409,
  rate_limited: 429,
  server_error: 500,
} as const;
