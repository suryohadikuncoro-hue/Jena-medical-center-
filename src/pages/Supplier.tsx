import { useState } from "react";
import { Pencil, Plus, Trash2, Truck, X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader, Section, Loading, LoadError, Empty, SearchField } from "@/components/bits";

export default function Supplier() {
  const q = trpc.master.suppliers.useQuery();
  const create = trpc.master.createSupplier.useMutation({ onSuccess: () => { q.refetch(); setName(""); setPhone(""); } });
  const update = trpc.master.updateSupplier.useMutation({ onSuccess: () => { q.refetch(); reset(); } });
  const remove = trpc.master.deleteSupplier.useMutation({ onSuccess: () => q.refetch() });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cari, setCari] = useState("");
  const reset = () => { setEditingId(null); setName(""); setPhone(""); };

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  const term = cari.trim().toLowerCase();
  const rows = q.data.filter((s) => !term || s.name.toLowerCase().includes(term) || (s.phone ?? "").toLowerCase().includes(term));

  return (
    <div>
      <PageHeader title="Supplier" sub={`${q.data.length} supplier terdaftar`} />

      <Section title={editingId ? "Edit supplier" : "Tambah supplier"} className="!mt-0">
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block" htmlFor="supplier-name">
              <span className="label-caps">Nama supplier</span>
              <input id="supplier-name" className="input mt-1" placeholder="Nama supplier" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block" htmlFor="supplier-phone">
              <span className="label-caps">Telepon (opsional)</span>
              <input id="supplier-phone" className="input mt-1" placeholder="08…" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              className="btn flex-1 sm:flex-none"
              disabled={!name || create.isPending || update.isPending}
              onClick={() => (editingId ? update.mutate({ id: editingId, name, phone: phone || undefined }) : create.mutate({ name, phone: phone || undefined }))}
            >
              <Plus size={16} aria-hidden="true" />
              {editingId ? "Simpan perubahan" : "Tambah supplier"}
            </button>
            {editingId && (
              <button className="btn btn-ghost" onClick={reset}>
                <X size={16} aria-hidden="true" />
                Batal
              </button>
            )}
          </div>
        </div>
      </Section>

      <div className="px-4 pb-3 md:px-8">
        <SearchField value={cari} onChange={setCari} placeholder="Cari supplier…" label="Cari supplier" />
      </div>

      <Section className="!mt-0">
        {rows.length === 0 ? (
          <Empty text={term ? "Tidak ada supplier yang cocok." : "Belum ada supplier."} />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {rows.map((s) => (
              <div key={s.id} className="flex items-start gap-3 px-4 py-3.5 md:px-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--slate-hover)] text-[var(--slate)]" aria-hidden="true">
                  <Truck size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-[var(--ink)]">{s.name}</p>
                  <p className="mt-0.5 break-words text-xs text-[var(--ink-soft)]">{s.code}{s.phone ? ` · ${s.phone}` : ""}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    className="grid size-9 place-items-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-[var(--slate-hover)] hover:text-[var(--slate)]"
                    aria-label={`Edit ${s.name}`}
                    onClick={() => { setEditingId(s.id); setName(s.name); setPhone(s.phone ?? ""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="grid size-9 place-items-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-[var(--bad-bg)] hover:text-[var(--bad)]"
                    aria-label={`Hapus ${s.name}`}
                    disabled={remove.isPending}
                    onClick={() => { if (confirm("Hapus supplier ini? Data yang sudah dipakai transaksi tidak dapat dihapus.")) remove.mutate({ id: s.id }); }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
