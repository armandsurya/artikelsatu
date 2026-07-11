import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useSiteSettings } from "@/lib/publishedContent";
import { mapHeader, mapFooter } from "@/lib/mapPublished";

export function SiteLayout({ children }: { children: ReactNode }) {
  const { data: settings } = useSiteSettings();
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
