import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  customers,
  invoices,
  payments,
  products,
  purchaseOrderItems,
  purchaseOrders,
  salesOrderItems,
  salesOrders,
  supplierInvoiceItems,
  supplierInvoices,
  suppliers,
} from "@db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { postSupplierInvoice, orderTotal } from "../queries/business";

const today = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; };

async function nextNumber(kind: "SO" | "PO") {
  const db = getDb();
  const table = kind === "SO" ? salesOrders : purchaseOrders;
  const rows = await db.select({ number: table.number }).from(table);
  const max = rows.reduce((m, r) => {
    const n = parseInt(r.number.split("-")[1] ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${kind}-${String(max + 1).padStart(4, "0")}`;
}

export const ordersRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    const orders = await db
      .select({
        id: salesOrders.id,
        number: salesOrders.number,
        orderDate: salesOrders.orderDate,
        status: salesOrders.status,
        customerName: customers.name,
        termDays: customers.termDays,
      })
      .from(salesOrders)
      .innerJoin(customers, eq(salesOrders.customerId, customers.id))
      .orderBy(desc(salesOrders.id));
    const items = await db.select().from(salesOrderItems);
    const invs = await db
      .select({ id: invoices.id, salesOrderId: invoices.salesOrderId, subtotal: invoices.subtotal, status: invoices.status })
      .from(invoices);
    return orders.map((o) => {
      const its = items.filter((i) => i.orderId === o.id);
      const inv = invs.filter((v) => v.salesOrderId === o.id);
      return {
        ...o,
        total: orderTotal(its),
        itemCount: its.length,
        invoiced: inv.filter((v) => v.status !== "draft").reduce((s, v) => s + v.subtotal, 0),
        invoiceCount: inv.length,
      };
    });
  }),

  detail: publicQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const [order] = await db
      .select({
        id: salesOrders.id,
        number: salesOrders.number,
        orderDate: salesOrders.orderDate,
        status: salesOrders.status,
        note: salesOrders.note,
        customerId: customers.id,
        customerName: customers.name,
        customerPhone: customers.phone,
        termDays: customers.termDays,
      })
      .from(salesOrders)
      .innerJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(eq(salesOrders.id, input.id))
      .limit(1);
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Pesanan tidak ditemukan" });

    const items = await db
      .select({
        id: salesOrderItems.id,
        productId: products.id,
        productName: products.name,
        unit: products.unit,
        qty: salesOrderItems.qty,
        unitPrice: salesOrderItems.unitPrice,
        priceSource: salesOrderItems.priceSource,
        lastCost: products.lastCost,
        avgCost: products.avgCost,
        basePrice: products.basePrice,
      })
      .from(salesOrderItems)
      .innerJoin(products, eq(salesOrderItems.productId, products.id))
      .where(eq(salesOrderItems.orderId, order.id));

    const pos = await db
      .select({
        id: purchaseOrders.id,
        number: purchaseOrders.number,
        status: purchaseOrders.status,
        orderDate: purchaseOrders.orderDate,
        supplierId: suppliers.id,
        supplierName: suppliers.name,
        supplierPhone: suppliers.phone,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(eq(purchaseOrders.salesOrderId, order.id));

    const poItems = pos.length
      ? await db.select().from(purchaseOrderItems)
      : [];

    const invs = await db
      .select()
      .from(invoices)
      .where(eq(invoices.salesOrderId, order.id))
      .orderBy(asc(invoices.id));

    // fetch faktur for every PO of this order
    const allFaktur = pos.length
      ? (await db.select().from(supplierInvoices)).filter((f) =>
          pos.some((p) => p.id === f.poId),
        )
      : [];

    return {
      order,
      items: items.map((i) => ({
        ...i,
        amount: i.qty * i.unitPrice,
        marginPct: i.unitPrice > 0 ? Math.round(((i.unitPrice - i.lastCost) / i.unitPrice) * 100) : 0,
        belowCost: i.unitPrice < i.lastCost,
      })),
      total: orderTotal(items),
      pos: pos.map((p) => ({
        ...p,
        items: poItems.filter((pi) => pi.poId === p.id),
        faktur: allFaktur.filter((f) => f.poId === p.id),
      })),
      invoices: invs,
    };
  }),

  create: publicQuery
    .input(
      z.object({
        customerId: z.number(),
        orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        note: z.string().optional(),
        items: z
          .array(
            z.object({
              productId: z.number(),
              qty: z.number().int().min(1),
              unitPrice: z.number().int().min(0),
              priceSource: z.enum(["standar", "khusus", "manual"]),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const number = await nextNumber("SO");
      const [row] = await db
        .insert(salesOrders)
        .values({ number, customerId: input.customerId, orderDate: input.orderDate, note: input.note, status: "draft" })
        .$returningId();
      for (const it of input.items) {
        await db.insert(salesOrderItems).values({ orderId: row.id, ...it });
      }
      return { id: row.id, number };
    }),

  // Buat order ke supplier untuk (sebagian) baris pesanan
  orderToSupplier: publicQuery
    .input(
      z.object({
        salesOrderId: z.number(),
        supplierId: z.number(),
        items: z.array(z.object({ productId: z.number(), qty: z.number().int().min(1), unitCost: z.number().int().min(0) })).min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const number = await nextNumber("PO");
      const [row] = await db
        .insert(purchaseOrders)
        .values({
          number,
          supplierId: input.supplierId,
          salesOrderId: input.salesOrderId,
          orderDate: today(),
          status: "sent",
        })
        .$returningId();
      for (const it of input.items) {
        await db.insert(purchaseOrderItems).values({ poId: row.id, ...it });
      }
      const [so] = await db.select().from(salesOrders).where(eq(salesOrders.id, input.salesOrderId)).limit(1);
      if (so?.status === "draft") {
        await db.update(salesOrders).set({ status: "ordered" }).where(eq(salesOrders.id, input.salesOrderId));
      }
      return { id: row.id, number };
    }),

  // Catat balasan supplier → pesanan terkonfirmasi
  confirmPurchaseOrder: publicQuery
    .input(z.object({ poId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(purchaseOrders).set({ status: "confirmed" }).where(eq(purchaseOrders.id, input.poId));
      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.poId)).limit(1);
      if (po) {
        const siblings = await db
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.salesOrderId, po.salesOrderId));
        if (siblings.every((s) => s.status === "confirmed")) {
          await db.update(salesOrders).set({ status: "confirmed" }).where(eq(salesOrders.id, po.salesOrderId));
        }
      }
      return { ok: true };
    }),

  // Catat faktur supplier (draf, belum dibukukan)
  recordSupplierInvoice: publicQuery
    .input(
      z.object({
        poId: z.number(),
        number: z.string().min(1),
        invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        printedTotal: z.number().int().min(0),
        taxInvoiceComplete: z.boolean().default(false),
        items: z.array(z.object({
          productId: z.number(),
          qty: z.number().int().min(1),
          unitCost: z.number().int().min(0),
          discountPercent: z.number().int().min(0).max(100).default(0),
          ppnPercent: z.number().int().min(0).max(100).default(0),
        })).min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.poId)).limit(1);
      if (!po) throw new TRPCError({ code: "NOT_FOUND", message: "Order supplier tidak ditemukan" });
      const [row] = await db
        .insert(supplierInvoices)
        .values({
          number: input.number,
          supplierId: po.supplierId,
          poId: po.id,
          invoiceDate: input.invoiceDate,
          dueDate: input.dueDate ?? null,
          printedTotal: input.printedTotal,
          taxInvoiceComplete: input.taxInvoiceComplete,
          status: "draft",
        })
        .$returningId();
      for (const it of input.items) {
        await db.insert(supplierInvoiceItems).values({ invoiceId: row.id, ...it });
      }
      return { id: row.id };
    }),

  postSupplierInvoice: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return postSupplierInvoice(input.id);
    }),

  supplierInvoices: publicQuery.query(async () => {
    const db = getDb();
    const fakturs = await db
      .select({
        id: supplierInvoices.id,
        number: supplierInvoices.number,
        invoiceDate: supplierInvoices.invoiceDate,
        dueDate: supplierInvoices.dueDate,
        printedTotal: supplierInvoices.printedTotal,
        status: supplierInvoices.status,
        taxInvoiceComplete: supplierInvoices.taxInvoiceComplete,
        supplierName: suppliers.name,
        poId: supplierInvoices.poId,
      })
      .from(supplierInvoices)
      .innerJoin(suppliers, eq(supplierInvoices.supplierId, suppliers.id))
      .orderBy(desc(supplierInvoices.id));
    const items = await db.select().from(supplierInvoiceItems);
    const pays = await db.select().from(payments);
    return fakturs.map((f) => {
      const its = items.filter((i) => i.invoiceId === f.id);
      const computed = its.reduce((s, i) => {
        const gross = i.qty * i.unitCost;
        const net = gross - Math.round(gross * i.discountPercent / 100);
        return s + net + Math.round(net * i.ppnPercent / 100);
      }, 0);
      const paid = pays.filter((p) => p.supplierInvoiceId === f.id).reduce((s, p) => s + p.amount, 0);
      return { ...f, computedTotal: computed, selisih: f.printedTotal - computed, paid, remaining: computed - paid };
    });
  }),
});
