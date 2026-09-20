ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS reward_receipt_path text,
  ADD COLUMN IF NOT EXISTS reward_receipt_note text,
  ADD COLUMN IF NOT EXISTS reward_paid_at timestamp with time zone;