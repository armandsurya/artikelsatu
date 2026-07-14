import { Check } from "lucide-react";
import type { PricingPackage } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";
import { waLink } from "@/lib/whatsapp";

export function PricingSection({
  eyebrow,
  subtitle,
  title,
  data,
}: {
  eyebrow?: string;
  subtitle?: string;
  title?: string;
  data: PricingPackage[];
}) {
  return (
    <section id="pricing" className="bg-background">
      <div className="container-narrow py-20">
        <SectionHeader
          eyebrow={eyebrow ?? "Harga"}
          title={title ?? "Paket Harga"}
          description={
            subtitle ??
            "Pilih paket yang sesuai dengan skala kebutuhan konten Anda. Harga transparan tanpa biaya tersembunyi."
          }
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((p) => (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-[16px] border bg-card p-6 ${
                p.isPopular
                  ? "border-primary shadow-[0_1px_0_0_var(--color-primary)]"
                  : "border-border"
              }`}
            >
              {p.isPopular && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                  Paling Populer
                </span>
              )}
              <h3 className="text-lg font-semibold text-secondary">{p.packageName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-secondary">{p.price}</span>
                {p.priceNote && (
                  <span className="text-sm text-muted-foreground">{p.priceNote}</span>
                )}
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-secondary">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={waLink(p.cta.message ?? `Halo, saya tertarik dengan paket ${p.packageName}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-6 inline-flex items-center justify-center rounded-[12px] px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${
                  p.isPopular
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-secondary hover:bg-accent"
                }`}
              >
                {p.cta.label}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
