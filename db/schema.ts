import {
  mysqlTable,
  mysqlEnum,
  serial,
  bigint,
  varchar,
  text,
  timestamp,
  int,
  boolean,
} from "drizzle-orm/mysql-core";

// ---------- Master data ----------

export const customers = mysqlTable("customers", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  termDays: int("term_days").notNull().default(30),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const suppliers = mysqlTable("suppliers", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  sku: varchar("sku", { length: 30 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default("unit"),
  basePrice: int("base_price").notNull().default(0),
  lastCost: int("last_cost").notNull().default(0),
  avgCost: int("avg_cost").notNull().default(0),
  stockQty: int("stock_qty").notNull().default(0),
  taxable: boolean("taxable").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Harga jual khusus per pelanggan. Jika belum ada baris, pesanan memakai basePrice.
export const customerPrices = mysqlTable("customer_prices", {
  id: serial("id").primaryKey(),
  customerId: bigint("customer_id", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("product_id", { mode: "number", unsigned: true }).notNull(),
  price: int("price").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ---------- Sales orders ----------

export const salesOrders = mysqlTable("sales_orders", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 20 }).notNull(),
  customerId: bigint("customer_id", { mode: "number", unsigned: true }).notNull(),
  orderDate: varchar("order_date", { length: 10 }).notNull(),
  status: mysqlEnum("status", ["draft", "ordered", "confirmed", "closed"]).notNull().default("draft"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const salesOrderItems = mysqlTable("sales_order_items", {
  id: serial("id").primaryKey(),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("product_id", { mode: "number", unsigned: true }).notNull(),
  qty: int("qty").notNull(),
  unitPrice: int("unit_price").notNull(),
  priceSource: mysqlEnum("price_source", ["standar", "khusus", "manual"]).notNull().default("standar"),
});

// ---------- Purchase orders ----------

export const purchaseOrders = mysqlTable("purchase_orders", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 20 }).notNull(),
  supplierId: bigint("supplier_id", { mode: "number", unsigned: true }).notNull(),
  salesOrderId: bigint("sales_order_id", { mode: "number", unsigned: true }).notNull(),
  orderDate: varchar("order_date", { length: 10 }).notNull(),
  status: mysqlEnum("status", ["sent", "confirmed"]).notNull().default("sent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: bigint("po_id", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("product_id", { mode: "number", unsigned: true }).notNull(),
  qty: int("qty").notNull(),
  unitCost: int("unit_cost").notNull(),
});

// ---------- Supplier invoices ----------

export const supplierInvoices = mysqlTable("supplier_invoices", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 40 }).notNull(),
  supplierId: bigint("supplier_id", { mode: "number", unsigned: true }).notNull(),
  poId: bigint("po_id", { mode: "number", unsigned: true }),
  invoiceDate: varchar("invoice_date", { length: 10 }).notNull(),
  dueDate: varchar("due_date", { length: 10 }),
  printedTotal: int("printed_total").notNull(),
  status: mysqlEnum("status", ["draft", "posted", "partial", "paid"]).notNull().default("draft"),
  taxInvoiceComplete: boolean("tax_invoice_complete").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supplierInvoiceItems = mysqlTable("supplier_invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: bigint("invoice_id", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("product_id", { mode: "number", unsigned: true }).notNull(),
  qty: int("qty").notNull(),
  unitCost: int("unit_cost").notNull(),
  discountPercent: int("discount_percent").notNull().default(0),
  ppnPercent: int("ppn_percent").notNull().default(0),
});

// ---------- Customer invoices ----------

export const invoices = mysqlTable("invoices", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 20 }).notNull(),
  customerId: bigint("customer_id", { mode: "number", unsigned: true }).notNull(),
  salesOrderId: bigint("sales_order_id", { mode: "number", unsigned: true }),
  issueDate: varchar("issue_date", { length: 10 }).notNull(),
  dueDate: varchar("due_date", { length: 10 }),
  subtotal: int("subtotal").notNull(),
  ppnAmount: int("ppn_amount").notNull().default(0),
  total: int("total").notNull(),
  status: mysqlEnum("status", ["draft", "issued", "partial", "paid"]).notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoiceItems = mysqlTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: bigint("invoice_id", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("product_id", { mode: "number", unsigned: true }),
  description: varchar("description", { length: 200 }).notNull(),
  qty: int("qty").notNull(),
  unitPrice: int("unit_price").notNull(),
  discountPercent: int("discount_percent").notNull().default(0),
  ppnPercent: int("ppn_percent").notNull().default(0),
  taxable: boolean("taxable").notNull().default(true),
  cogsAmount: int("cogs_amount").notNull().default(0),
});

// ---------- Payments ----------

export const payments = mysqlTable("payments", {
  id: serial("id").primaryKey(),
  direction: mysqlEnum("direction", ["in", "out"]).notNull(),
  invoiceId: bigint("invoice_id", { mode: "number", unsigned: true }),
  supplierInvoiceId: bigint("supplier_invoice_id", { mode: "number", unsigned: true }),
  date: varchar("date", { length: 10 }).notNull(),
  amount: int("amount").notNull(),
  method: mysqlEnum("method", ["transfer", "cash", "other"]).notNull().default("transfer"),
  note: varchar("note", { length: 200 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Accounting ----------

export const accounts = mysqlTable("accounts", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  type: mysqlEnum("type", ["asset", "liability", "equity", "revenue", "expense"]).notNull(),
  normalBalance: mysqlEnum("normal_balance", ["debit", "credit"]).notNull(),
});

export const journalEntries = mysqlTable("journal_entries", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 10 }).notNull(),
  memo: varchar("memo", { length: 255 }).notNull(),
  sourceType: mysqlEnum("source_type", ["invoice", "supplier_invoice", "payment", "opening", "manual"]).notNull(),
  sourceId: bigint("source_id", { mode: "number", unsigned: true }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const journalLines = mysqlTable("journal_lines", {
  id: serial("id").primaryKey(),
  entryId: bigint("entry_id", { mode: "number", unsigned: true }).notNull(),
  accountId: bigint("account_id", { mode: "number", unsigned: true }).notNull(),
  debit: int("debit").notNull().default(0),
  credit: int("credit").notNull().default(0),
});

export const periods = mysqlTable("periods", {
  id: serial("id").primaryKey(),
  month: varchar("month", { length: 7 }).notNull(),
  status: mysqlEnum("status", ["open", "closed"]).notNull().default("open"),
});
