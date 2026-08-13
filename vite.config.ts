// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Hostinger runs the SSR application as a persistent Node process. Without
  // an explicit self-host target, Nitro falls back to a Cloudflare Worker
  // bundle, which cannot boot in Hostinger's Node runtime and makes every
  // dynamic route return HTTP 500 (while static assets still work).
  // Lovable builds keep enforcing their own Cloudflare target internally.
  // inlineDynamicImports disables Rolldown's server code-splitting. Without it the
  // node-server build emits two mutually-importing SSR chunks and crashes on boot
  // with "createMiddleware is not a function" (circular chunk initialization).
  nitro: { preset: "node-server", inlineDynamicImports: true },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
