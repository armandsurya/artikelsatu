/**
 * Client middleware: melampirkan bearer token ke setiap pemanggilan server function.
 * Wajib terdaftar di `functionMiddleware` pada src/start.ts.
 */
import { createMiddleware } from "@tanstack/react-start";
import { api } from "./browser";

export const attachAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await api.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
