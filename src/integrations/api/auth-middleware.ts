/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Middleware server function: memvalidasi bearer token ke backend PHP dan
 * menyediakan client API yang bertindak sebagai user tersebut.
 */
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createApiClient } from "./client";

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const client = createApiClient({ accessToken: token, persistSession: false });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return next({
    context: {
      api: client,
      userId: data.user.id,
      user: data.user,
      claims: { sub: data.user.id, email: data.user.email },
    } as any,
  });
});
