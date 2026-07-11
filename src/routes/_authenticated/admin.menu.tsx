import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/ui";
import { MenuManager } from "@/components/admin/MenuManager";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/menu")({
  head: () => ({ meta: [{ title: "Menu — Admin" }] }),
  component: MenuPage,
});

function MenuPage() {
  const [tab, setTab] = useState<"header" | "footer">("header");
  return (
    <div>
      <PageHeader title="Menu" description="Kelola menu navigasi header dan footer." />
      <div className="mb-4 inline-flex rounded-lg border border-border bg-background p-1">
        {(["header", "footer"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-secondary"}`}
          >{t === "header" ? "Header" : "Footer"}</button>
        ))}
      </div>
      <MenuManager location={tab} />
    </div>
  );
}
