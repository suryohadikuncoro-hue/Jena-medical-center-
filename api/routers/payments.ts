import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { customers, invoices, payments, supplierInvoiceItems, supplierInvoices, suppliers } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { recordPayment } from "../queries/business";

export const paymentsRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(payments).orderBy(desc(payments.id));
    const invs = await db.select({ id: invoices.id, number: invoices.number }).from(invoices);
    const faks = await db.select({ id: supplierInvoices.id, number: supplierInvoices.number }).from(supplierInvoices);
    return rows.map((p) => ({
      ...p,
      refNumber:
        p.direction === "in"
          ? invs.find((i) => i.id === p.invoiceId)?.number ?? "-"
          : faks.find((f) => f.id === p.supplierInvoiceId)?.number ?? "-",
    }));
  }),

  // Tagihan yang masih punya sisa (untuk dropdown pembayaran)
  open: publicQuery.query(async () => {
    const db = getDb();
    const invs = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        total: invoices.total,
        status: invoices.status,
        customerName: customers.name,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .orderBy(desc(invoices.id));
    const faks = await db
      .select({
        id: supplierInvoices.id,
        number: supplierInvoices.number,
        status: supplierInvoices.status,
        supplierName: suppliers.name,
      })
      .from(supplierInvoices)
      .innerJoin(suppliers, eq(supplierInvoices.supplierId, suppliers.id))
      .orderBy(desc(supplierInvoices.id));
    const siItems = await db.select().from(supplierInvoiceItems);
    const pays = await db.select().from(payments);

    const openInvoices = invs
      .map((i) => ({ ...i, paid: pays.filter((p) => p.invoiceId === i.id).reduce((s, p) => s + p.amount, 0) }))
      .map((i) => ({ ...i, remaining: i.total - i.paid }))
      .filter((i) => i.status !== "draft" && i.remaining > 0);

    const openFaktur = faks
      .map((f) => {
        const total = siItems.filter((i) => i.invoiceId === f.id).reduce((s, i) => {
          const gross = i.qty * i.unitCost;
          const net = gross - Math.round(gross * i.discountPercent / 100);
          return s + net + Math.round(net * i.ppnPercent / 100);
        }, 0);
        const paid = pays.filter((p) => p.supplierInvoiceId === f.id).reduce((s, p) => s + p.amount, 0);
        return { ...f, total, paid, remaining: total - paid };
      })
      .filter((f) => f.status !== "draft" && f.remaining > 0);

    return { invoices: openInvoices, supplierInvoices: openFaktur };
  }),

  record: publicQuery
    .input(
      z.object({
        direction: z.enum(["in", "out"]),
        invoiceId: z.number().optional(),
        supplierInvoiceId: z.number().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        amount: z.number().int().min(1),
        method: z.enum(["transfer", "cash", "other"]).default("transfer"),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return { id: await recordPayment(input) };
    }),
});
