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
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <form onSubmit={submit} className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Jena Medical</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-slate-900">Buat password baru</h1>
        <p className="mt-2 text-sm text-slate-500">Gunakan password baru ini untuk masuk ke aplikasi.</p>
        <label className="mt-8 block text-sm font-medium text-slate-700">Password baru
          <input className="input mt-2 w-full" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">Ulangi password
          <input className="input mt-2 w-full" type="password" minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required autoComplete="new-password" />
        </label>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn mt-6 w-full justify-center" disabled={loading}>{loading ? "Menyimpan..." : "Simpan password"}</button>
      </form>
    </main>
  );
}
