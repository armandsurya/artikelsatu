
-- 1) Normalize legacy {html: "..."} rows to plain string form.
UPDATE public.blog_posts
   SET content = to_jsonb(content->>'html')
 WHERE jsonb_typeof(content) = 'object'
   AND content ? 'html';

-- 2) Any remaining non-string content (unexpected shapes) → empty string
--    so reader code never sees "object"/"array"/"number" going forward.
UPDATE public.blog_posts
   SET content = to_jsonb(''::text)
 WHERE content IS NOT NULL
   AND jsonb_typeof(content) NOT IN ('string', 'null');

-- 3) Enforce string-or-null shape from now on.
ALTER TABLE public.blog_posts
  DROP CONSTRAINT IF EXISTS blog_posts_content_is_string;
ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_content_is_string
  CHECK (content IS NULL OR jsonb_typeof(content) = 'string');
