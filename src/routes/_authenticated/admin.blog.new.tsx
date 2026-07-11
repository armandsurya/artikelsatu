import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BlogEditor } from "@/components/admin/BlogEditor";

export const Route = createFileRoute("/_authenticated/admin/blog/new")({
  head: () => ({ meta: [{ title: "Tambah Artikel — Admin" }] }),
  component: NewPost,
});

function NewPost() {
  const navigate = useNavigate();
  return <BlogEditor mode="new" onSaved={(id) => navigate({ to: "/admin/blog/$id", params: { id } })} />;
}
