/**
 * Client API untuk pemakaian di server (SSR / server function) tanpa sesi user.
 * Cocok untuk pembacaan data publik: kebijakan baca backend tetap berlaku.
 */
import { createApiClient, type ApiClient } from "./client";

export function createServerApiClient(): ApiClient {
  return createApiClient({ persistSession: false });
}
