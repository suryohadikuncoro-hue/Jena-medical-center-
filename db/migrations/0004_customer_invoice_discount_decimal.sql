-- Keep existing whole-number discounts while allowing fractional percentages on customer invoices.
ALTER TABLE public.invoice_items
  ALTER COLUMN discount_percent DROP DEFAULT;
ALTER TABLE public.invoice_items
  ALTER COLUMN discount_percent TYPE numeric
  USING discount_percent::numeric;
ALTER TABLE public.invoice_items
  ALTER COLUMN discount_percent SET DEFAULT 0;
