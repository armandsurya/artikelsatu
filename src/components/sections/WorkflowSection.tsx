import type { WorkflowStep } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";

export function WorkflowSection({ title, data }: { title?: string; data: WorkflowStep[] }) {
  return (
    <section id="workflow" className="bg-background">
      <div className="container-narrow py-20">
        <SectionHeader
          eyebrow="Cara Kerja"
          title={title ?? "Alur Pengerjaan yang Jelas"}
          description="Proses yang transparan dari brief hingga artikel siap publish."
        />

        <ol className="mt-14 grid gap-6 md:grid-cols-5">
          {data.map((s) => (
            <li key={s.id} className="relative rounded-[16px] border border-border bg-card p-6">
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {s.stepNumber}
              </div>
              <h3 className="text-base font-semibold text-secondary">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
