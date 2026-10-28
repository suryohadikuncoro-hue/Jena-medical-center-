import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import postgres, { type Sql } from "postgres";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import worker from "./worker";
import type { AppRouter } from "./router";

const token = "local-smoke-auth-token";
const databaseUrl = process.env.SMOKE_TEST_DATABASE_URL ?? "";
const parsedDatabaseUrl = databaseUrl ? new URL(databaseUrl) : null;
if (parsedDatabaseUrl && (
  !["127.0.0.1", "localhost", "::1"].includes(parsedDatabaseUrl.hostname) ||
  parsedDatabaseUrl.pathname !== "/jena_smoke_test"
)) {
  throw new Error("Safety stop: SMOKE_TEST_DATABASE_URL must point only to local database jena_smoke_test.");
}

let sql: Sql;
let authServer: Server;
let authUrl = "";
const workerBindings = {
  HYPERDRIVE: { connectionString: databaseUrl },
  SUPABASE_URL: "",
  SUPABASE_PUBLISHABLE_KEY: "local-smoke-publishable-key",
  FRONTEND_ORIGIN: "http://127.0.0.1:4173",
};

function makeClient(authenticated: boolean) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "http://local-worker.test/api/trpc",
        transformer: superjson,
        headers: () => authenticated ? { authorization: `Bearer ${token}` } : {},
        fetch: async (input, init) => worker.fetch(new Request(input, init), workerBindings as never),
      }),
    ],
  });
}

const api = makeClient(true);
const anonymousApi = makeClient(false);
const date = "2026-10-26";

async function expectFailure(action: () => Promise<unknown>, expectedText: string) {
  try {
    await action();
    throw new Error(`Expected failure containing: ${expectedText}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    expect(message).toContain(expectedText);
  }
}

async function createOrder(productId: number, qty: number, note: string) {
  const created = await api.orders.create.mutate({
    customerId: 1,
    orderDate: date,
    note,
    items: [{ productId, qty, unitPrice: 10_000, priceSource: "manual" }],
  });
  const detail = await api.orders.detail.query({ id: created.id });
  const line = detail.items[0];
  if (!line) throw new Error("Test fixture order item was not returned.");
  return { orderId: created.id, orderItemId: line.id };
}

async function createDraftInvoice(productId: number, qty: number, note: string) {
  const order = await createOrder(productId, qty, note);
  return api.invoices.createFromOrder.mutate({
    salesOrderId: order.orderId,
    issueDate: date,
    items: [{ salesOrderItemId: order.orderItemId, qty }],
  });
}

beforeAll(async () => {
  if (!databaseUrl) return;
  sql = postgres(databaseUrl, { max: 2, prepare: false, fetch_types: false });
  authServer = createServer((req, res) => {
    if (req.url === "/auth/v1/user" && req.headers.authorization === `Bearer ${token}` && req.headers.apikey === workerBindings.SUPABASE_PUBLISHABLE_KEY) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id: "00000000-0000-4000-8000-000000000001", email: "local-smoke@example.invalid" }));
      return;
    }
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "local smoke auth rejected" }));
  });
  await new Promise<void>((resolve) => authServer.listen(0, "127.0.0.1", resolve));
  const address = authServer.address();
  if (!address || typeof address === "string") throw new Error("Could not start local auth stub.");
  authUrl = `http://127.0.0.1:${address.port}`;
  workerBindings.SUPABASE_URL = authUrl;
});

afterAll(async () => {
  if (sql) await sql.end({ timeout: 2 });
  if (authServer?.listening) await new Promise<void>((resolve, reject) => authServer.close((error) => error ? reject(error) : resolve()));
});

describe.skipIf(!databaseUrl)("authenticated local smoke simulation (local PostgreSQL only)", () => {
  it("rejects an unauthenticated request and accepts the local test token", async () => {
    await expectFailure(() => anonymousApi.master.products.query(), "Login diperlukan");
    const products = await api.master.products.query();
    expect(products.length).toBe(2);
  });

  it("issues a customer invoice atomically, rejects overpayment, and records a valid payment", async () => {
    const draft = await createDraftInvoice(1, 2, "smoke invoice and payment");
    const issued = await api.invoices.issue.mutate({ id: draft.id });
    expect(issued).toHaveProperty("cogs");
    const issuedInvoice = await api.invoices.detail.query({ id: draft.id });
    expect(issuedInvoice.invoice.status).toBe("issued");
    expect(issuedInvoice.invoice.total).toBe(20_000);
    expect((await sql`select stock_qty from products where id = 1`)[0].stock_qty).toBe(8);

    const paymentsBefore = Number((await sql`select count(*)::int as count from payments`)[0].count);
    const journalsBefore = Number((await sql`select count(*)::int as count from journal_entries`)[0].count);
    await expectFailure(
      () => api.payments.record.mutate({ direction: "in", invoiceId: draft.id, date, amount: 20_001, method: "cash" }),
      "melebihi sisa",
    );
    expect(Number((await sql`select count(*)::int as count from payments`)[0].count)).toBe(paymentsBefore);
    expect(Number((await sql`select count(*)::int as count from journal_entries`)[0].count)).toBe(journalsBefore);

    await api.payments.record.mutate({ direction: "in", invoiceId: draft.id, date, amount: 10_000, method: "cash", note: "local smoke test" });
    const partiallyPaid = await api.invoices.detail.query({ id: draft.id });
    expect(partiallyPaid.invoice.status).toBe("partial");
    expect(partiallyPaid.paid).toBe(10_000);
  });

  it("posts a supplier invoice and updates local stock and journal", async () => {
    const order = await createOrder(2, 1, "smoke supplier posting");
    const po = await api.orders.orderToSupplier.mutate({
      salesOrderId: order.orderId,
      supplierId: 1,
      items: [{ productId: 2, qty: 3, unitCost: 4_000 }],
    });
    const supplierInvoice = await api.orders.recordSupplierInvoice.mutate({
      poId: po.id,
      number: "SMOKE-SI-001",
      invoiceDate: date,
      printedTotal: 4_944,
      taxInvoiceComplete: false,
      items: [{ productId: 2, qty: 3, unitCost: 4_000, discountPercent: 58.8, ppnPercent: 0 }],
    });
    const savedDiscount = await sql`select discount_percent from supplier_invoice_items where invoice_id = ${supplierInvoice.id}`;
    expect(Number(savedDiscount[0].discount_percent)).toBeCloseTo(58.8);
    const result = await api.orders.postSupplierInvoice.mutate({ id: supplierInvoice.id });
    expect(result.total).toBe(4_944);
    const row = await sql`select status from supplier_invoices where id = ${supplierInvoice.id}`;
    expect(row[0].status).toBe("posted");
    expect((await sql`select stock_qty from products where id = 2`)[0].stock_qty).toBe(4);
    expect(Number((await sql`select count(*)::int as count from journal_entries where source_type='supplier_invoice' and source_id=${supplierInvoice.id}`)[0].count)).toBe(1);
    const supplierPayment = await api.payments.record.mutate({
      direction: "out",
      supplierInvoiceId: supplierInvoice.id,
      date,
      amount: 6_000,
      method: "transfer",
      note: "local smoke test partial supplier payment",
    });
    expect(supplierPayment.id).toBeGreaterThan(0);
    const partiallyPaid = await sql`select status from supplier_invoices where id = ${supplierInvoice.id}`;
    expect(partiallyPaid[0].status).toBe("partial");
  });

  it("rolls back invoice issue when stock is insufficient", async () => {
    const beforeStock = Number((await sql`select stock_qty from products where id = 2`)[0].stock_qty);
    const draft = await createDraftInvoice(2, beforeStock + 1, "smoke insufficient stock");
    const journalsBefore = Number((await sql`select count(*)::int as count from journal_entries`)[0].count);
    await expectFailure(() => api.invoices.issue.mutate({ id: draft.id }), "Stok");
    const invoice = await api.invoices.detail.query({ id: draft.id });
    expect(invoice.invoice.status).toBe("draft");
    expect(Number((await sql`select stock_qty from products where id = 2`)[0].stock_qty)).toBe(beforeStock);
    expect(Number((await sql`select count(*)::int as count from journal_entries`)[0].count)).toBe(journalsBefore);
  });

  it("rejects updating a draft with an item owned by another invoice", async () => {
    const draftA = await createDraftInvoice(1, 1, "smoke cross-item source");
    const draftB = await createDraftInvoice(1, 1, "smoke cross-item target");
    const detailA = await api.invoices.detail.query({ id: draftA.id });
    const detailB = await api.invoices.detail.query({ id: draftB.id });
    await expectFailure(
      () => api.invoices.updateDraft.mutate({
        id: draftA.id,
        items: [{ id: detailB.items[0].id, discountPercent: 50, ppnPercent: 0 }],
      }),
      "bukan milik invoice",
    );
    const unchanged = await api.invoices.detail.query({ id: draftA.id });
    expect(unchanged.items[0].discountPercent).toBe(detailA.items[0].discountPercent);
    expect(unchanged.invoice.total).toBe(detailA.invoice.total);
  });
});
