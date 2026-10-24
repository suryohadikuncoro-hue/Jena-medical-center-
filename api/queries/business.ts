import { eq, desc, asc, and, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./connection";
import {
  accounts,
  invoiceItems,
  invoices,
  journalEntries,
  journalLines,
  payments,
  periods,
  products,
  salesOrders,
  supplierInvoiceItems,
  supplierInvoices,
} from "@db/schema";

export const PPN_RATE = 0.11;

export const COA = {
  KAS: "1101",
  PIUTANG: "1201",
  PERSEDIAAN: "1301",
  PPN_MASUKAN: "1501",
  HUTANG: "2101",
  PPN_KELUARAN: "2201",
  MODAL: "3101",
  PENDAPATAN: "4101",
  HPP: "5101",
} as const;

// ---------- helpers ----------

async function accountId(code: string): Promise<number> {
  const db = getDb();
  const rows = await db.select().from(accounts).where(eq(accounts.code, code)).limit(1);
  if (!rows[0]) throw new Error(`Akun ${code} belum ada di bagan akun`);
  return rows[0].id;
}

export async function postJournal(
  date: string,
  memo: string,
  sourceType: "invoice" | "supplier_invoice" | "payment" | "opening" | "manual",
  sourceId: number | null,
  lines: { code: string; debit?: number; credit?: number }[],
) {
  const db = getDb();
  const clean = lines.filter((l) => (l.debit ?? 0) > 0 || (l.credit ?? 0) > 0);
  const d = clean.reduce((s, l) => s + (l.debit ?? 0), 0);
  const c = clean.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (clean.length < 2 || d !== c) {
    throw new Error(`Jurnal tidak seimbang: debit ${d} vs kredit ${c}`);
  }
  const [entry] = await db
    .insert(journalEntries)
    .values({ date, memo, sourceType, sourceId })
    .$returningId();
  for (const l of clean) {
    await db.insert(journalLines).values({
      entryId: entry.id,
      accountId: await accountId(l.code),
      debit: l.debit ?? 0,
      credit: l.credit ?? 0,
    });
  }
  return entry.id;
}

// ---------- derived values ----------

export function orderTotal(items: { qty: number; unitPrice: number }[]) {
  return items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
}

export async function invoicedAmountForOrder(orderId: number): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ subtotal: invoices.subtotal })
    .from(invoices)
    .where(and(eq(invoices.salesOrderId, orderId), sql`${invoices.status} != 'draft'`));
  return rows.reduce((s, r) => s + r.subtotal, 0);
}

export async function paidAmountForInvoice(invoiceId: number): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ amount: payments.amount })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  return rows.reduce((s, r) => s + r.amount, 0);
}

export async function paidAmountForSupplierInvoice(id: number): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ amount: payments.amount })
    .from(payments)
    .where(eq(payments.supplierInvoiceId, id));
  return rows.reduce((s, r) => s + r.amount, 0);
}

// ---------- supplier invoice posting (persediaan, HPP rata-rata, hutang) ----------

export async function postSupplierInvoice(id: number) {
  const db = getDb();
  const [inv] = await db.select().from(supplierInvoices).where(eq(supplierInvoices.id, id)).limit(1);
  if (!inv) throw new Error("Faktur tidak ditemukan");
  if (inv.status !== "draft") throw new Error("Faktur sudah dibukukan");

  const items = await db
    .select()
    .from(supplierInvoiceItems)
    .where(eq(supplierInvoiceItems.invoiceId, id));
  if (items.length === 0) throw new Error("Faktur belum punya baris barang");

  // Nilai persediaan memakai harga bersih setelah diskon; PPN hanya dipisahkan
  // bila faktur pajak lengkap dan persentase PPN item diisi.
  let stockValue = 0;
  let vatIn = 0;
  for (const it of items) {
    const [prod] = await db.select().from(products).where(eq(products.id, it.productId)).limit(1);
    if (!prod) throw new Error("Barang tidak ditemukan");
    const gross = it.qty * it.unitCost;
    const netLine = gross - Math.round(gross * it.discountPercent / 100);
    const linePpn = Math.round(netLine * it.ppnPercent / 100);
    const taxable = prod.taxable && inv.taxInvoiceComplete && it.ppnPercent > 0;
    const lineStockValue = taxable ? netLine : netLine + linePpn;
    const netCost = it.qty > 0 ? Math.round(lineStockValue / it.qty) : 0;
    vatIn += taxable ? linePpn : 0;
    stockValue += lineStockValue;

    // HPP rata-rata bergerak
    const oldQty = prod.stockQty;
    const newQty = oldQty + it.qty;
    const avgCost =
      newQty > 0 ? Math.round((oldQty * prod.avgCost + it.qty * netCost) / newQty) : netCost;
    await db
      .update(products)
      .set({ stockQty: newQty, avgCost, lastCost: netCost })
      .where(eq(products.id, prod.id));
  }

  const total = stockValue + vatIn;
  await postJournal(inv.invoiceDate, `Faktur supplier ${inv.number}`, "supplier_invoice", id, [
    { code: COA.PERSEDIAAN, debit: stockValue },
    ...(vatIn > 0 ? [{ code: COA.PPN_MASUKAN, debit: vatIn }] : []),
    { code: COA.HUTANG, credit: total },
  ]);
  await db
    .update(supplierInvoices)
    .set({ status: "posted", printedTotal: inv.printedTotal })
    .where(eq(supplierInvoices.id, id));
  return { stockValue, vatIn, total };
}

// ---------- customer invoice issue (piutang, pendapatan, HPP) ----------

export async function issueInvoice(id: number) {
  const db = getDb();
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  if (!inv) throw new Error("Invoice tidak ditemukan");
  if (inv.status !== "draft") throw new Error("Invoice sudah diterbitkan");

  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id)).limit(100);
  if (items.length === 0) throw new Error("Invoice belum punya baris");

  let cogs = 0;
  for (const it of items) {
    if (!it.productId) continue;
    const [prod] = await db.select().from(products).where(eq(products.id, it.productId)).limit(1);
    if (!prod) continue;
    const lineCogs = it.qty * prod.avgCost;
    cogs += lineCogs;
    await db
      .update(invoiceItems)
      .set({ cogsAmount: lineCogs })
      .where(eq(invoiceItems.id, it.id));
    await db
      .update(products)
      .set({ stockQty: prod.stockQty - it.qty })
      .where(eq(products.id, prod.id));
  }

  const lines: { code: string; debit?: number; credit?: number }[] = [
    { code: COA.PIUTANG, debit: inv.total },
    { code: COA.PENDAPATAN, credit: inv.subtotal },
  ];
  if (inv.ppnAmount > 0) lines.push({ code: COA.PPN_KELUARAN, credit: inv.ppnAmount });
  if (cogs > 0) {
    lines.push({ code: COA.HPP, debit: cogs });
    lines.push({ code: COA.PERSEDIAAN, credit: cogs });
  }
  await postJournal(inv.issueDate, `Invoice ${inv.number}`, "invoice", id, lines);
  await db.update(invoices).set({ status: "issued" }).where(eq(invoices.id, id));
  return { cogs };
}

// ---------- payments ----------

export async function recordPayment(input: {
  direction: "in" | "out";
  invoiceId?: number;
  supplierInvoiceId?: number;
  date: string;
  amount: number;
  method: "transfer" | "cash" | "other";
  note?: string;
}) {
  const db = getDb();
  const [p] = await db.insert(payments).values(input).$returningId();

  if (input.direction === "in" && input.invoiceId) {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, input.invoiceId)).limit(1);
    if (!inv) throw new Error("Invoice tidak ditemukan");
    await postJournal(input.date, `Pembayaran invoice ${inv.number}`, "payment", p.id, [
      { code: COA.KAS, debit: input.amount },
      { code: COA.PIUTANG, credit: input.amount },
    ]);
    const paid = await paidAmountForInvoice(inv.id);
    const status = paid >= inv.total ? "paid" : "partial";
    await db.update(invoices).set({ status }).where(eq(invoices.id, inv.id));
    if (inv.salesOrderId && status === "paid") {
      const sibs = await db
        .select({ id: invoices.id, status: invoices.status })
        .from(invoices)
        .where(eq(invoices.salesOrderId, inv.salesOrderId));
      if (sibs.every((s) => s.status === "paid")) {
        await db.update(salesOrders).set({ status: "closed" }).where(eq(salesOrders.id, inv.salesOrderId));
      }
    }
  }

  if (input.direction === "out" && input.supplierInvoiceId) {
    const [fak] = await db
      .select()
      .from(supplierInvoices)
      .where(eq(supplierInvoices.id, input.supplierInvoiceId))
      .limit(1);
    if (!fak) throw new Error("Faktur tidak ditemukan");
    await postJournal(input.date, `Pembayaran faktur ${fak.number}`, "payment", p.id, [
      { code: COA.HUTANG, debit: input.amount },
      { code: COA.KAS, credit: input.amount },
    ]);
    const paid = await paidAmountForSupplierInvoice(fak.id);
    const postedTotal = await postedSupplierInvoiceTotal(fak.id);
    const status = paid >= postedTotal ? "paid" : "partial";
    await db.update(supplierInvoices).set({ status }).where(eq(supplierInvoices.id, fak.id));
  }
  return p.id;
}

async function postedSupplierInvoiceTotal(id: number): Promise<number> {
  const db = getDb();
  const [fak] = await db.select().from(supplierInvoices).where(eq(supplierInvoices.id, id)).limit(1);
  if (!fak) return 0;
  const items = await db
    .select()
    .from(supplierInvoiceItems)
    .where(eq(supplierInvoiceItems.invoiceId, id));
  let total = 0;
  for (const it of items) {
    const gross = it.qty * it.unitCost;
    const net = gross - Math.round(gross * it.discountPercent / 100);
    total += net + Math.round(net * it.ppnPercent / 100);
  }
  return total;
}

// ---------- queries used by several routers ----------

export async function listJournalLinesForEntry(entryId: number) {
  const db = getDb();
  return db
    .select({
      id: journalLines.id,
      accountId: journalLines.accountId,
      debit: journalLines.debit,
      credit: journalLines.credit,
      accountCode: accounts.code,
      accountName: accounts.name,
    })
    .from(journalLines)
    .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
    .where(eq(journalLines.entryId, entryId))
    .orderBy(asc(journalLines.id));
}

export async function ensurePeriod(month: string) {
  const db = getDb();
  const rows = await db.select().from(periods).where(eq(periods.month, month)).limit(1);
  if (!rows[0]) await db.insert(periods).values({ month, status: "open" });
}

export { gte, lte, and, eq, desc, asc, sql };
