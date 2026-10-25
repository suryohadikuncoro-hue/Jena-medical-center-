import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getAccessToken, refreshSession } from "@/lib/auth";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 500,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
    mutations: {
      retry: false,
      onError: (error) => {
        window.dispatchEvent(new CustomEvent("jena:api-error", { detail: error instanceof Error ? error.message : "Operasi gagal" }));
      },
    },
  },
});
const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit) {
  const run = async (token: string | null) => {
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      return await globalThis.fetch(input, { ...(init ?? {}), headers, credentials: "include", signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  let response = await run(getAccessToken());
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) response = await run(refreshed.access_token);
  }
  return response;
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${apiUrl}/api/trpc`,
      transformer: superjson,
      fetch: fetchWithAuth,
    }),
  ],
});

function ApiErrorNotice() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const onError = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setMessage(detail || "Operasi gagal. Silakan coba lagi.");
      window.setTimeout(() => setMessage(null), 6000);
    };
    window.addEventListener("jena:api-error", onError);
    return () => window.removeEventListener("jena:api-error", onError);
  }, []);
  if (!message) return null;
  return <div className="fixed bottom-20 left-4 right-4 z-50 rounded-lg bg-red-700 px-4 py-3 text-sm font-medium text-white shadow-lg md:left-auto md:right-6 md:max-w-md">{message}</div>;
}

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ApiErrorNotice />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
