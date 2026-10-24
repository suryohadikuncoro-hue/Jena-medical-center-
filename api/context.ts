import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { env } from "./lib/env";

export type AuthUser = {
  id: string;
  email?: string;
  role?: string;
  app_metadata?: Record<string, unknown>;
};

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user: AuthUser | null;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const authorization = opts.req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ") || !env.supabaseUrl || !env.supabasePublishableKey) {
    return { req: opts.req, resHeaders: opts.resHeaders, user: null };
  }

  try {
    const response = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: env.supabasePublishableKey,
        authorization,
      },
    });
    if (!response.ok) {
      return { req: opts.req, resHeaders: opts.resHeaders, user: null };
    }
    const user = (await response.json()) as AuthUser;
    return { req: opts.req, resHeaders: opts.resHeaders, user };
  } catch {
    return { req: opts.req, resHeaders: opts.resHeaders, user: null };
  }
}
