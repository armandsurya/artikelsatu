import { createFileRoute } from "@tanstack/react-router";
import { MenuManager } from "@/components/admin/MenuManager";
import { PageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/website/header")({
  head: () => ({ meta: [{ title: "Header — Admin" }] }),
  component: () => (
    <div>
      <PageHeader title="Header" description="Kelola logo dan menu navigasi utama." />
      <MenuManager location="header" />
    </div>
  ),
});
