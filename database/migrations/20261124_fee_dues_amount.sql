ALTER TABLE public.fees
  ADD COLUMN IF NOT EXISTS dues_amount numeric(12, 2) NOT NULL DEFAULT 0;

-- Before dues_amount existed, pending fee amounts were the outstanding dues.
UPDATE public.fees
SET dues_amount = amount
WHERE UPPER(COALESCE(status, '')) = 'PENDING'
  AND COALESCE(dues_amount, 0) = 0
  AND COALESCE(amount, 0) <> 0;
