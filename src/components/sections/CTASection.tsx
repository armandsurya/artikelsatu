import { MessageCircle } from "lucide-react";
import type { CTASectionData } from "@/types";
import { waLink } from "@/lib/whatsapp";

export function CTASection({ data }: { data: CTASectionData }) {
  return (
    <section id="cta" className="bg-background">
      <div className="container-narrow py-16">
        <div className="rounded-[16px] bg-primary px-6 py-14 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight text-primary-foreground sm:text-4xl">
            {data.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-primary-foreground/85">
            {data.subtitle}
          </p>
          <a
            href={waLink(data.cta.message)}
            target="_blank" rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-[12px] bg-background px-6 py-3 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" /> {data.cta.label}
          </a>
        </div>
      </div>
    </section>
  );
}
