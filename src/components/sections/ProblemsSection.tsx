import type { ProblemItem } from "@/types";
import { Icon } from "@/components/Icon";
import { SectionHeader } from "@/components/SectionHeader";

export function ProblemsSection({ title, data }: { title?: string; data: ProblemItem[] }) {
  return (
    <section id="problems" className="bg-background">
      <div className="container-narrow py-20">
        <SectionHeader
          eyebrow="Masalah"
          title={title ?? "Masalah yang Sering Dialami"}
          description="Apakah salah satu situasi berikut ini terdengar familier untuk Anda?"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((p) => (
            <article key={p.id} className="rounded-[16px] border border-border bg-card p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon name={p.icon} className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-secondary">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
