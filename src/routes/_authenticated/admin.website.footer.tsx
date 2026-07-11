import { createFileRoute } from "@tanstack/react-router";
import { MenuManager } from "@/components/admin/MenuManager";
import { PageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/website/footer")({
  head: () => ({ meta: [{ title: "Footer — Admin" }] }),
  component: () => (
    <div>
      <PageHeader title="Footer" description="Kelola menu, kontak, dan sosial media footer." />
      <MenuManager location="footer" />
    </div>
  ),
});
