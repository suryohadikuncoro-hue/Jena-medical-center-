import { useState } from "react";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import Login from "@/pages/Login";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => getSession());
  if (!session?.access_token) {
    return <Login onSuccess={() => setSession(getSession())} />;
  }
  return <>{children}</>;
}
