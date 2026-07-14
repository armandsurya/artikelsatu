import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/ui";
import { SECTION_KEYS, SECTION_META } from "@/data/homepageDefaults";
import { ExternalLink, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/website/homepage/")({
  head: () => ({ meta: [{ title: "Homepage — Admin" }] }),
  component: HomepageIndex,
});

function HomepageIndex() {
  return (
    <div>
      <PageHeader
        title="Homepage"
        description="Kelola setiap section homepage. Data awal diambil otomatis dari frontend."
        actions={
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-secondary hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" /> Lihat Homepage
          </a>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTION_KEYS.map((key) => {
          const m = SECTION_META[key];
          return (
            <Link
              key={key}
              to="/admin/website/homepage/$section"
              params={{ section: key }}
              className="group flex flex-col rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <div className="mb-1 text-xs font-medium text-muted-foreground">#{m.sortOrder}</div>
              <div className="text-base font-semibold text-secondary">{m.title}</div>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{m.description}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Edit section{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
