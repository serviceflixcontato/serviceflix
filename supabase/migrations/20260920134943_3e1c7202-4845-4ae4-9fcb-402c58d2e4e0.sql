ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS materials_needed text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS team_message text,
  ADD COLUMN IF NOT EXISTS schedule_status text NOT NULL DEFAULT 'sem_agendamento',
  ADD COLUMN IF NOT EXISTS client_response_note text,
  ADD COLUMN IF NOT EXISTS client_responded_at timestamptz;

CREATE POLICY "requests_admin_all" ON public.service_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));