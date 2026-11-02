import { useState } from "react";
import type { FormEvent } from "react";
import { signIn } from "@/lib/auth";

function Logo() {
  return (
    <span className="relative grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#19b5c4] to-[#0b7fc4] text-white" aria-hidden="true">
      <span className="absolute h-5 w-1 rounded-full bg-white" />
      <span className="absolute h-1 w-5 rounded-full bg-white" />
    </span>
  );
}

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[var(--paper)] px-4 py-10 text-[var(--ink)]">
      <form onSubmit={submit} className="card w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="min-w-0">
            <p className="font-display text-base font-bold leading-tight text-[var(--ink)]">Jena</p>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[var(--slate)]">Business Suite</p>
          </div>
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-[var(--ink)]">Masuk ke aplikasi</h1>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--ink-soft)]">Gunakan akun kerja yang sudah dibuat di Supabase Auth.</p>
        <label className="mt-6 block text-sm font-medium text-[var(--ink)]">Email
          <input className="input mt-1.5 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="mt-4 block text-sm font-medium text-[var(--ink)]">Password
          <input className="input mt-1.5 w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="mt-4 rounded-xl bg-[var(--bad-bg)] px-3 py-2 text-sm text-[var(--bad)]" role="alert">{error}</p>}
        <button className="btn mt-6 w-full justify-center" disabled={loading}>{loading ? "Memproses…" : "Masuk"}</button>
      </form>
    </main>
  );
}
