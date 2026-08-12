/**
 * Konfigurasi endpoint backend PHP.
 *
 * Browser memakai VITE_API_BASE_URL (di-inline saat build), sedangkan runtime
 * server (SSR) boleh memakai API_BASE_URL agar bisa memanggil backend lewat
 * jaringan internal.
 */
export function apiBaseUrl(): string {
  const fromServer = typeof process !== "undefined" ? process.env?.API_BASE_URL : undefined;
  const fromClient = import.meta.env?.VITE_API_BASE_URL as string | undefined;
  const base = fromClient || fromServer || "/api";
  return base.replace(/\/+$/, "");
}

/** Kunci localStorage tempat sesi login disimpan. */
export const AUTH_STORAGE_KEY = "artikelpro.auth.session";

/** Header rahasia untuk operasi server-side privileged (pengganti service role). */
export function serviceToken(): string | undefined {
  return typeof process !== "undefined" ? process.env?.API_SERVICE_TOKEN : undefined;
}
