import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, MessageCircle } from "lucide-react";
import { DebugSource } from "@/components/DebugSource";
import type { HeaderProps } from "@/lib/mapPublished";

export function Navbar({ header }: { header: HeaderProps }) {
  const [open, setOpen] = useState(false);
  const logo = (header.logo ?? "").trim();
  const isImage = !!logo && /^(https?:|data:|\/)/i.test(logo);
  const fallbackText = logo || header.siteName || "Website";
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="relative container-narrow flex h-16 items-center justify-between">
        <DebugSource label="header" source={header.source} />
        <Link
          to="/"
          className="flex items-center text-lg font-bold tracking-tight text-secondary"
          aria-label={header.siteName || "Beranda"}
        >
          {isImage ? (
            <img
              src={logo}
              alt={header.siteName || "Logo"}
              className="h-8 w-auto max-w-[180px] object-contain"
            />
          ) : (
            <>
              {fallbackText}
              <span className="text-primary">.</span>
            </>
          )}
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navigasi utama">
          {header.menu.map((item, i) => (
            <a
              key={`${item.href}-${i}`}
              href={item.href}
              target={item.target}
              rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-secondary"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {header.ctaVisible && (
          <div className="hidden md:block">
            <a
              href={header.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[12px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" /> {header.ctaLabel}
            </a>
          </div>
        )}

        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center justify-center rounded-md p-2 md:hidden"
          aria-label="Buka menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="container-narrow flex flex-col gap-1 py-3">
            {header.menu.map((item, i) => (
              <a
                key={`${item.href}-${i}`}
                href={item.href}
                target={item.target}
                rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm font-medium text-secondary hover:bg-accent"
              >
                {item.label}
              </a>
            ))}
            {header.ctaVisible && (
              <a
                href={header.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-[12px] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              >
                <MessageCircle className="h-4 w-4" /> {header.ctaLabel}
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
