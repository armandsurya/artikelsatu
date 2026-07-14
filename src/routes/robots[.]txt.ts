import { createFileRoute } from "@tanstack/react-router";
import type { SeoConfig } from "@/lib/seo/config";
import { getSeoConfig } from "@/lib/seo/config";
import { fetchPublicSiteSettings } from "@/lib/site-settings.functions";

const DEFAULT_ROBOTS = `User-agent: *\nAllow: /\n`;

function originFromRequest(request: Request): string {
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let seo: SeoConfig = {};
        try {
          seo = getSeoConfig(await fetchPublicSiteSettings());
        } catch {
          /* fallback */
        }

        const body = seo.robotsTxt?.trim() ? seo.robotsTxt.trim() + "\n" : DEFAULT_ROBOTS;
        // Auto-advertise sitemap using request origin so it works on any deploy URL,
        // unless the admin explicitly set a sitemapUrl.
        const sitemap = seo.sitemapUrl?.trim() || `${originFromRequest(request)}/sitemap.xml`;
        const withSitemap = body.includes("Sitemap:") ? body : `${body}\nSitemap: ${sitemap}\n`;

        return new Response(withSitemap, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
