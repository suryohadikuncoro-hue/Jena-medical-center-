import {
  pgTable,
  pgEnum,
  serial,
  bigint,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";

const salesOrderStatus = pgEnum("sales_order_status", ["draft", "ordered", "confirmed", "closed"]);
const priceSourceEnum = pgEnum("price_source", ["standar", "khusus", "manual"]);
const purchaseOrderStatus = pgEnum("purchase_order_status", ["sent", "confirmed"]);
const supplierInvoiceStatus = pgEnum("supplier_invoice_status", ["draft", "posted", "partial", "paid"]);
const invoiceStatus = pgEnum("invoice_status", ["draft", "issued", "partial", "paid"]);
const paymentDirection = pgEnum("payment_direction", ["in", "out"]);
const paymentMethod = pgEnum("payment_method", ["transfer", "cash", "other"]);
const accountType = pgEnum("account_type", ["asset", "liability", "equity", "revenue", "expense"]);
const normalBalanceEnum = pgEnum("normal_balance", ["debit", "credit"]);
const journalSourceType = pgEnum("journal_source_type", ["invoice", "supplier_invoice", "payment", "opening", "manual"]);
const periodStatus = pgEnum("period_status", ["open", "closed"]);

// ---------- Master data ----------

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  termDays: integer("term_days").notNull().default(30),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sku: varchar("sku", { length: 30 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default("unit"),
  basePrice: integer("base_price").notNull().default(0),
  lastCost: integer("last_cost").notNull().default(0),
  avgCost: integer("avg_cost").notNull().default(0),
  stockQty: integer("stock_qty").notNull().default(0),
  taxable: boolean("taxable").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Harga jual khusus per pelanggan. Jika belum ada baris, pesanan memakai basePrice.
export const customerPrices = pgTable("customer_prices", {
  id: serial("id").primaryKey(),
  customerId: bigint("customer_id", { mode: "number" }).notNull(),
  productId: bigint("product_id", { mode: "number" }).notNull(),
  price: integer("price").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- Sales orders ----------

export const salesOrders = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 20 }).notNull(),
  customerId: bigint("customer_id", { mode: "number" }).notNull(),
  orderDate: varchar("order_date", { length: 10 }).notNull(),
  status: salesOrderStatus("status").notNull().default("draft"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const salesOrderItems = pgTable("sales_order_items", {
  id: serial("id").primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  productId: bigint("product_id", { mode: "number" }).notNull(),
  qty: integer("qty").notNull(),
  unitPrice: integer("unit_price").notNull(),
  priceSource: priceSourceEnum("price_source").notNull().default("standar"),
});

// ---------- Purchase orders ----------

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 20 }).notNull(),
  supplierId: bigint("supplier_id", { mode: "number" }).notNull(),
  salesOrderId: bigint("sales_order_id", { mode: "number" }).notNull(),
  orderDate: varchar("order_date", { length: 10 }).notNull(),
  status: purchaseOrderStatus("status").notNull().default("sent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: bigint("po_id", { mode: "number" }).notNull(),
  productId: bigint("product_id", { mode: "number" }).notNull(),
  qty: integer("qty").notNull(),
  unitCost: integer("unit_cost").notNull(),
});

// ---------- Supplier invoices ----------

export const supplierInvoices = pgTable("supplier_invoices", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 40 }).notNull(),
  supplierId: bigint("supplier_id", { mode: "number" }).notNull(),
  poId: bigint("po_id", { mode: "number" }),
  invoiceDate: varchar("invoice_date", { length: 10 }).notNull(),
  dueDate: varchar("due_date", { length: 10 }),
  printedTotal: integer("printed_total").notNull(),
  status: supplierInvoiceStatus("status").notNull().default("draft"),
  taxInvoiceComplete: boolean("tax_invoice_complete").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supplierInvoiceItems = pgTable("supplier_invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: bigint("invoice_id", { mode: "number" }).notNull(),
  productId: bigint("product_id", { mode: "number" }).notNull(),
  qty: integer("qty").notNull(),
  unitCost: integer("unit_cost").notNull(),
  discountPercent: numeric("discount_percent", { mode: "number" }).notNull().default(0),
  ppnPercent: integer("ppn_percent").notNull().default(0),
});

// ---------- Customer invoices ----------

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 20 }).notNull(),
  customerId: bigint("customer_id", { mode: "number" }).notNull(),
  salesOrderId: bigint("sales_order_id", { mode: "number" }),
  issueDate: varchar("issue_date", { length: 10 }).notNull(),
  dueDate: varchar("due_date", { length: 10 }),
  subtotal: integer("subtotal").notNull(),
  ppnAmount: integer("ppn_amount").notNull().default(0),
  total: integer("total").notNull(),
  status: invoiceStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: bigint("invoice_id", { mode: "number" }).notNull(),
  productId: bigint("product_id", { mode: "number" }),
  description: varchar("description", { length: 200 }).notNull(),
  qty: integer("qty").notNull(),
  unitPrice: integer("unit_price").notNull(),
  discountPercent: integer("discount_percent").notNull().default(0),
  ppnPercent: integer("ppn_percent").notNull().default(0),
  taxable: boolean("taxable").notNull().default(true),
  cogsAmount: integer("cogs_amount").notNull().default(0),
});

// ---------- Payments ----------

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  direction: paymentDirection("direction").notNull(),
  invoiceId: bigint("invoice_id", { mode: "number" }),
  supplierInvoiceId: bigint("supplier_invoice_id", { mode: "number" }),
  date: varchar("date", { length: 10 }).notNull(),
  amount: integer("amount").notNull(),
  method: paymentMethod("method").notNull().default("transfer"),
  note: varchar("note", { length: 200 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Accounting ----------

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  type: accountType("type").notNull(),
  normalBalance: normalBalanceEnum("normal_balance").notNull(),
});

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 10 }).notNull(),
  memo: varchar("memo", { length: 255 }).notNull(),
  sourceType: journalSourceType("source_type").notNull(),
  sourceId: bigint("source_id", { mode: "number" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const journalLines = pgTable("journal_lines", {
  id: serial("id").primaryKey(),
  entryId: bigint("entry_id", { mode: "number" }).notNull(),
  accountId: bigint("account_id", { mode: "number" }).notNull(),
  debit: integer("debit").notNull().default(0),
  credit: integer("credit").notNull().default(0),
});

export const periods = pgTable("periods", {
  id: serial("id").primaryKey(),
  month: varchar("month", { length: 7 }).notNull(),
  status: periodStatus("status").notNull().default("open"),
});
