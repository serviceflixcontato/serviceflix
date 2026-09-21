CREATE POLICY "Fotos prestadores: leitura autenticada" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'provider-photos');

CREATE POLICY "Fotos prestadores: admin envia" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'provider-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Fotos prestadores: admin atualiza" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'provider-photos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'provider-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Fotos prestadores: admin remove" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'provider-photos' AND public.has_role(auth.uid(), 'admin'));