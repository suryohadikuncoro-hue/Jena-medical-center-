import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { Plus, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { todayLocal, rp } from "@/lib/format";
import { PageHeader, Section, Loading } from "@/components/bits";

type Row = { productId: number; qty: number; unitPrice: number; priceSource: "standar" | "khusus" | "manual" };



export default function PesananBaru() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = Number(params.get("edit")) || 0;
  const [customerId, setCustomerId] = useState<number | "">("");
  const [orderDate, setOrderDate] = useState(todayLocal());
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>([{ productId: 0, qty: 1, unitPrice: 0, priceSource: "standar" }]);
  const [error, setError] = useState<string | null>(null);
  const [initializedEdit, setInitializedEdit] = useState(0);

  const customers = trpc.master.customers.useQuery();
  const products = trpc.master.products.useQuery();
  const existing = trpc.orders.detail.useQuery({ id: editId }, { enabled: Boolean(editId) });
  const customerPrices = trpc.master.customerPrices.useQuery(
    { customerId: Number(customerId) },
    { enabled: Boolean(customerId) },
  );
  const create = trpc.orders.create.useMutation();
  const update = trpc.orders.updateDraft.useMutation();

  useEffect(() => {
    if (!editId || initializedEdit === editId || !existing.data) return;
    // Hydrate the editable form when the selected order payload is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomerId(existing.data.order.customerId);
    setOrderDate(existing.data.order.orderDate);
    setNote(existing.data.order.note ?? "");
    setRows(existing.data.items.map((item) => ({ productId: item.productId, qty: item.qty, unitPrice: item.unitPrice, priceSource: item.priceSource })));
    setInitializedEdit(editId);
  }, [editId, existing.data, initializedEdit]);

  const prodMap = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);
  const priceMap = useMemo(() => new Map((customerPrices.data ?? []).map((p) => [p.productId, p])), [customerPrices.data]);
  const total = rows.reduce((s, r) => s + r.qty * r.unitPrice, 0);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const pickProduct = (i: number, productId: number) => {
    const p = prodMap.get(productId);
    const special = priceMap.get(productId);
    setRow(i, { productId, unitPrice: special?.price ?? p?.basePrice ?? 0, priceSource: special?.isSpecial ? "khusus" : "standar" });
  };

  const submit = () => {
    setError(null);
    if (!customerId) return setError("Pilih pelanggan dulu.");
    const items = rows.filter((r) => r.productId && r.qty > 0);
    if (items.length === 0) return setError("Tambahkan minimal satu barang.");
    const payload = { customerId, orderDate, note: note || undefined, items };
    if (editId) update.mutate({ id: editId, ...payload }, { onSuccess: () => navigate(`/pesanan/${editId}`), onError: (e) => setError(e.message) });
    else create.mutate(payload, { onSuccess: (r) => navigate(`/pesanan/${r.id}`), onError: (e) => setError(e.message) });
  };

  if (customers.isLoading || products.isLoading || (editId && existing.isLoading)) return <Loading />;

  return (
    <div>
      <PageHeader title={editId ? "Edit pesanan" : "Pesanan baru"} sub="Buat atau sesuaikan pesanan pelanggan sebelum diproses" />

      <Section title="Pelanggan">
        <div className="grid grid-cols-1 gap-3 px-4 pb-4 md:grid-cols-2 md:px-8">
          <select className="select" value={customerId} onChange={(e) => { setCustomerId(Number(e.target.value) || ""); setRows((rs) => rs.map((r) => ({ ...r, productId: 0, unitPrice: 0, priceSource: "standar" }))); }}>
            <option value="">Pilih pelanggan…</option>
            {(customers.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name} · termin {c.termDays} hari</option>
            ))}
          </select>
          <input className="input" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
        </div>
        <div className="px-4 pb-4 md:px-8">
          <input className="input" placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Section>

      <Section title="Barang" note="Harga di bawah modal terakhir tetap bisa diproses, tapi marginnya minus">
        <div className="border-b border-[var(--line)]">
          {rows.map((r, i) => {
            const p = r.productId ? prodMap.get(r.productId) : undefined;
            const belowCost = p ? r.unitPrice < p.lastCost : false;
            const margin = p && r.unitPrice > 0 ? Math.round(((r.unitPrice - p.lastCost) / r.unitPrice) * 100) : 0;
            return (
              <div key={`${r.productId}-${i}`} className="border-t border-[var(--line)] px-4 py-4 md:px-8">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_110px_160px_auto]">
                  <ProductPicker products={products.data ?? []} productId={r.productId} onSelect={(productId) => pickProduct(i, productId)} />
                  <input
                    className="input" type="number" min={1} value={r.qty}
                    onChange={(e) => setRow(i, { qty: Math.max(1, Number(e.target.value) || 1) })}
                    placeholder="Qty"
                  />
                  <input
                    className="input" type="number" min={0} value={r.unitPrice}
                    onChange={(e) =>
                      setRow(i, {
                        unitPrice: Math.max(0, Number(e.target.value) || 0),
                        priceSource: Number(e.target.value) === p?.basePrice ? "standar" : "manual",
                      })
                    }
                    placeholder="Harga satuan"
                  />
                  <button
                    className="btn btn-ghost md:w-[44px] md:px-0"
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                    disabled={rows.length === 1}
                    aria-label="Hapus baris"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {p && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="text-[var(--ink-soft)]">
                      {r.qty} {p.unit} × {rp(r.unitPrice)} = <b className="text-[var(--ink)]">{rp(r.qty * r.unitPrice)}</b>
                    </span>
                    <span className={belowCost ? "font-semibold text-[var(--bad)]" : "text-[var(--ink-soft)]"}>
                      {r.priceSource === "standar" ? "Harga standar" : r.priceSource === "khusus" ? "Harga khusus" : "Diubah manual"} · Margin {margin > 0 ? "+" : ""}{margin}%
                    </span>
                    {belowCost && (
                      <span className="font-semibold text-[var(--bad)]">
                        Di bawah modal terakhir ({rp(p.lastCost)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex items-center justify-between px-4 py-4 md:px-8">
            <button
              className="btn btn-ghost"
              onClick={() => setRows((rs) => [...rs, { productId: 0, qty: 1, unitPrice: 0, priceSource: "standar" }])}
            >
              <Plus size={16} /> Tambah barang
            </button>
            <div className="text-right">
              <div className="label-caps">Total pesanan</div>
              <div className="font-display text-xl font-semibold">{rp(total)}</div>
              <div className="text-xs text-[var(--ink-soft)]">Belum termasuk PPN</div>
            </div>
          </div>
        </div>
      </Section>

      {error && <p className="px-4 pt-4 text-sm font-medium text-[var(--bad)] md:px-8">{error}</p>}

      <div className="flex gap-3 px-4 py-6 md:px-8">
        <button className="btn flex-1 md:flex-none" onClick={submit} disabled={create.isPending || update.isPending}>
          {create.isPending || update.isPending ? "Menyimpan…" : editId ? "Simpan perubahan" : "Simpan pesanan"}
        </button>
        <Link to="/pesanan" className="btn btn-ghost">Batal</Link>
      </div>
    </div>
  );
}

function ProductPicker({ products, productId, onSelect }: { products: Array<{ id: number; name: string; sku: string; stockQty: number; unit: string }>; productId: number; onSelect: (id: number) => void }) {
  const selected = products.find((p) => p.id === productId);
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Keep the search field aligned with the selected product after a row pick.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(selected?.name ?? "");
  }, [selected?.name]);
  const needle = query.trim().toLowerCase();
  const matches = products.filter((p) => !needle || `${p.name} ${p.sku}`.toLowerCase().includes(needle)).slice(0, 8);
  return (
    <div className="relative">
      <input className="input w-full" value={query} placeholder="Cari nama barang / SKU…" onFocus={() => setOpen(true)} onChange={(e) => { const value = e.target.value; setQuery(value); setOpen(true); const exact = products.find((p) => p.name.toLowerCase() === value.trim().toLowerCase() || p.sku.toLowerCase() === value.trim().toLowerCase()); onSelect(exact?.id ?? 0); }} />
      {open && (
        <>
          <button className="fixed inset-0 z-10 h-full w-full cursor-default" aria-label="Tutup pencarian" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto border border-[var(--line-strong)] bg-[var(--paper)] shadow-lg">
            {matches.length ? matches.map((p) => <button key={p.id} type="button" className="block w-full border-b border-[var(--line)] px-3 py-3 text-left text-sm hover:bg-[var(--paper-2)]" onClick={() => { setQuery(p.name); onSelect(p.id); setOpen(false); }}><span className="font-semibold">{p.name}</span><span className="ml-2 text-xs text-[var(--ink-soft)]">{p.sku} · stok {p.stockQty} {p.unit}</span></button>) : <div className="px-3 py-3 text-sm text-[var(--ink-soft)]">Barang tidak ditemukan.</div>}
          </div>
        </>
      )}
    </div>
  );
}
