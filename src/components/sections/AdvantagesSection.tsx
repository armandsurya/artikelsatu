import type { Advantage } from "@/types";
import { Icon } from "@/components/Icon";
import { SectionHeader } from "@/components/SectionHeader";

export function AdvantagesSection({ eyebrow, subtitle, title, data }: { eyebrow?: string; subtitle?: string; title?: string; data: Advantage[] }) {
  return (
    <section id="advantages" className="bg-accent/40 border-y border-border">
      <div className="container-narrow py-20">
        <SectionHeader
          eyebrow={eyebrow ?? "Keunggulan"}
          title={title ?? "Kenapa Memilih Kami"}
          description={subtitle ?? "Kami tidak hanya menulis. Kami memastikan setiap artikel bekerja untuk bisnis Anda."}
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((a) => (
            <div key={a.id} className="rounded-[16px] border border-border bg-card p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name={a.icon} className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-secondary">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
