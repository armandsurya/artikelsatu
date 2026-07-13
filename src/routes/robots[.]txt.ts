import { createFileRoute } from "@tanstack/react-router";
import type { SeoConfig } from "@/lib/seo/config";
import { getSeoConfig } from "@/lib/seo/config";
import { fetchSiteSettings } from "@/lib/publishedContent";

const DEFAULT_ROBOTS = `User-agent: *\nAllow: /\n`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        let seo: SeoConfig = {};
        try {
          seo = getSeoConfig(await fetchSiteSettings());
        } catch {
          /* fall back */
        }
        const body = seo.robotsTxt?.trim() ? seo.robotsTxt.trim() + "\n" : DEFAULT_ROBOTS;
        const sitemap = seo.sitemapUrl?.trim() || "";
        const withSitemap = sitemap
          ? (body.includes("Sitemap:") ? body : `${body}\nSitemap: ${sitemap}\n`)
          : body;
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
