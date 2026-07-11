import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PostStatus = Database["public"]["Enums"]["post_status"];

export type RevisionSnapshot = {
  post_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: unknown;
  featured_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  tags: string[];
  category_id: string | null;
  status: PostStatus;
  seo_score: number | null;
  reason?: string | null;
};

export async function saveRevision(snap: RevisionSnapshot): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  const { data: last } = await supabase
    .from("blog_post_revisions")
    .select("revision_number")
    .eq("post_id", snap.post_id)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const next = (last?.revision_number ?? 0) + 1;
  const { error } = await supabase.from("blog_post_revisions").insert({
    post_id: snap.post_id,
    revision_number: next,
    title: snap.title,
    slug: snap.slug,
    excerpt: snap.excerpt,
    content: snap.content as never,
    featured_image: snap.featured_image,
    meta_title: snap.meta_title,
    meta_description: snap.meta_description,
    canonical_url: snap.canonical_url,
    tags: snap.tags,
    category_id: snap.category_id,
    status: snap.status,
    seo_score: snap.seo_score,
    reason: snap.reason ?? null,
    author_id: user.user?.id ?? null,
  });
  if (error) throw error;
}

export async function listRevisions(postId: string) {
  const { data, error } = await supabase
    .from("blog_post_revisions")
    .select("id, revision_number, title, status, reason, author_id, created_at, seo_score")
    .eq("post_id", postId)
    .order("revision_number", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getRevision(id: string) {
  const { data, error } = await supabase
    .from("blog_post_revisions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
