CREATE TYPE public.app_role AS ENUM ('admin', 'sales', 'finance', 'warehouse', 'viewer');

CREATE TABLE public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.has_app_role(allowed_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text = ANY(allowed_roles)
  );
$$;
REVOKE ALL ON FUNCTION public.has_app_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_app_role(text[]) TO authenticated;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_roles_self_read ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY user_roles_admin_manage ON public.user_roles FOR ALL TO authenticated
  USING (public.has_app_role(ARRAY['admin']))
  WITH CHECK (public.has_app_role(ARRAY['admin']));

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated staff is role-aware; write access is limited by domain.
CREATE POLICY customers_read ON public.customers FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','sales','finance','warehouse','viewer']));
CREATE POLICY customers_write ON public.customers FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','sales'])) WITH CHECK (public.has_app_role(ARRAY['admin','sales']));
CREATE POLICY suppliers_read ON public.suppliers FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','sales','finance','warehouse','viewer']));
CREATE POLICY suppliers_write ON public.suppliers FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','warehouse'])) WITH CHECK (public.has_app_role(ARRAY['admin','warehouse']));
CREATE POLICY products_read ON public.products FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','sales','finance','warehouse','viewer']));
CREATE POLICY products_write ON public.products FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','warehouse'])) WITH CHECK (public.has_app_role(ARRAY['admin','warehouse']));
CREATE POLICY customer_prices_read ON public.customer_prices FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','sales','finance','warehouse','viewer']));
CREATE POLICY customer_prices_write ON public.customer_prices FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','sales'])) WITH CHECK (public.has_app_role(ARRAY['admin','sales']));
CREATE POLICY sales_orders_read ON public.sales_orders FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','sales','finance','warehouse','viewer']));
CREATE POLICY sales_orders_write ON public.sales_orders FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','sales'])) WITH CHECK (public.has_app_role(ARRAY['admin','sales']));
CREATE POLICY sales_order_items_read ON public.sales_order_items FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','sales','finance','warehouse','viewer']));
CREATE POLICY sales_order_items_write ON public.sales_order_items FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','sales'])) WITH CHECK (public.has_app_role(ARRAY['admin','sales']));
CREATE POLICY purchase_orders_read ON public.purchase_orders FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','sales','finance','warehouse','viewer']));
CREATE POLICY purchase_orders_write ON public.purchase_orders FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','warehouse'])) WITH CHECK (public.has_app_role(ARRAY['admin','warehouse']));
CREATE POLICY purchase_order_items_read ON public.purchase_order_items FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','sales','finance','warehouse','viewer']));
CREATE POLICY purchase_order_items_write ON public.purchase_order_items FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','warehouse'])) WITH CHECK (public.has_app_role(ARRAY['admin','warehouse']));
CREATE POLICY supplier_invoices_read ON public.supplier_invoices FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','finance','warehouse','viewer']));
CREATE POLICY supplier_invoices_write ON public.supplier_invoices FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','finance'])) WITH CHECK (public.has_app_role(ARRAY['admin','finance']));
CREATE POLICY supplier_invoice_items_read ON public.supplier_invoice_items FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','finance','warehouse','viewer']));
CREATE POLICY supplier_invoice_items_write ON public.supplier_invoice_items FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','finance'])) WITH CHECK (public.has_app_role(ARRAY['admin','finance']));
CREATE POLICY invoices_read ON public.invoices FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','sales','finance','viewer']));
CREATE POLICY invoices_write ON public.invoices FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','sales','finance'])) WITH CHECK (public.has_app_role(ARRAY['admin','sales','finance']));
CREATE POLICY invoice_items_read ON public.invoice_items FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','sales','finance','viewer']));
CREATE POLICY invoice_items_write ON public.invoice_items FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','sales','finance'])) WITH CHECK (public.has_app_role(ARRAY['admin','sales','finance']));
CREATE POLICY payments_read ON public.payments FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','finance','viewer']));
CREATE POLICY payments_write ON public.payments FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','finance'])) WITH CHECK (public.has_app_role(ARRAY['admin','finance']));
CREATE POLICY accounts_read ON public.accounts FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','finance','viewer']));
CREATE POLICY accounts_write ON public.accounts FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','finance'])) WITH CHECK (public.has_app_role(ARRAY['admin','finance']));
CREATE POLICY journal_entries_read ON public.journal_entries FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','finance','viewer']));
CREATE POLICY journal_entries_write ON public.journal_entries FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','finance'])) WITH CHECK (public.has_app_role(ARRAY['admin','finance']));
CREATE POLICY journal_lines_read ON public.journal_lines FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','finance','viewer']));
CREATE POLICY journal_lines_write ON public.journal_lines FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','finance'])) WITH CHECK (public.has_app_role(ARRAY['admin','finance']));
CREATE POLICY periods_read ON public.periods FOR SELECT TO authenticated USING (public.has_app_role(ARRAY['admin','finance','viewer']));
CREATE POLICY periods_write ON public.periods FOR ALL TO authenticated USING (public.has_app_role(ARRAY['admin','finance'])) WITH CHECK (public.has_app_role(ARRAY['admin','finance']));

REVOKE EXECUTE ON FUNCTION public.has_app_role(text[]) FROM anon;
