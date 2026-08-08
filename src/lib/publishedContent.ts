/**
 * Client-side reader that fetches PUBLISHED content from the database.
 * This is the single source of truth for what the frontend renders.
 *
 * Static files under src/data/* are only used as a fallback while the
 * database is still empty (fresh install) or unreachable.
 */
import { queryOptions, useSuspenseQuery, type QueryClient } from "@tanstack/react-query";
import type { SectionKey } from "@/data/homepageDefaults";

/**
 * Prefetch a public query during SSR without letting a backend hiccup take the
 * whole page down. On failure we seed the cache with a safe fallback so the
 * route renders (with defaults/empty state) instead of the global 500 page.
 */
export async function primePublicQuery<T>(
  queryClient: QueryClient,
  options: { queryKey: readonly unknown[]; queryFn: () => Promise<T> },
  fallback: T,
): Promise<void> {
  try {
    await queryClient.fetchQuery(options as never);
  } catch (error) {
    console.error("[primePublicQuery] failed:", options.queryKey, error);
    queryClient.setQueryData(options.queryKey, fallback);
  }
}


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
  focus_keywords?: string[] | null;
  author_id: string | null;
  status: string;
  read_time: number | null;
  published_at: string | null;
  updated_at?: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url?: string | null;
  content?: unknown;
  author_name?: string | null;
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
  const parsed = JSON.parse(payload) as unknown;
  return Array.isArray(parsed) ? (parsed as PublishedSectionRow[]) : [];
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
  const parsed = JSON.parse(payload) as unknown;
  return Array.isArray(parsed) ? (parsed as PublishedBlogPostRow[]) : [];
}

export async function fetchBlogCategories(): Promise<PublishedCategoryRow[]> {
  const { listBlogCategories } = await import("./blog-public.functions");
  const { payload } = await listBlogCategories();
  const parsed = JSON.parse(payload) as unknown;
  return Array.isArray(parsed) ? (parsed as PublishedCategoryRow[]) : [];
}

/* ---------------- Hooks ---------------- */

export const PUBLISHED_QUERY_KEY = ["published"] as const;
export const PUBLIC_QUERY_STALE_TIME = 0;
export const PUBLIC_QUERY_GC_TIME = 5 * 60_000;

export const publishedSectionsQueryOptions = () =>
  queryOptions({
    queryKey: [...PUBLISHED_QUERY_KEY, "homepage"],
    queryFn: fetchPublishedSections,
    staleTime: PUBLIC_QUERY_STALE_TIME,
    gcTime: PUBLIC_QUERY_GC_TIME,
    refetchOnMount: false,
  });

export const siteSettingsQueryOptions = () =>
  queryOptions({
    queryKey: [...PUBLISHED_QUERY_KEY, "site_settings"],
    queryFn: fetchSiteSettings,
    staleTime: PUBLIC_QUERY_STALE_TIME,
    gcTime: PUBLIC_QUERY_GC_TIME,
    refetchOnMount: false,
  });

export const publishedBlogPostsQueryOptions = () =>
  queryOptions({
    queryKey: [...PUBLISHED_QUERY_KEY, "blog_posts"],
    queryFn: fetchPublishedBlogPosts,
    staleTime: PUBLIC_QUERY_STALE_TIME,
    gcTime: PUBLIC_QUERY_GC_TIME,
    refetchOnMount: false,
  });

export const blogCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: [...PUBLISHED_QUERY_KEY, "blog_categories"],
    queryFn: fetchBlogCategories,
    staleTime: PUBLIC_QUERY_STALE_TIME,
    gcTime: PUBLIC_QUERY_GC_TIME,
    refetchOnMount: false,
  });

export const publishedBlogPostBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: [...PUBLISHED_QUERY_KEY, "blog_post", slug],
    queryFn: () => fetchPublishedBlogPostBySlug(slug),
    staleTime: PUBLIC_QUERY_STALE_TIME,
    gcTime: PUBLIC_QUERY_GC_TIME,
    refetchOnMount: false,
  });

export function usePublishedSections() {
  return useSuspenseQuery(publishedSectionsQueryOptions());
}

export function useSiteSettings() {
  return useSuspenseQuery(siteSettingsQueryOptions());
}

export function usePublishedBlogPosts() {
  return useSuspenseQuery(publishedBlogPostsQueryOptions());
}

export function usePublishedBlogCategories() {
  return useSuspenseQuery(blogCategoriesQueryOptions());
}

export async function fetchPublishedBlogPostBySlug(
  slug: string,
): Promise<PublishedBlogPostRow | null> {
  const { getPublishedPostBySlug } = await import("./blog-public.functions");
  const { payload } = await getPublishedPostBySlug({ data: { slug } });
  if (!payload) return null;
  return JSON.parse(payload) as PublishedBlogPostRow;
}

export function usePublishedBlogPostBySlug(slug: string) {
  return useSuspenseQuery(publishedBlogPostBySlugQueryOptions(slug));
}
