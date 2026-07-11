import { createFileRoute } from "@tanstack/react-router";
import { BlogEditor } from "@/components/admin/BlogEditor";

export const Route = createFileRoute("/_authenticated/admin/blog/$id")({
  head: () => ({ meta: [{ title: "Edit Artikel — Admin" }] }),
  component: EditPost,
});

function EditPost() {
  const { id } = Route.useParams();
  return <BlogEditor mode="edit" id={id} />;
}
