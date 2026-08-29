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
  // node-server build emits multiple mutually-importing SSR chunks; Rolldown then
  // drops shared runtime helpers from a chunk and the server crashes on boot with
  // "createMiddleware is not a function" / "__exportAll is not a function".
  // (option is valid for nitro but not in the wrapper's narrower type)
  nitro: { preset: "node-server", inlineDynamicImports: true } as { preset: string },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    build: {
      // Rolldown's tree-shaking + identifier deconfliction can drop shared runtime
      // helpers (__exportAll, createMiddleware) from split SSR chunks when a host
      // (Hostinger) builds with its own chunking pipeline instead of Nitro's.
      rollupOptions: { treeshake: false },
    },
    environments: {
      // Belt-and-braces: even if the host's build pipeline ignores the Nitro
      // preset above, emit the SSR bundle as a single module so no two server
      // chunks can import each other in a cycle.
      ssr: {
        build: {
          rollupOptions: { output: { inlineDynamicImports: true } },
        },
      },
    },
  },
});
