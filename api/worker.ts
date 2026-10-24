import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { configureRuntimeEnv } from "./lib/env";
import { configureDatabase } from "./queries/connection";

type WorkerEnv = {
  HYPERDRIVE: { connectionString: string };
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  FRONTEND_ORIGIN: string;
};

const app = new Hono<{ Bindings: WorkerEnv }>();

app.use("/api/*", async (c, next) => {
  configureRuntimeEnv({
    databaseUrl: c.env.HYPERDRIVE.connectionString,
    supabaseUrl: c.env.SUPABASE_URL,
    supabasePublishableKey: c.env.SUPABASE_PUBLISHABLE_KEY,
  });
  configureDatabase(c.env.HYPERDRIVE.connectionString);
  await next();
});

app.use(
  "/api/*",
  cors({
    origin: (origin, c) => origin === c.env.FRONTEND_ORIGIN ? origin : c.env.FRONTEND_ORIGIN,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.all("/api/trpc/*", (c) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: "jena-medical-api" }));
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;
