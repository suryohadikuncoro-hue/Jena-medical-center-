import { createRouter, publicQuery } from "./middleware";
import { masterRouter } from "./routers/master";
import { ordersRouter } from "./routers/orders";
import { invoicesRouter } from "./routers/invoices";
import { paymentsRouter } from "./routers/payments";
import { reportsRouter } from "./routers/reports";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  master: masterRouter,
  orders: ordersRouter,
  invoices: invoicesRouter,
  payments: paymentsRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
