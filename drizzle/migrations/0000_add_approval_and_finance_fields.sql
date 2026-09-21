ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'aguardando_pagamento',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_notes text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registration_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS registration_activated_at timestamptz;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'mensalidade';

UPDATE public.subscriptions SET approval_status = 'aprovado', approved_at = COALESCE(approved_at, now())
  WHERE status = 'ativa' AND approval_status = 'aguardando_pagamento';

UPDATE public.subscriptions SET approval_status = 'cancelado'
  WHERE status = 'cancelada' AND approval_status = 'aguardando_pagamento';