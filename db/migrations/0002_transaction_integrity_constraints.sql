-- Unique business identifiers and one customer-specific price per product.
CREATE UNIQUE INDEX customers_code_unique ON public.customers (code);
CREATE UNIQUE INDEX suppliers_code_unique ON public.suppliers (code);
CREATE UNIQUE INDEX products_sku_unique ON public.products (sku);
CREATE UNIQUE INDEX sales_orders_number_unique ON public.sales_orders (number);
CREATE UNIQUE INDEX purchase_orders_number_unique ON public.purchase_orders (number);
CREATE UNIQUE INDEX supplier_invoices_number_unique ON public.supplier_invoices (number);
CREATE UNIQUE INDEX invoices_number_unique ON public.invoices (number);
CREATE UNIQUE INDEX periods_month_unique ON public.periods (month);
CREATE UNIQUE INDEX customer_prices_customer_product_unique ON public.customer_prices (customer_id, product_id);

-- Foreign keys are marked NOT VALID so existing data is preserved; new writes are checked immediately.
ALTER TABLE public.customer_prices ADD CONSTRAINT customer_prices_customer_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id) NOT VALID;
ALTER TABLE public.customer_prices ADD CONSTRAINT customer_prices_product_fk FOREIGN KEY (product_id) REFERENCES public.products(id) NOT VALID;
ALTER TABLE public.sales_orders ADD CONSTRAINT sales_orders_customer_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id) NOT VALID;
ALTER TABLE public.sales_order_items ADD CONSTRAINT sales_order_items_order_fk FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) NOT VALID;
ALTER TABLE public.sales_order_items ADD CONSTRAINT sales_order_items_product_fk FOREIGN KEY (product_id) REFERENCES public.products(id) NOT VALID;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_supplier_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) NOT VALID;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_sales_order_fk FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) NOT VALID;
ALTER TABLE public.purchase_order_items ADD CONSTRAINT purchase_order_items_po_fk FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) NOT VALID;
ALTER TABLE public.purchase_order_items ADD CONSTRAINT purchase_order_items_product_fk FOREIGN KEY (product_id) REFERENCES public.products(id) NOT VALID;
ALTER TABLE public.supplier_invoices ADD CONSTRAINT supplier_invoices_supplier_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) NOT VALID;
ALTER TABLE public.supplier_invoices ADD CONSTRAINT supplier_invoices_po_fk FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) NOT VALID;
ALTER TABLE public.supplier_invoice_items ADD CONSTRAINT supplier_invoice_items_invoice_fk FOREIGN KEY (invoice_id) REFERENCES public.supplier_invoices(id) NOT VALID;
ALTER TABLE public.supplier_invoice_items ADD CONSTRAINT supplier_invoice_items_product_fk FOREIGN KEY (product_id) REFERENCES public.products(id) NOT VALID;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_customer_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id) NOT VALID;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_sales_order_fk FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) NOT VALID;
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_invoice_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) NOT VALID;
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_product_fk FOREIGN KEY (product_id) REFERENCES public.products(id) NOT VALID;
ALTER TABLE public.payments ADD CONSTRAINT payments_invoice_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) NOT VALID;
ALTER TABLE public.payments ADD CONSTRAINT payments_supplier_invoice_fk FOREIGN KEY (supplier_invoice_id) REFERENCES public.supplier_invoices(id) NOT VALID;
ALTER TABLE public.journal_lines ADD CONSTRAINT journal_lines_entry_fk FOREIGN KEY (entry_id) REFERENCES public.journal_entries(id) NOT VALID;
ALTER TABLE public.journal_lines ADD CONSTRAINT journal_lines_account_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id) NOT VALID;

-- Domain invariants are checked for all future writes; validation of old rows can be run after review.
ALTER TABLE public.payments ADD CONSTRAINT payments_single_target_check CHECK ((direction = 'in' AND invoice_id IS NOT NULL AND supplier_invoice_id IS NULL) OR (direction = 'out' AND supplier_invoice_id IS NOT NULL AND invoice_id IS NULL)) NOT VALID;
ALTER TABLE public.products ADD CONSTRAINT products_nonnegative_stock_check CHECK (stock_qty >= 0) NOT VALID;
ALTER TABLE public.payments ADD CONSTRAINT payments_positive_amount_check CHECK (amount > 0) NOT VALID;
ALTER TABLE public.sales_order_items ADD CONSTRAINT sales_order_items_positive_check CHECK (qty > 0 AND unit_price >= 0) NOT VALID;
ALTER TABLE public.purchase_order_items ADD CONSTRAINT purchase_order_items_positive_check CHECK (qty > 0 AND unit_cost >= 0) NOT VALID;
ALTER TABLE public.supplier_invoice_items ADD CONSTRAINT supplier_invoice_items_positive_check CHECK (qty > 0 AND unit_cost >= 0 AND discount_percent BETWEEN 0 AND 100 AND ppn_percent BETWEEN 0 AND 100) NOT VALID;
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_positive_check CHECK (qty > 0 AND unit_price >= 0 AND discount_percent BETWEEN 0 AND 100 AND ppn_percent BETWEEN 0 AND 100) NOT VALID;
