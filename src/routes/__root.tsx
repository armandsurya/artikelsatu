import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { settings as staticSettings } from "@/data/settings";
import { fetchSiteSettings, PUBLISHED_QUERY_KEY } from "@/lib/publishedContent";
import { getSeoConfig, buildRootMeta, buildAnalyticsScripts, buildOrganizationSchema } from "@/lib/seo/config";
import {
  fetchActiveRedirects,
  REDIRECTS_QUERY_KEY,
  resolveRedirect,
  recordRedirectHit,
} from "@/lib/redirects/service";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Halaman tidak ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
        </p>
        <div className="mt-6">
          <a href="/" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Kembali ke Beranda
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Terjadi kesalahan</h1>
        <p className="mt-2 text-sm text-muted-foreground">Silakan coba lagi atau kembali ke beranda.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Coba lagi
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            Beranda
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context, location }) => {
    const path = location.pathname;
    // Skip admin, auth, API and internal paths
    if (
      path.startsWith("/admin") ||
      path.startsWith("/auth") ||
      path.startsWith("/api") ||
      path.startsWith("/_")
    ) return;
    try {
      const rows = await context.queryClient.ensureQueryData({
        queryKey: [...REDIRECTS_QUERY_KEY],
        queryFn: fetchActiveRedirects,
        staleTime: 60_000,
      });
      const full = path + (location.searchStr || "");
      const hit = resolveRedirect(full, rows);
      if (hit) {
        recordRedirectHit(hit.row.source);
        throw redirect({ href: hit.destination, code: hit.row.code });
      }
    } catch (e) {
      if (e && typeof e === "object" && "isRedirect" in e) throw e;
    }
  },
  loader: async ({ context }) => {
    try {
      const settings = await context.queryClient.ensureQueryData({
        queryKey: [...PUBLISHED_QUERY_KEY, "site_settings"],
        queryFn: fetchSiteSettings,
        staleTime: 30_000,
      });
      return { settings };
    } catch {
      return { settings: {} as Record<string, unknown> };
    }
  },
  head: ({ loaderData }) => {
    const s = (loaderData?.settings ?? {}) as Record<string, unknown>;
    const seo = getSeoConfig(s);
    const siteName = (s.siteName as string | undefined) || staticSettings.siteName;
    const email = (s.email as string | undefined) || staticSettings.email;
    const address = (s.address as string | undefined) || staticSettings.address;
    const favicon = seo.favicon || "/favicon.ico";
    const isSvgFavicon = /\.svg(\?|$)/i.test(favicon);
    const isIcoFavicon = /\.ico(\?|$)/i.test(favicon);

    const meta = [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: siteName },
      { name: "theme-color", content: "#2563EB" },
      ...buildRootMeta(seo, siteName),
    ];

    const analytics = buildAnalyticsScripts(seo);
    const orgSchema = buildOrganizationSchema(seo, siteName, email, address);

    return {
      meta,
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: favicon, type: isSvgFavicon ? "image/svg+xml" : isIcoFavicon ? "image/x-icon" : "image/png" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
      ],
      scripts: [
        { type: "application/ld+json", children: orgSchema },
        ...analytics,
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <SonnerToaster />
    </QueryClientProvider>
  );
}

function SonnerToaster() {
  const [Comp, setComp] = useState<React.ComponentType | null>(null);
  useEffect(() => {
    import("sonner").then((m) => {
      const T = m.Toaster;
      setComp(() => () => <T richColors position="top-right" closeButton />);
    });
  }, []);
  return Comp ? <Comp /> : null;
}
