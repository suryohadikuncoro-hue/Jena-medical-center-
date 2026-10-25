import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { PageHeader, Section, Loading, LoadError, Empty } from "@/components/bits";
import { Pencil, Trash2 } from "lucide-react";

export default function Supplier() {
  const q = trpc.master.suppliers.useQuery();
  const create = trpc.master.createSupplier.useMutation({ onSuccess: () => { q.refetch(); setName(""); setPhone(""); } });
  const update = trpc.master.updateSupplier.useMutation({ onSuccess: () => { q.refetch(); reset(); } });
  const remove = trpc.master.deleteSupplier.useMutation({ onSuccess: () => q.refetch() });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const reset = () => { setEditingId(null); setName(""); setPhone(""); };

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  return (
    <div>
      <PageHeader title="Supplier" sub={`${q.data.length} supplier terdaftar`} />
      <Section title={editingId ? "Edit supplier" : "Tambah supplier"}>
        <div className="border-b border-[var(--line)] px-4 py-4 md:px-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className="input" placeholder="Nama supplier" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="Telepon (opsional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button className="btn mt-3" disabled={!name || create.isPending || update.isPending} onClick={() => editingId ? update.mutate({ id: editingId, name, phone: phone || undefined }) : create.mutate({ name, phone: phone || undefined })}>
            {editingId ? "Simpan perubahan" : "Simpan supplier"}
          </button>
          {editingId && <button className="btn btn-ghost mt-3 ml-2" onClick={reset}>Batal</button>}
        </div>
      </Section>
      <Section>
        {q.data.length === 0 ? <Empty text="Belum ada supplier." /> : (
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {q.data.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
                <div>
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-[var(--ink-soft)]">{s.code}{s.phone ? ` · ${s.phone}` : ""}</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost !min-h-[40px] px-3 text-xs" onClick={() => { setEditingId(s.id); setName(s.name); setPhone(s.phone ?? ""); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil size={14} /> Edit</button>
                  <button className="btn btn-ghost !min-h-[40px] px-3 text-xs text-[var(--bad)]" disabled={remove.isPending} onClick={() => { if (confirm("Hapus supplier ini? Data yang sudah dipakai transaksi tidak dapat dihapus.")) remove.mutate({ id: s.id }); }}><Trash2 size={14} /> Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
