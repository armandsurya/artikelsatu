import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createServerApiClient } from "@/integrations/api/server";

// TODO: replace with your project URL once a project name or custom domain is set.
const BASE_URL: string = "";

function originFromRequest(request: Request): string {
  if (BASE_URL.length > 0) return BASE_URL.replace(/\/$/, "");
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

type Entry = { path: string; lastmod?: string; changefreq?: string; priority?: string };

async function fetchPublishedBlogEntries(): Promise<Entry[]> {
  const client = createServerApiClient();
  const { data, error } = await client
    .from("blog_posts")
    .select("slug, updated_at, published_at")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false, nullsFirst: false });
  if (error) {
    console.error("[sitemap] blog fetch", error);
    return [];
  }
  return (data ?? []).map((p) => ({
    path: `/blog/${p.slug}`,
    lastmod: (p.updated_at ?? p.published_at ?? undefined) || undefined,
    changefreq: "monthly",
    priority: "0.7",
  }));
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = originFromRequest(request);
        const blogEntries = await fetchPublishedBlogEntries();
        const entries: Entry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/blog", changefreq: "weekly", priority: "0.8" },
          ...blogEntries,
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${origin}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=1800",
          },
        });
      },
    },
  },
});
