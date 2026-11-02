import { useState } from "react";
import { Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { rp } from "@/lib/format";
import { PageHeader, Section, Loading, LoadError, Empty, SearchField } from "@/components/bits";

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
  const [cari, setCari] = useState("");
  const reset = () => { setEditingId(null); setName(""); setUnit("unit"); setPrice(0); setTaxable(true); };

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  const term = cari.trim().toLowerCase();
  const rows = q.data.filter((p) => !term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term));

  return (
    <div>
      <PageHeader title="Barang" sub="HPP dihitung rata-rata bergerak dari faktur supplier yang dibukukan" />

      <Section title={editingId ? "Edit barang" : "Tambah barang"} className="!mt-0">
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block" htmlFor="product-name">
              <span className="label-caps">Nama barang</span>
              <input id="product-name" className="input mt-1" placeholder="Nama barang" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block" htmlFor="product-unit">
              <span className="label-caps">Satuan</span>
              <input id="product-unit" className="input mt-1" placeholder="kotak / unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </label>
            <label className="block" htmlFor="product-base-price">
              <span className="label-caps">Harga jual standar (Rp)</span>
              <input id="product-base-price" className="input mt-1" type="number" min={0} inputMode="numeric" value={price || ""} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} />
            </label>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--line)] px-3 text-sm font-medium">
            <input type="checkbox" className="size-5 accent-[var(--slate)]" checked={taxable} onChange={(e) => setTaxable(e.target.checked)} />
            Kena PPN 11%
          </label>
          <div className="flex gap-2">
            <button
              className="btn flex-1 sm:flex-none"
              disabled={!name || create.isPending || update.isPending}
              onClick={() => (editingId ? update.mutate({ id: editingId, name, unit, basePrice: price, taxable }) : create.mutate({ name, unit, basePrice: price, taxable }))}
            >
              <Plus size={16} aria-hidden="true" />
              {editingId ? "Simpan perubahan" : "Tambah barang"}
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
        <SearchField value={cari} onChange={setCari} placeholder="Cari nama atau SKU…" label="Cari barang" />
      </div>

      <Section className="!mt-0">
        {rows.length === 0 ? (
          <Empty text={term ? "Tidak ada barang yang cocok." : "Belum ada barang."} />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {rows.map((p) => (
              <div key={p.id} className="flex items-start gap-3 px-4 py-3.5 md:px-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--slate-hover)] text-[var(--slate)]" aria-hidden="true">
                  <Package size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="min-w-0 break-words text-sm font-semibold text-[var(--ink)]">{p.name}</p>
                    <p className="font-display text-sm font-bold tabular-nums text-[var(--ink)]">
                      {rp(p.basePrice)}
                      <span className="text-xs font-medium text-[var(--ink-soft)]">/{p.unit}</span>
                    </p>
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--ink-soft)]">
                    <span>{p.sku}</span>
                    <span>Stok {p.stockQty} {p.unit}</span>
                    <span>Modal {rp(p.lastCost)}</span>
                    <span>HPP {rp(p.avgCost)}</span>
                    {!p.taxable && <span className="font-semibold text-[var(--warn)]">Tanpa PPN</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    className="grid size-9 place-items-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-[var(--slate-hover)] hover:text-[var(--slate)]"
                    aria-label={`Edit ${p.name}`}
                    onClick={() => { setEditingId(p.id); setName(p.name); setUnit(p.unit); setPrice(p.basePrice); setTaxable(p.taxable); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="grid size-9 place-items-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-[var(--bad-bg)] hover:text-[var(--bad)]"
                    aria-label={`Hapus ${p.name}`}
                    disabled={remove.isPending}
                    onClick={() => { if (confirm("Hapus barang ini? Data yang sudah dipakai transaksi tidak dapat dihapus.")) remove.mutate({ id: p.id }); }}
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
