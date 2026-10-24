import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { rp } from "@/lib/format";
import { PageHeader, Section, Loading, LoadError, Empty } from "@/components/bits";

export default function Barang() {
  const q = trpc.master.products.useQuery();
  const create = trpc.master.createProduct.useMutation({
    onSuccess: () => { q.refetch(); setName(""); setUnit("unit"); setPrice(0); },
  });
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unit");
  const [price, setPrice] = useState(0);
  const [taxable, setTaxable] = useState(true);

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  return (
    <div>
      <PageHeader title="Barang dan harga" sub="HPP dihitung rata-rata bergerak dari faktur supplier yang dibukukan" />
      <Section title="Tambah barang">
        <div className="border-b border-[var(--line)] px-4 py-4 md:px-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className="input" placeholder="Nama barang" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="Satuan (kotak/unit)" value={unit} onChange={(e) => setUnit(e.target.value)} />
            <input className="input" type="number" min={0} placeholder="Harga jual standar (Rp)" value={price || ""} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <label className="mt-3 flex min-h-[44px] items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--slate)]" checked={taxable} onChange={(e) => setTaxable(e.target.checked)} />
            Kena PPN 11%
          </label>
          <button className="btn mt-2" disabled={!name || create.isPending} onClick={() => create.mutate({ name, unit, basePrice: price, taxable })}>
            Simpan barang
          </button>
        </div>
      </Section>
      <Section>
        {q.data.length === 0 ? <Empty text="Belum ada barang." /> : (
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {q.data.map((p) => (
              <div key={p.id} className="px-4 py-4 md:px-8">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="font-display text-base font-semibold">{rp(p.basePrice)}<span className="text-xs font-normal text-[var(--ink-soft)]">/{p.unit}</span></span>
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
