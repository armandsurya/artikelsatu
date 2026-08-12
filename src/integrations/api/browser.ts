/**
 * Client API untuk browser — pengganti `@supabase/supabase-js` di sisi klien.
 *
 * Dipakai lewat: `import { api } from "@/integrations/api/browser";`
 * lalu `api.from("blog_posts").select("*")`, `api.auth`, `api.storage`, `api.rpc`.
 */
import { createApiClient, type ApiClient } from "./client";

let instance: ApiClient | undefined;

export const api = new Proxy({} as ApiClient, {
  get(_target, prop, receiver) {
    if (!instance) instance = createApiClient();
    return Reflect.get(instance, prop, receiver);
  },
});

export type { ApiSession, ApiUser, ApiError } from "./client";
