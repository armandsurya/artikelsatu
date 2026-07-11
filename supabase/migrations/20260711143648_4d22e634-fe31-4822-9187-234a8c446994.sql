
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'archived';
