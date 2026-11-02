import { useState } from "react";
import type { FormEvent } from "react";
import type { AuthSession } from "@/lib/auth";
import { updatePassword } from "@/lib/auth";

export default function ResetPassword({ session, onSuccess }: { session: AuthSession; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password minimal 8 karakter.");
    if (password !== confirmation) return setError("Konfirmasi password belum sama.");
    setLoading(true);
    try {
      await updatePassword(session, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password gagal diperbarui");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[var(--paper)] px-4 py-10 text-[var(--ink)]">
      <form onSubmit={submit} className="card w-full max-w-md p-6 sm:p-8">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[var(--slate)]">Jena Medical</p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-[var(--ink)]">Buat password baru</h1>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--ink-soft)]">Gunakan password baru ini untuk masuk ke aplikasi.</p>
        <label className="mt-6 block text-sm font-medium text-[var(--ink)]">Password baru
          <input className="input mt-1.5 w-full" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        </label>
        <label className="mt-4 block text-sm font-medium text-[var(--ink)]">Ulangi password
          <input className="input mt-1.5 w-full" type="password" minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required autoComplete="new-password" />
        </label>
        {error && <p className="mt-4 rounded-xl bg-[var(--bad-bg)] px-3 py-2 text-sm text-[var(--bad)]" role="alert">{error}</p>}
        <button className="btn mt-6 w-full justify-center" disabled={loading}>{loading ? "Menyimpan…" : "Simpan password"}</button>
      </form>
    </main>
  );
}
