# Fix: Hostinger SSR crash `createMiddleware is not a function`

## Root cause (confirmed by inspecting the installed build toolchain)

The crash is not a source bug and not a version mismatch. It is a **circular chunk initialization** problem created by the way the Node build splits the server bundle.

- The project builds with **Vite 8 (Rolldown)**.
- Nitro's Rolldown path splits everything in `node_modules` into per-package chunks (`output.codeSplitting.groups` matching `node_modules`). Confirmed in `node_modules/nitro/dist/vite.mjs` (lines 32-44).
- TanStack Start's server runtime lands across two of those chunks. One chunk defines `createMiddleware`, the other evaluates `defaultCsrfMiddleware = createCsrfMiddleware(...)` **at module top level**. Because the two chunks import each other, the CSRF module runs before `createMiddleware` is initialized -> `TypeError: createMiddleware is not a function`.
- On Lovable/Cloudflare this never happens: the Lovable config forces a worker-style preset where `inlineDynamicImports: true`, and Nitro then sets `codeSplitting = false`, emitting one server file with no cycle.
- Hostinger uses `nitro: { preset: "node-server" }` (set in `vite.config.ts`), and the Node preset keeps code splitting on — hence the two-chunk cycle only in that build.

## Versions verified (all internally consistent — not the cause)

- vite 8.0.16 (Rolldown)
- nitro 3.0.260603-beta
- @lovable.dev/vite-tanstack-config 2.12.0
- @tanstack/react-start 1.168.42 (pins its own sub-packages exactly: start-server-core 1.169.25, start-client-core 1.170.21, react-router 1.170.25)
- bun.lock resolves a single copy of each TanStack package — no duplicate/skewed installs

## Files/configuration involved

- `vite.config.ts` — the `nitro: { preset: "node-server" }` option
- `node_modules/nitro/dist/vite.mjs` — Rolldown chunking behaviour (read-only, not edited)
- No application source file is at fault; `src/start.ts`, `src/server.ts` and middleware code stay untouched

## Safest fix

Disable server-side code splitting for the Node build so the SSR runtime is emitted as one module:

```ts
nitro: { preset: "node-server", inlineDynamicImports: true }
```

Nitro maps this to `codeSplitting: false` on the Rolldown output, which removes the chunk cycle entirely. This changes only build output shape — no runtime behaviour, no data flow, no dependency changes.

Fallback if the single-file output causes any other issue: pin Vite back to 7 (Rollup bundler, different chunk algorithm). This is heavier and only used if step 1 does not resolve it.

## Steps

1. Edit `vite.config.ts` to add `inlineDynamicImports: true` to the nitro options (with a short comment explaining why).
2. Run a local production build with the Node preset and verify `.output/server/` contains a single `index.mjs` with no cross-importing `server-*.mjs` chunk pair.
3. Boot the built server locally and curl `/` and `/blog` — expect HTTP 200 and no `createMiddleware` error.
4. Report results; you then redeploy from GitHub on Hostinger.

## Does it require dependency changes?

No. Configuration only (`vite.config.ts`). Dependency versions stay locked exactly as they are today.
