import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure } from "../middleware";
import { getDb } from "../queries/connection";
import {
  customers,
  invoiceItems,
  invoices,
  payments,
  products,
  salesOrderItems,
  salesOrders,
} from "@db/schema";
import { eq, desc, and, ne, inArray } from "drizzle-orm";
import { issueInvoice, paidAmountForInvoice } from "../queries/business";

const today = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; };
const addDays = (date: string, days: number) => {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

async function nextInvoiceNumber() {
  const db = getDb();
  const rows = await db.select({ number: invoices.number }).from(invoices);
  const max = rows.reduce((m, r) => {
    const n = parseInt(r.number.split("-")[1] ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `INV-${String(max + 1).padStart(4, "0")}`;
}

export const invoicesRouter = createRouter({
  list: protectedProcedure.query(async () => {
    const db = getDb();
    const rows = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        subtotal: invoices.subtotal,
        ppnAmount: invoices.ppnAmount,
        total: invoices.total,
        status: invoices.status,
        salesOrderId: invoices.salesOrderId,
        customerName: customers.name,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .orderBy(desc(invoices.id));
    const pays = await db.select().from(payments);
    return rows.map((r) => {
      const paid = pays.filter((p) => p.invoiceId === r.id).reduce((s, p) => s + p.amount, 0);
      return { ...r, paid, remaining: r.total - paid };
    });
  }),

  detail: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const [inv] = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        subtotal: invoices.subtotal,
        ppnAmount: invoices.ppnAmount,
        total: invoices.total,
        status: invoices.status,
        salesOrderId: invoices.salesOrderId,
        customerId: customers.id,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerAddress: customers.address,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.id, input.id))
      .limit(1);
    if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice tidak ditemukan" });
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id));
    const pays = await db.select().from(payments).where(eq(payments.invoiceId, inv.id)).orderBy(desc(payments.date));
    const paid = pays.reduce((s, p) => s + p.amount, 0);
    let soNumber: string | null = null;
    if (inv.salesOrderId) {
      const [so] = await db.select().from(salesOrders).where(eq(salesOrders.id, inv.salesOrderId)).limit(1);
      soNumber = so?.number ?? null;
    }
    return { invoice: inv, items, payments: pays, paid, remaining: inv.total - paid, soNumber };
  }),

  // Buat invoice (draf) dari pesanan — semua atau sebagian baris
  createFromOrder: protectedProcedure
    .input(
      z.object({
        salesOrderId: z.number(),
        issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        items: z.array(z.object({ salesOrderItemId: z.number(), qty: z.number().int().min(1) })).min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [so] = await db.select().from(salesOrders).where(eq(salesOrders.id, input.salesOrderId)).limit(1);
      if (!so) throw new TRPCError({ code: "NOT_FOUND", message: "Pesanan tidak ditemukan" });
      const [cust] = await db.select().from(customers).where(eq(customers.id, so.customerId)).limit(1);

      const soItems = await db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, so.id));

      // Kuantitas yang sudah ditagih (invoice non-draf) per barang
      const billedByProduct = new Map<number, number>();
      const prevInvs = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(and(eq(invoices.salesOrderId, so.id), ne(invoices.status, "draft")));
      if (prevInvs.length > 0) {
        const prevItems = await db
          .select()
          .from(invoiceItems)
          .where(inArray(invoiceItems.invoiceId, prevInvs.map((i) => i.id)));
        for (const pi of prevItems) {
          if (pi.productId) billedByProduct.set(pi.productId, (billedByProduct.get(pi.productId) ?? 0) + pi.qty);
        }
      }

      let subtotal = 0;
      const lines: { productId: number; description: string; qty: number; unitPrice: number; discountPercent: number; ppnPercent: number; taxable: boolean }[] = [];
      for (const sel of input.items) {
        const it = soItems.find((i) => i.id === sel.salesOrderItemId);
        if (!it) throw new TRPCError({ code: "BAD_REQUEST", message: "Baris pesanan tidak valid" });
        const remaining = it.qty - (billedByProduct.get(it.productId) ?? 0);
        const qty = Math.min(sel.qty, Math.max(0, remaining));
        if (qty === 0) continue;
        billedByProduct.set(it.productId, (billedByProduct.get(it.productId) ?? 0) + qty);
        const [prod] = await db.select().from(products).where(eq(products.id, it.productId)).limit(1);
        const amount = qty * it.unitPrice;
        subtotal += amount;
        const taxable = prod?.taxable ?? true;
        lines.push({ productId: it.productId, description: prod?.name ?? "Barang", qty, unitPrice: it.unitPrice, discountPercent: 0, ppnPercent: 0, taxable });
      }
      if (lines.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Semua barang di pesanan ini sudah ditagih." });
      }

      const issueDate = input.issueDate ?? today();
      const number = await nextInvoiceNumber();
      const [row] = await db
        .insert(invoices)
        .values({
          number,
          customerId: so.customerId,
          salesOrderId: so.id,
          issueDate,
          dueDate: addDays(issueDate, cust?.termDays ?? 30),
          subtotal,
          ppnAmount: 0,
          total: subtotal,
          status: "draft",
        })
        .returning({ id: invoices.id });
      for (const l of lines) {
        await db.insert(invoiceItems).values({ invoiceId: row.id, ...l });
      }
      return { id: row.id, number };
    }),

  updateDraft: protectedProcedure
    .input(z.object({
      id: z.number(),
      items: z.array(z.object({ id: z.number(), discountPercent: z.number().int().min(0).max(100), ppnPercent: z.number().int().min(0).max(100) })).min(1),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
      if (!inv || inv.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Hanya draft invoice yang bisa diubah" });
      for (const item of input.items) {
        await db.update(invoiceItems).set({ discountPercent: item.discountPercent, ppnPercent: item.ppnPercent }).where(eq(invoiceItems.id, item.id));
      }
      const rows = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, input.id));
      const subtotal = rows.reduce((s, r) => s + r.qty * r.unitPrice - Math.round(r.qty * r.unitPrice * r.discountPercent / 100), 0);
      const ppnAmount = rows.reduce((s, r) => {
        const net = r.qty * r.unitPrice - Math.round(r.qty * r.unitPrice * r.discountPercent / 100);
        return s + Math.round(net * r.ppnPercent / 100);
      }, 0);
      await db.update(invoices).set({ subtotal, ppnAmount, total: subtotal + ppnAmount }).where(eq(invoices.id, input.id));
      return { ok: true, subtotal, ppnAmount, total: subtotal + ppnAmount };
    }),

  // Terbitkan → jurnal piutang/pendapatan/PPN + HPP otomatis
  issue: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    return issueInvoice(input.id);
  }),

  deleteDraft: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
    if (!inv || inv.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Hanya draf yang bisa dihapus" });
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, input.id));
    await db.delete(invoices).where(eq(invoices.id, input.id));
    return { ok: true };
  }),

  paidAmount: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return { paid: await paidAmountForInvoice(input.id) };
  }),
});
