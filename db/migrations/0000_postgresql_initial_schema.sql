CREATE TYPE sales_order_status AS ENUM ('draft', 'ordered', 'confirmed', 'closed');
CREATE TYPE price_source AS ENUM ('standar', 'khusus', 'manual');
CREATE TYPE purchase_order_status AS ENUM ('sent', 'confirmed');
CREATE TYPE supplier_invoice_status AS ENUM ('draft', 'posted', 'partial', 'paid');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'partial', 'paid');
CREATE TYPE payment_direction AS ENUM ('in', 'out');
CREATE TYPE payment_method AS ENUM ('transfer', 'cash', 'other');
CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
CREATE TYPE normal_balance AS ENUM ('debit', 'credit');
CREATE TYPE journal_source_type AS ENUM ('invoice', 'supplier_invoice', 'payment', 'opening', 'manual');
CREATE TYPE period_status AS ENUM ('open', 'closed');

CREATE TABLE customers (
  id serial PRIMARY KEY,
  code varchar(20) NOT NULL,
  name varchar(120) NOT NULL,
  phone varchar(32),
  address text,
  term_days integer NOT NULL DEFAULT 30,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE suppliers (
  id serial PRIMARY KEY,
  code varchar(20) NOT NULL,
  name varchar(120) NOT NULL,
  phone varchar(32),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id serial PRIMARY KEY,
  sku varchar(30) NOT NULL,
  name varchar(160) NOT NULL,
  unit varchar(20) NOT NULL DEFAULT 'unit',
  base_price integer NOT NULL DEFAULT 0,
  last_cost integer NOT NULL DEFAULT 0,
  avg_cost integer NOT NULL DEFAULT 0,
  stock_qty integer NOT NULL DEFAULT 0,
  taxable boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE customer_prices (
  id serial PRIMARY KEY,
  customer_id bigint NOT NULL,
  product_id bigint NOT NULL,
  price integer NOT NULL DEFAULT 0,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE sales_orders (
  id serial PRIMARY KEY,
  number varchar(20) NOT NULL,
  customer_id bigint NOT NULL,
  order_date varchar(10) NOT NULL,
  status sales_order_status NOT NULL DEFAULT 'draft',
  note text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE sales_order_items (
  id serial PRIMARY KEY,
  order_id bigint NOT NULL,
  product_id bigint NOT NULL,
  qty integer NOT NULL,
  unit_price integer NOT NULL,
  price_source price_source NOT NULL DEFAULT 'standar'
);

CREATE TABLE purchase_orders (
  id serial PRIMARY KEY,
  number varchar(20) NOT NULL,
  supplier_id bigint NOT NULL,
  sales_order_id bigint NOT NULL,
  order_date varchar(10) NOT NULL,
  status purchase_order_status NOT NULL DEFAULT 'sent',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE purchase_order_items (
  id serial PRIMARY KEY,
  po_id bigint NOT NULL,
  product_id bigint NOT NULL,
  qty integer NOT NULL,
  unit_cost integer NOT NULL
);

CREATE TABLE supplier_invoices (
  id serial PRIMARY KEY,
  number varchar(40) NOT NULL,
  supplier_id bigint NOT NULL,
  po_id bigint,
  invoice_date varchar(10) NOT NULL,
  due_date varchar(10),
  printed_total integer NOT NULL,
  status supplier_invoice_status NOT NULL DEFAULT 'draft',
  tax_invoice_complete boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE supplier_invoice_items (
  id serial PRIMARY KEY,
  invoice_id bigint NOT NULL,
  product_id bigint NOT NULL,
  qty integer NOT NULL,
  unit_cost integer NOT NULL,
  discount_percent integer NOT NULL DEFAULT 0,
  ppn_percent integer NOT NULL DEFAULT 0
);

CREATE TABLE invoices (
  id serial PRIMARY KEY,
  number varchar(20) NOT NULL,
  customer_id bigint NOT NULL,
  sales_order_id bigint,
  issue_date varchar(10) NOT NULL,
  due_date varchar(10),
  subtotal integer NOT NULL,
  ppn_amount integer NOT NULL DEFAULT 0,
  total integer NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE invoice_items (
  id serial PRIMARY KEY,
  invoice_id bigint NOT NULL,
  product_id bigint,
  description varchar(200) NOT NULL,
  qty integer NOT NULL,
  unit_price integer NOT NULL,
  discount_percent integer NOT NULL DEFAULT 0,
  ppn_percent integer NOT NULL DEFAULT 0,
  taxable boolean NOT NULL DEFAULT true,
  cogs_amount integer NOT NULL DEFAULT 0
);

CREATE TABLE payments (
  id serial PRIMARY KEY,
  direction payment_direction NOT NULL,
  invoice_id bigint,
  supplier_invoice_id bigint,
  date varchar(10) NOT NULL,
  amount integer NOT NULL,
  method payment_method NOT NULL DEFAULT 'transfer',
  note varchar(200),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id serial PRIMARY KEY,
  code varchar(10) NOT NULL,
  name varchar(120) NOT NULL,
  type account_type NOT NULL,
  normal_balance normal_balance NOT NULL
);

CREATE TABLE journal_entries (
  id serial PRIMARY KEY,
  date varchar(10) NOT NULL,
  memo varchar(255) NOT NULL,
  source_type journal_source_type NOT NULL,
  source_id bigint,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE journal_lines (
  id serial PRIMARY KEY,
  entry_id bigint NOT NULL,
  account_id bigint NOT NULL,
  debit integer NOT NULL DEFAULT 0,
  credit integer NOT NULL DEFAULT 0
);

CREATE TABLE periods (
  id serial PRIMARY KEY,
  month varchar(7) NOT NULL,
  status period_status NOT NULL DEFAULT 'open'
);

CREATE INDEX customer_prices_customer_id_idx ON customer_prices (customer_id);
CREATE INDEX customer_prices_product_id_idx ON customer_prices (product_id);
CREATE INDEX sales_orders_customer_id_idx ON sales_orders (customer_id);
CREATE INDEX sales_order_items_order_id_idx ON sales_order_items (order_id);
CREATE INDEX sales_order_items_product_id_idx ON sales_order_items (product_id);
CREATE INDEX purchase_orders_supplier_id_idx ON purchase_orders (supplier_id);
CREATE INDEX purchase_orders_sales_order_id_idx ON purchase_orders (sales_order_id);
CREATE INDEX purchase_order_items_po_id_idx ON purchase_order_items (po_id);
CREATE INDEX supplier_invoices_supplier_id_idx ON supplier_invoices (supplier_id);
CREATE INDEX supplier_invoice_items_invoice_id_idx ON supplier_invoice_items (invoice_id);
CREATE INDEX invoices_customer_id_idx ON invoices (customer_id);
CREATE INDEX invoice_items_invoice_id_idx ON invoice_items (invoice_id);
CREATE INDEX payments_invoice_id_idx ON payments (invoice_id);
CREATE INDEX payments_supplier_invoice_id_idx ON payments (supplier_invoice_id);
CREATE INDEX journal_entries_source_idx ON journal_entries (source_type, source_id);
CREATE INDEX journal_lines_entry_id_idx ON journal_lines (entry_id);
CREATE INDEX journal_lines_account_id_idx ON journal_lines (account_id);
