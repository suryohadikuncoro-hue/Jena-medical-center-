import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { rp } from "@/lib/format";
import { PageHeader, Section, Loading, LoadError, Empty } from "@/components/bits";
import { Pencil, Trash2 } from "lucide-react";

export default function Barang() {
  const q = trpc.master.products.useQuery();
  const create = trpc.master.createProduct.useMutation({
    onSuccess: () => { q.refetch(); setName(""); setUnit("unit"); setPrice(0); },
  });
  const update = trpc.master.updateProduct.useMutation({ onSuccess: () => { q.refetch(); reset(); } });
  const remove = trpc.master.deleteProduct.useMutation({ onSuccess: () => q.refetch() });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unit");
  const [price, setPrice] = useState(0);
  const [taxable, setTaxable] = useState(true);
  const reset = () => { setEditingId(null); setName(""); setUnit("unit"); setPrice(0); setTaxable(true); };

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  return (
    <div>
      <PageHeader title="Barang dan harga" sub="HPP dihitung rata-rata bergerak dari faktur supplier yang dibukukan" />
      <Section title={editingId ? "Edit barang" : "Tambah barang"}>
        <div className="border-b border-[var(--line)] px-4 py-4 md:px-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div><label className="label-caps block" htmlFor="product-name">Nama barang</label><input id="product-name" className="input mt-1" placeholder="Nama barang" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="label-caps block" htmlFor="product-unit">Satuan</label><input id="product-unit" className="input mt-1" placeholder="Satuan (kotak/unit)" value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
            <div><label className="label-caps block" htmlFor="product-base-price">Harga jual standar (Rp)</label><input id="product-base-price" className="input mt-1" type="number" min={0} value={price || ""} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} /></div>
          </div>
          <label className="mt-3 flex min-h-[44px] items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--slate)]" checked={taxable} onChange={(e) => setTaxable(e.target.checked)} />
            Kena PPN 11%
          </label>
          <button className="btn mt-2" disabled={!name || create.isPending || update.isPending} onClick={() => editingId ? update.mutate({ id: editingId, name, unit, basePrice: price, taxable }) : create.mutate({ name, unit, basePrice: price, taxable })}>
            {editingId ? "Simpan perubahan" : "Simpan barang"}
          </button>
          {editingId && <button className="btn btn-ghost mt-2 ml-2" onClick={reset}>Batal</button>}
        </div>
      </Section>
      <Section>
        {q.data.length === 0 ? <Empty text="Belum ada barang." /> : (
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {q.data.map((p) => (
              <div key={p.id} className="px-4 py-4 md:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0 break-words text-sm font-semibold">{p.name}</span>
                  <div className="flex flex-wrap items-center gap-2"><span className="font-display text-base font-semibold">{rp(p.basePrice)}<span className="text-xs font-normal text-[var(--ink-soft)]">/{p.unit}</span></span><button className="btn btn-ghost !min-h-[44px] px-2 text-xs" onClick={() => { setEditingId(p.id); setName(p.name); setUnit(p.unit); setPrice(p.basePrice); setTaxable(p.taxable); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil size={14} /> Edit</button><button className="btn btn-ghost !min-h-[44px] px-2 text-xs text-[var(--bad)]" disabled={remove.isPending} onClick={() => { if (confirm("Hapus barang ini? Data yang sudah dipakai transaksi tidak dapat dihapus.")) remove.mutate({ id: p.id }); }}><Trash2 size={14} /> Hapus</button></div>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-[var(--ink-soft)]">
                  <span>{p.sku}</span>
                  <span>Stok {p.stockQty} {p.unit}</span>
                  <span>Modal terakhir {rp(p.lastCost)}</span>
                  <span>HPP rata-rata {rp(p.avgCost)}</span>
                  {!p.taxable && <span className="font-medium text-[var(--warn)]">Tidak kena PPN</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
