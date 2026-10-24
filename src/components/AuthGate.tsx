import { useState } from "react";
import type { ReactNode } from "react";
import { clearRecoveryUrl, getRecoverySession, getSession } from "@/lib/auth";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => getSession());
  const [recoverySession, setRecoverySession] = useState(() => getRecoverySession());
  if (recoverySession) {
    return (
      <ResetPassword
        session={recoverySession}
        onSuccess={() => {
          clearRecoveryUrl();
          setSession(getSession());
          setRecoverySession(null);
        }}
      />
    );
  }
  if (!session?.access_token) {
    return <Login onSuccess={() => setSession(getSession())} />;
  }
  return <>{children}</>;
}
