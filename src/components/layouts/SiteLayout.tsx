import type { ReactNode } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useSiteSettings } from "@/lib/publishedContent";
import { mapHeader, mapFooter } from "@/lib/mapPublished";

const rootApi = getRouteApi("__root__");

export function SiteLayout({ children }: { children: ReactNode }) {
  // Root loader prefetches site_settings during SSR. Seed the client query
  // with the same snapshot so first paint matches — prevents the hydration
  // mismatch where SSR shows an older siteName than the client re-fetch.
  const rootLoader = rootApi.useLoaderData();
  const initialSettings = (rootLoader?.settings ?? {}) as Record<string, unknown>;
  const { data: settings } = useSiteSettings(initialSettings);
  const header = mapHeader(settings);
  const footer = mapFooter(settings);
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar header={header} />
      <main className="flex-1">{children}</main>
      <Footer footer={footer} />
    </div>
  );
}

