import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MediaMeta = {
  id: string;
  url: string;
  name: string;
  title: string | null;
  alt: string | null;
  caption: string | null;
  description: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export const MEDIA_LIMITS = { alt: 125, caption: 300, title: 120 } as const;

/** Look up a media row by its public URL. Returns null when not managed by Media Library. */
export async function fetchMediaByUrl(url: string | null | undefined): Promise<MediaMeta | null> {
  if (!url) return null;
  const { data } = await supabase
    .from("media")
    .select(
      "id,url,name,title,alt,caption,description,mime_type,width,height,size_bytes,uploaded_by,created_at,updated_at",
    )
    .eq("url", url)
    .maybeSingle();
  return (data as MediaMeta | null) ?? null;
}

/** React Query hook — reused by editor and frontend. */
export function useMediaByUrl(url: string | null | undefined) {
  return useQuery({
    queryKey: ["media-by-url", url ?? ""],
    enabled: !!url,
    queryFn: () => fetchMediaByUrl(url!),
    staleTime: 30_000,
  });
}

export type MediaMetadataPatch = {
  title?: string | null;
  alt?: string | null;
  caption?: string | null;
  description?: string | null;
};

/** Update metadata on the single source of truth (Media Library). */
export async function updateMediaMetadata(id: string, patch: MediaMetadataPatch) {
  const clean: MediaMetadataPatch = {};
  if (patch.title !== undefined) clean.title = patch.title?.trim() || null;
  if (patch.alt !== undefined) clean.alt = patch.alt?.trim() || null;
  if (patch.caption !== undefined) clean.caption = patch.caption?.trim() || null;
  if (patch.description !== undefined) clean.description = patch.description?.trim() || null;
  const { error } = await supabase.from("media").update(clean).eq("id", id);
  if (error) throw error;
}

/** Pick the best ALT for an image render, with sensible fallbacks. Never returns empty. */
export function resolveAlt(
  media: Pick<MediaMeta, "alt" | "title" | "name"> | null | undefined,
  fallback?: string | null,
): string {
  const a = media?.alt?.trim();
  if (a) return a;
  const t = media?.title?.trim();
  if (t) return t;
  const f = fallback?.trim();
  if (f) return f;
  const n = media?.name?.trim();
  if (n) return n.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ");
  return "Gambar";
}
