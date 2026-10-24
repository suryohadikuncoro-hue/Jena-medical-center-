import { useState } from "react";
import type { FormEvent } from "react";
import { signIn } from "@/lib/auth";

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
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <form onSubmit={submit} className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Jena Medical</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-slate-900">Masuk ke aplikasi</h1>
        <p className="mt-2 text-sm text-slate-500">Gunakan akun kerja yang sudah dibuat di Supabase Auth.</p>
        <label className="mt-8 block text-sm font-medium text-slate-700">Email
          <input className="input mt-2 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">Password
          <input className="input mt-2 w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn mt-6 w-full justify-center" disabled={loading}>{loading ? "Memproses..." : "Masuk"}</button>
      </form>
    </main>
  );
}
