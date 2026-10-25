import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const INTERNAL_ERROR_MESSAGE = "Terjadi gangguan sementara pada server. Data belum berhasil dimuat. Silakan coba lagi.";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (error.code === "INTERNAL_SERVER_ERROR") {
      console.error("trpc procedure failed", {
        path: shape.data?.path,
        code: error.code,
        error: error.message,
        stack: error.stack,
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
