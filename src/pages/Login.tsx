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
    <main className="grid min-h-[100dvh] bg-[var(--navy)] md:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between p-12 text-white md:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--mint)] font-display text-lg font-extrabold text-[var(--navy)]" aria-hidden="true">J</span>
          <span className="font-display text-base font-bold">Jena Business Suite</span>
        </div>
        <div className="max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-tight">Pesanan, faktur, dan pembukuan dalam satu tempat.</h2>
          <p className="mt-4 text-sm leading-relaxed text-white/65">Pantau pesanan pelanggan sampai pembayaran tanpa pindah-pindah catatan.</p>
        </div>
        <p className="text-xs text-white/45">Jena Medical Center</p>
      </section>

      <section className="flex items-center justify-center bg-[var(--paper)] px-4 py-10 md:rounded-l-[2rem]">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--navy)] font-display text-lg font-extrabold text-[var(--mint)]" aria-hidden="true">J</span>
            <span className="font-display text-base font-bold text-[var(--navy)]">Jena Business Suite</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-[var(--navy)]">Masuk</h1>
          <p className="mt-1.5 text-sm text-[var(--ink-soft)]">Gunakan akun kerja yang sudah didaftarkan.</p>
          <label className="mt-7 block text-sm font-medium text-[var(--ink)]">
            Email
            <input className="input mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label className="mt-4 block text-sm font-medium text-[var(--ink)]">
            Kata sandi
            <input className="input mt-1.5" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          {error && <p role="alert" className="mt-4 rounded-xl bg-[var(--bad-tint)] px-3 py-2.5 text-sm text-[var(--bad)]">{error}</p>}
          <button className="btn mt-6 w-full" disabled={loading}>{loading ? "Memproses…" : "Masuk"}</button>
        </form>
      </section>
    </main>
  );
}
