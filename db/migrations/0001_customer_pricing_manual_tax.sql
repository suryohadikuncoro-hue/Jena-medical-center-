-- PostgreSQL migration for customer-specific prices and invoice tax/discount fields.
-- Keep this idempotent because the initial schema may already define these columns.
CREATE TABLE IF NOT EXISTS public.customer_prices (
  id SERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_invoice_items
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ppn_percent INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ppn_percent INTEGER NOT NULL DEFAULT 0;
