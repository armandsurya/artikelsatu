import type { Statistic } from "@/types";
import { Icon } from "@/components/Icon";

export function StatsSection({ data }: { data: Statistic[] }) {
  return (
    <section id="stats" className="border-y border-border bg-accent/40">
      <div className="container-narrow py-14">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {data.map((s) => (
            <div key={s.id} className="text-center">
              <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name={s.icon} className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold text-secondary sm:text-3xl">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.title}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
