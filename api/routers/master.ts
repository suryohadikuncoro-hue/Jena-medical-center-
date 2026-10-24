import { z } from "zod";
import { createRouter, protectedProcedure } from "../middleware";
import { getDb } from "../queries/connection";
import { customers, customerPrices, products, suppliers } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";

export const masterRouter = createRouter({
  customers: protectedProcedure.query(async () => {
    return getDb().select().from(customers).orderBy(desc(customers.id));
  }),
  createCustomer: protectedProcedure.input(z.object({ name: z.string().min(1), phone: z.string().optional(), address: z.string().optional(), termDays: z.number().int().min(0).max(365).default(30) })).mutation(async ({ input }) => {
    const db = getDb();
    const count = await db.select().from(customers);
    const code = `C${String(count.length + 1).padStart(3, "0")}`;
    const [row] = await db.insert(customers).values({ code, ...input }).returning({ id: customers.id });
    return row;
  }),
  updateCustomer: protectedProcedure.input(z.object({ id: z.number(), name: z.string().min(1), phone: z.string().optional(), address: z.string().optional(), termDays: z.number().int().min(0).max(365) })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await getDb().update(customers).set(data).where(eq(customers.id, id));
    return { ok: true };
  }),

  suppliers: protectedProcedure.query(async () => getDb().select().from(suppliers).orderBy(desc(suppliers.id))),
  createSupplier: protectedProcedure.input(z.object({ name: z.string().min(1), phone: z.string().optional() })).mutation(async ({ input }) => {
    const db = getDb();
    const count = await db.select().from(suppliers);
    const code = `S${String(count.length + 1).padStart(3, "0")}`;
    const [row] = await db.insert(suppliers).values({ code, ...input }).returning({ id: suppliers.id });
    return row;
  }),
  updateSupplier: protectedProcedure.input(z.object({ id: z.number(), name: z.string().min(1), phone: z.string().optional() })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await getDb().update(suppliers).set(data).where(eq(suppliers.id, id));
    return { ok: true };
  }),

  products: protectedProcedure.query(async () => getDb().select().from(products).orderBy(desc(products.id))),
  createProduct: protectedProcedure.input(z.object({ name: z.string().min(1), unit: z.string().min(1), basePrice: z.number().int().min(0), taxable: z.boolean().default(true) })).mutation(async ({ input }) => {
    const db = getDb();
    const count = await db.select().from(products);
    const sku = `SKU-${String(count.length + 1).padStart(3, "0")}`;
    const [row] = await db.insert(products).values({ sku, ...input }).returning({ id: products.id });
    return row;
  }),
  updateProduct: protectedProcedure.input(z.object({ id: z.number(), name: z.string().min(1), unit: z.string().min(1), basePrice: z.number().int().min(0), taxable: z.boolean() })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await getDb().update(products).set(data).where(eq(products.id, id));
    return { ok: true };
  }),

  customerPrices: protectedProcedure.input(z.object({ customerId: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select({
      productId: products.id,
      productName: products.name,
      unit: products.unit,
      basePrice: products.basePrice,
      lastCost: products.lastCost,
      price: customerPrices.price,
    }).from(products)
      .leftJoin(customerPrices, and(eq(customerPrices.productId, products.id), eq(customerPrices.customerId, input.customerId)))
      .orderBy(desc(products.id));
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
