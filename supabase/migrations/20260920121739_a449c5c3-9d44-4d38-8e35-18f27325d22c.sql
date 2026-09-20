ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_choice text,
  ADD COLUMN IF NOT EXISTS activation_requested_at timestamp with time zone;