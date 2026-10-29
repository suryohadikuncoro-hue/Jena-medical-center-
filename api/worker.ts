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

// Correlate each API request with a server-side log line without logging
// request bodies, authorization headers, cookies, or customer data.
app.use("/api/*", async (c, next) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  c.header("X-Request-Id", requestId);

  try {
    await next();
  } finally {
    console.log(JSON.stringify({
      event: "api_request",
      requestId,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    }));
  }
});

app.onError((error, c) => {
  const requestId = c.res.headers.get("X-Request-Id") ?? "unavailable";
  console.error(JSON.stringify({
    event: "api_unhandled_error",
    requestId,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : String(error),
  }));
  return c.json({ error: "Internal Server Error", requestId }, 500);
});

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
    origin: (origin, c) => {
      if (!origin) return c.env.FRONTEND_ORIGIN;
      if (origin === c.env.FRONTEND_ORIGIN) return origin;
      try {
        const url = new URL(origin);
        const isOfficialPagesPreview =
          url.protocol === "https:" &&
          url.hostname.endsWith(".jena-medical-center.pages.dev");
        return isOfficialPagesPreview ? origin : null;
      } catch {
        return null;
      }
    },
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
