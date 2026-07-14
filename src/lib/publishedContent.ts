/**
 * Client-side reader that fetches PUBLISHED content from the database.
 * This is the single source of truth for what the frontend renders.
 *
 * Static files under src/data/* are only used as a fallback while the
 * database is still empty (fresh install) or unreachable.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { SectionKey } from "@/data/homepageDefaults";

export type PublishedSectionRow = {
  section_key: SectionKey;
  title: string | null;
  sort_order: number;
  is_visible: boolean;
  data: Record<string, unknown> | null;
  last_published_at: string | null;
};

export type PublishedBlogPostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  category_id: string | null;
  tags: string[] | null;
  author_id: string | null;
  status: string;
  read_time: number | null;
  published_at: string | null;
  updated_at?: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url?: string | null;
  content?: unknown;
};

export type PublishedCategoryRow = {
  id: string;
  name: string;
  slug: string;
};

export type SiteSettingsBlob = Record<string, unknown>;

/* ---------------- Fetchers (all isomorphic via server fns) ---------------- */

export async function fetchPublishedSections(): Promise<PublishedSectionRow[]> {
  // Isomorphic: server fn uses the server publishable client on the worker
  // where the browser client cannot reach localStorage. Same DB path both
  // sides → SSR HTML matches client hydration.
  const { listPublishedSections } = await import("./homepage-public.functions");
  const { payload } = await listPublishedSections();
  try {
    return (JSON.parse(payload) as PublishedSectionRow[]) ?? [];
  } catch {
    return [];
  }
}

export async function fetchSiteSettings(): Promise<SiteSettingsBlob> {
  const { fetchPublicSiteSettings } = await import("./site-settings.functions");
  return fetchPublicSiteSettings();
}

export async function fetchPublishedBlogPosts(): Promise<PublishedBlogPostRow[]> {
  // Isomorphic (SSR-safe): server fn uses the server publishable client on the
  // worker where the browser client cannot reach localStorage. On the client
  // the RPC returns the same shape from the same DB.
  const { listPublishedPosts } = await import("./blog-public.functions");
  const { payload } = await listPublishedPosts();
  try {
    return (JSON.parse(payload) as PublishedBlogPostRow[]) ?? [];
  } catch {
    return [];
  }
}

export async function fetchBlogCategories(): Promise<PublishedCategoryRow[]> {
  const { listBlogCategories } = await import("./blog-public.functions");
  const { payload } = await listBlogCategories();
  try {
    return (JSON.parse(payload) as PublishedCategoryRow[]) ?? [];
  } catch {
    return [];
  }
}

/* ---------------- Hooks ---------------- */

export const PUBLISHED_QUERY_KEY = ["published"] as const;

export function usePublishedSections(): UseQueryResult<PublishedSectionRow[]> {
  return useQuery({
    queryKey: [...PUBLISHED_QUERY_KEY, "homepage"],
    queryFn: fetchPublishedSections,
    staleTime: 30_000,
  });
}

export function useSiteSettings(initialData?: SiteSettingsBlob): UseQueryResult<SiteSettingsBlob> {
  return useQuery({
    queryKey: [...PUBLISHED_QUERY_KEY, "site_settings"],
    queryFn: fetchSiteSettings,
    staleTime: 30_000,
    initialData,
  });
}

export function usePublishedBlogPosts(): UseQueryResult<PublishedBlogPostRow[]> {
  return useQuery({
    queryKey: [...PUBLISHED_QUERY_KEY, "blog_posts"],
    queryFn: fetchPublishedBlogPosts,
    staleTime: 30_000,
  });
}

export function usePublishedBlogCategories(): UseQueryResult<PublishedCategoryRow[]> {
  return useQuery({
    queryKey: [...PUBLISHED_QUERY_KEY, "blog_categories"],
    queryFn: fetchBlogCategories,
    staleTime: 30_000,
  });
}

export async function fetchPublishedBlogPostBySlug(
  slug: string,
): Promise<PublishedBlogPostRow | null> {
  const { getPublishedPostBySlug } = await import("./blog-public.functions");
  const { payload } = await getPublishedPostBySlug({ data: { slug } });
  if (!payload) return null;
  try {
    return JSON.parse(payload) as PublishedBlogPostRow;
  } catch {
    return null;
  }
}

export function usePublishedBlogPostBySlug(
  slug: string,
): UseQueryResult<PublishedBlogPostRow | null> {
  return useQuery({
    queryKey: [...PUBLISHED_QUERY_KEY, "blog_post", slug],
    queryFn: () => fetchPublishedBlogPostBySlug(slug),
    staleTime: 30_000,
  });
}
