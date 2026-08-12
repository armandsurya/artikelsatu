/**
 * Client API privileged untuk pemakaian SERVER-ONLY (server function / SSR).
 * Mengirim X-Service-Token sehingga kebijakan baca/tulis backend dilewati.
 * Jangan pernah diimpor dari komponen React.
 */
import { createServiceApiClient, type ApiClient } from "./client";

let instance: ApiClient | undefined;

export const apiAdmin = new Proxy({} as ApiClient, {
  get(_target, prop, receiver) {
    if (!instance) instance = createServiceApiClient();
    return Reflect.get(instance, prop, receiver);
  },
});
