import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure } from "../middleware";
import { getDb } from "../queries/connection";
import { customers, customerPrices, invoiceItems, products, purchaseOrderItems, purchaseOrders, salesOrderItems, salesOrders, supplierInvoiceItems, supplierInvoices, suppliers } from "@db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { nextSequentialCode } from "../queries/master-code";

export const masterRouter = createRouter({
  customers: protectedProcedure.query(async () => getDb().select().from(customers).orderBy(desc(customers.id))),
  createCustomer: protectedProcedure.input(z.object({ name: z.string().min(1), phone: z.string().optional(), address: z.string().optional(), termDays: z.number().int().min(0).max(365).default(30) })).mutation(async ({ input }) => {
    const db = getDb();
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1, hashtext('jena:customers-code'))`);
      const rows = await tx.select({ code: customers.code }).from(customers);
      const code = nextSequentialCode("C", rows.map((row) => row.code));
      const [row] = await tx.insert(customers).values({ code, ...input }).returning({ id: customers.id });
      return row;
    });
  }),
  updateCustomer: protectedProcedure.input(z.object({ id: z.number(), name: z.string().min(1), phone: z.string().optional(), address: z.string().optional(), termDays: z.number().int().min(0).max(365) })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await getDb().update(customers).set(data).where(eq(customers.id, id));
    return { ok: true };
  }),
  deleteCustomer: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    const linked = await db.select({ id: salesOrders.id }).from(salesOrders).where(eq(salesOrders.customerId, input.id)).limit(1);
    if (linked.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Pelanggan tidak bisa dihapus karena sudah dipakai pesanan." });
    await db.delete(customerPrices).where(eq(customerPrices.customerId, input.id));
    await db.delete(customers).where(eq(customers.id, input.id));
    return { ok: true };
  }),

  suppliers: protectedProcedure.query(async () => getDb().select().from(suppliers).orderBy(desc(suppliers.id))),
  createSupplier: protectedProcedure.input(z.object({ name: z.string().min(1), phone: z.string().optional() })).mutation(async ({ input }) => {
    const db = getDb();
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1, hashtext('jena:suppliers-code'))`);
      const rows = await tx.select({ code: suppliers.code }).from(suppliers);
      const code = nextSequentialCode("S", rows.map((row) => row.code));
      const [row] = await tx.insert(suppliers).values({ code, ...input }).returning({ id: suppliers.id });
      return row;
    });
  }),
  updateSupplier: protectedProcedure.input(z.object({ id: z.number(), name: z.string().min(1), phone: z.string().optional() })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await getDb().update(suppliers).set(data).where(eq(suppliers.id, id));
    return { ok: true };
  }),
  deleteSupplier: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    const poRefs = await db.select({ id: purchaseOrders.id }).from(purchaseOrders).where(eq(purchaseOrders.supplierId, input.id)).limit(1);
    const invoiceRefs = await db.select({ id: supplierInvoices.id }).from(supplierInvoices).where(eq(supplierInvoices.supplierId, input.id)).limit(1);
    if (poRefs.length || invoiceRefs.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Supplier tidak bisa dihapus karena sudah dipakai transaksi." });
    await db.delete(suppliers).where(eq(suppliers.id, input.id));
    return { ok: true };
  }),

  products: protectedProcedure.query(async () => getDb().select().from(products).orderBy(desc(products.id))),
  createProduct: protectedProcedure.input(z.object({ name: z.string().min(1), unit: z.string().min(1), basePrice: z.number().int().min(0), taxable: z.boolean().default(true) })).mutation(async ({ input }) => {
    const db = getDb();
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1, hashtext('jena:products-sku'))`);
      const rows = await tx.select({ sku: products.sku }).from(products);
      const sku = nextSequentialCode("SKU-", rows.map((row) => row.sku));
      const [row] = await tx.insert(products).values({ sku, ...input }).returning({ id: products.id });
      return row;
    });
  }),
  updateProduct: protectedProcedure.input(z.object({ id: z.number(), name: z.string().min(1), unit: z.string().min(1), basePrice: z.number().int().min(0), taxable: z.boolean() })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await getDb().update(products).set(data).where(eq(products.id, id));
    return { ok: true };
  }),
  deleteProduct: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    const [so] = await db.select({ id: salesOrderItems.id }).from(salesOrderItems).where(eq(salesOrderItems.productId, input.id)).limit(1);
    const [po] = await db.select({ id: purchaseOrderItems.id }).from(purchaseOrderItems).where(eq(purchaseOrderItems.productId, input.id)).limit(1);
    const [inv] = await db.select({ id: invoiceItems.id }).from(invoiceItems).where(eq(invoiceItems.productId, input.id)).limit(1);
    const [fak] = await db.select({ id: supplierInvoiceItems.id }).from(supplierInvoiceItems).where(eq(supplierInvoiceItems.productId, input.id)).limit(1);
    if (so || po || inv || fak) throw new TRPCError({ code: "BAD_REQUEST", message: "Barang tidak bisa dihapus karena sudah dipakai transaksi." });
    await db.delete(customerPrices).where(eq(customerPrices.productId, input.id));
    await db.delete(products).where(eq(products.id, input.id));
    return { ok: true };
  }),

  customerPrices: protectedProcedure.input(z.object({ customerId: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select({ productId: products.id, productName: products.name, unit: products.unit, basePrice: products.basePrice, lastCost: products.lastCost, price: customerPrices.price }).from(products)
      .leftJoin(customerPrices, and(eq(customerPrices.productId, products.id), eq(customerPrices.customerId, input.customerId))).orderBy(desc(products.id));
    return rows.map((r) => {
      const price = r.price ?? r.basePrice;
      return { ...r, price, isSpecial: r.price !== null, marginPct: price > 0 ? Math.round(((price - r.lastCost) / price) * 100) : 0 };
    });
  }),
  setCustomerPrice: protectedProcedure.input(z.object({ customerId: z.number(), productId: z.number(), price: z.number().int().min(0) })).mutation(async ({ input }) => {
    const db = getDb();
    const existing = await db.select({ id: customerPrices.id }).from(customerPrices).where(and(eq(customerPrices.customerId, input.customerId), eq(customerPrices.productId, input.productId))).limit(1);
    if (existing[0]) await db.update(customerPrices).set({ price: input.price }).where(eq(customerPrices.id, existing[0].id));
    else await db.insert(customerPrices).values(input);
    return { ok: true };
  }),
});
