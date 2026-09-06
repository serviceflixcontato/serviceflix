CREATE TABLE public.service_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_id uuid REFERENCES public.service_requests(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'cliente',
  storage_path text NOT NULL,
  caption text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_photos TO authenticated;
GRANT ALL ON public.service_photos TO service_role;

ALTER TABLE public.service_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes veem fotos dos seus atendimentos"
ON public.service_photos FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clientes enviam fotos das suas solicitacoes"
ON public.service_photos FOR INSERT TO authenticated
WITH CHECK ((auth.uid() = user_id AND kind = 'cliente') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins atualizam fotos"
ON public.service_photos FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins removem fotos"
ON public.service_photos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX service_photos_user_idx ON public.service_photos(user_id);
CREATE INDEX service_photos_request_idx ON public.service_photos(request_id);

CREATE POLICY "Fotos de servico: leitura propria ou admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'service-photos'
  AND (public.has_role(auth.uid(), 'admin') OR (storage.foldername(name))[1] = auth.uid()::text)
);

CREATE POLICY "Fotos de servico: envio proprio ou admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'service-photos'
  AND (public.has_role(auth.uid(), 'admin') OR (storage.foldername(name))[1] = auth.uid()::text)
);

CREATE POLICY "Fotos de servico: admin remove"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'service-photos' AND public.has_role(auth.uid(), 'admin'));