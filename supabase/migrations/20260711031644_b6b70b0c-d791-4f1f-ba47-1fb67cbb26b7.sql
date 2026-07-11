
CREATE POLICY "media read admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND public.has_any_role(auth.uid()));
CREATE POLICY "media insert admin" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.has_any_role(auth.uid()));
CREATE POLICY "media update admin" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.has_any_role(auth.uid()));
CREATE POLICY "media delete admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.has_any_role(auth.uid()));
