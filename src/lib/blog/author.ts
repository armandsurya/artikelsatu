/**
 * Single source of truth for author display.
 *
 * Author names always come from `profiles.full_name` joined via
 * `blog_posts.author_id`, so renaming a profile updates every article.
 * The fallback below is used ONLY when a post has no valid author relation
 * (legacy rows imported before author_id existed).
 */
export const FALLBACK_AUTHOR = "Tim Redaksi";

export function authorDisplayName(name?: string | null) {
  return name?.trim() || FALLBACK_AUTHOR;
}
