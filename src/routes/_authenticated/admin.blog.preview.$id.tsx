import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/layouts/SiteLayout";
import { ArrowLeft, Clock, User, Eye } from "lucide-react";
import { sanitizeHtml } from "@/lib/editor/sanitize";

export const Route = createFileRoute("/_authenticated/admin/blog/preview/$id")({
  head: () => ({
    meta: [
      { title: "Preview Artikel — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PreviewPage,
});

function PreviewPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["blog-preview", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*, blog_categories(name)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <SiteLayout><div className="container-narrow py-20 text-center text-sm text-muted-foreground">Memuat preview…</div></SiteLayout>;
  if (!data) return <SiteLayout><div className="container-narrow py-20 text-center text-sm text-muted-foreground">Artikel tidak ditemukan.</div></SiteLayout>;

  const contentHtml = typeof data.content === "string" ? data.content : "";
  const date = data.published_at
    ? new Date(data.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : new Date(data.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  return (
    <SiteLayout>
      <div className="sticky top-0 z-30 border-b border-amber-200 bg-amber-50">
        <div className="container-narrow flex items-center justify-between py-2 text-xs text-amber-900">
          <span className="inline-flex items-center gap-1.5 font-medium"><Eye className="h-3.5 w-3.5" /> Mode Preview — status: {data.status} (tidak diindex Google)</span>
          <Link to="/admin/blog/$id" params={{ id }} className="rounded-md border border-amber-300 bg-white px-2.5 py-1 font-medium hover:bg-amber-100">Kembali ke Editor</Link>
        </div>
      </div>
      <article className="bg-background">
        <div className="container-narrow py-14">
          <Link to="/admin/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary">
            <ArrowLeft className="h-4 w-4" /> Semua Artikel
          </Link>
          <div className="mt-6 max-w-3xl">
            <span className="inline-flex rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">{data.blog_categories?.name ?? "Umum"}</span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-secondary sm:text-4xl">{data.title}</h1>
            {data.excerpt && <p className="mt-4 text-lg text-muted-foreground">{data.excerpt}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" />Tim ArtikelPro</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{data.read_time ?? 5} menit baca</span>
              {date && <span>{date}</span>}
            </div>
          </div>
          {data.featured_image && (
            <div className="mt-10 overflow-hidden rounded-[16px] border border-border">
              <img src={data.featured_image} alt={data.title} className="aspect-[16/9] w-full object-cover" />
            </div>
          )}
          <div className="article-body mt-10 max-w-3xl">
            {contentHtml ? <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentHtml) }} /> : <p className="text-muted-foreground">Konten belum ada.</p>}
          </div>
        </div>
      </article>
    </SiteLayout>
  );
}
