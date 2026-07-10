import type { Service } from "@/types";
import { Icon } from "@/components/Icon";
import { SectionHeader } from "@/components/SectionHeader";

export function ServicesSection({ title, data }: { title?: string; data: Service[] }) {
  return (
    <section id="services" className="bg-background">
      <div className="container-narrow py-20">
        <SectionHeader
          eyebrow="Layanan"
          title={title ?? "Layanan Kami"}
          description="Berbagai jenis konten untuk mendukung strategi digital bisnis Anda."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <article key={s.id} className="rounded-[16px] border border-border bg-card p-6 transition-colors hover:border-primary/40">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon name={s.icon} className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-secondary">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
