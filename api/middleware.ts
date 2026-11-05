import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { sql } from "drizzle-orm";
import type { TrpcContext } from "./context";
import { classifyCauseCategory, getSafeCauseMetadata } from "./error-metadata";
import { getDb } from "./queries/connection";

const INTERNAL_ERROR_MESSAGE = "Terjadi gangguan sementara pada server. Data belum berhasil dimuat. Silakan coba lagi.";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (error.code === "INTERNAL_SERVER_ERROR") {
      console.error("trpc procedure failed", {
        path: shape.data?.path,
        code: error.code,
        category: classifyCauseCategory(error),
        cause: getSafeCauseMetadata(error),
      });
      return { ...shape, message: INTERNAL_ERROR_MESSAGE };
    }
    return shape;
  },
});

export const createRouter = t.router;
export const publicQuery = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Login diperlukan" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/**
 * Supplier-invoice writes must be authorized from the server-side role table.
 * Do not trust a role supplied by the browser or an unverified user claim.
 */
export const financeProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const rows = await getDb().execute(sql`
    select role::text as role
    from public.user_roles
    where user_id = ${ctx.user.id}
    limit 1
  `);
  const role = (rows[0] as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "finance") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Akses finance diperlukan" });
  }
  return next();
});
