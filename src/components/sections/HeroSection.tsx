import { MessageCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import type { HeroData } from "@/types";
import { waLink } from "@/lib/whatsapp";

export function HeroSection({ data }: { data: HeroData }) {
  return (
    <section id="hero" className="relative overflow-hidden bg-background">
      <div className="container-narrow py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          {data.eyebrow && (
            <div className="mb-5 inline-flex items-center rounded-full border border-border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              {data.eyebrow}
            </div>
          )}
          <h1 className="text-4xl font-bold leading-tight text-secondary sm:text-5xl md:text-6xl">
            {data.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {data.subtitle}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={waLink(data.primaryCta.message)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              <MessageCircle className="h-4 w-4" /> {data.primaryCta.label}
            </a>
            {data.secondaryCta && (
              <a
                href="#pricing"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] border border-border bg-background px-6 py-3 text-sm font-semibold text-secondary hover:bg-accent sm:w-auto"
              >
                {data.secondaryCta.label} <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["100% Human Written", "Bebas Plagiarisme", "Sesuai Kaidah SEO"].map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
