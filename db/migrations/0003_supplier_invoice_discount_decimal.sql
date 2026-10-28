-- Preserve existing whole-number discounts while allowing fractional percentages.
ALTER TABLE public.supplier_invoice_items
  ALTER COLUMN discount_percent DROP DEFAULT;

ALTER TABLE public.supplier_invoice_items
  ALTER COLUMN discount_percent TYPE numeric
  USING discount_percent::numeric;

ALTER TABLE public.supplier_invoice_items
  ALTER COLUMN discount_percent SET DEFAULT 0;
