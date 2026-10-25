import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { Plus, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { todayLocal, rp } from "@/lib/format";
import { PageHeader, Section, Loading, LoadError } from "@/components/bits";

type Row = { productId: number; qty: number | ""; unitPrice: number | ""; priceSource: "standar" | "khusus" | "manual" };



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
  const total = rows.reduce((s, r) => s + (typeof r.qty === "number" ? r.qty : 0) * (typeof r.unitPrice === "number" ? r.unitPrice : 0), 0);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const pickProduct = (i: number, productId: number) => {
    if (!customerId || !customerPrices.data || customerPrices.isLoading || customerPrices.error) return;
    const p = prodMap.get(productId);
    const special = priceMap.get(productId);
    setRow(i, { productId, unitPrice: special?.price ?? p?.basePrice ?? 0, priceSource: special?.isSpecial ? "khusus" : "standar" });
  };

  const submit = () => {
    setError(null);
    if (!customerId) return setError("Pilih pelanggan dulu.");
    const items: Array<{ productId: number; qty: number; unitPrice: number; priceSource: Row["priceSource"] }> = [];
    for (const row of rows) {
      if (!row.productId) continue;
      const qty = row.qty;
      const unitPrice = row.unitPrice;
      if (qty === "" || !Number.isInteger(qty) || qty < 1) return setError("Jumlah barang harus bilangan bulat minimal 1.");
      if (unitPrice === "" || !Number.isInteger(unitPrice) || unitPrice < 0) return setError("Harga satuan harus diisi dengan angka 0 atau lebih.");
      items.push({ productId: row.productId, qty, unitPrice, priceSource: row.priceSource });
    }
    if (items.length === 0) return setError("Tambahkan minimal satu barang.");
    const payload = { customerId, orderDate, note: note || undefined, items };
    if (editId) update.mutate({ id: editId, ...payload }, { onSuccess: () => navigate(`/pesanan/${editId}`), onError: (e) => setError(e.message) });
    else create.mutate(payload, { onSuccess: (r) => navigate(`/pesanan/${r.id}`), onError: (e) => setError(e.message) });
  };

  if (customers.error) return <LoadError message={customers.error.message} retry={() => customers.refetch()} />;
  if (products.error) return <LoadError message={products.error.message} retry={() => products.refetch()} />;
  if (editId && existing.error) return <LoadError message={existing.error.message} retry={() => existing.refetch()} />;
  if (customers.isLoading || products.isLoading || !customers.data || !products.data || (editId && (existing.isLoading || !existing.data))) return <Loading />;

  return (
    <div>
      <PageHeader title={editId ? "Edit pesanan" : "Pesanan baru"} sub="Buat atau sesuaikan pesanan pelanggan sebelum diproses" />

      <Section title="Pelanggan">
        <div className="grid grid-cols-1 gap-3 px-4 pb-4 md:grid-cols-2 md:px-8">
          <div>
            <label className="label-caps block" htmlFor="order-customer">Pelanggan</label>
            <select id="order-customer" className="select mt-1" value={customerId} onChange={(e) => { setCustomerId(Number(e.target.value) || ""); setRows((rs) => rs.map((r) => ({ ...r, productId: 0, unitPrice: 0, priceSource: "standar" }))); }}>
              <option value="">Pilih pelanggan…</option>
              {customers.data.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · termin {c.termDays} hari</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-caps block" htmlFor="order-date">Tanggal pesanan</label>
            <input id="order-date" className="input mt-1" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </div>
        </div>
        <div className="px-4 pb-4 md:px-8">
          <label className="label-caps block" htmlFor="order-note">Catatan (opsional)</label>
          <input id="order-note" className="input mt-1" placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />
          {customerId && customerPrices.isLoading && <p className="mt-2 text-sm text-[var(--ink-soft)]" role="status">Memuat harga khusus pelanggan…</p>}
          {customerId && customerPrices.error && (
            <div className="mt-2 flex flex-wrap items-center gap-3" role="alert">
              <p className="text-sm text-[var(--bad)]">Harga khusus gagal dimuat: {customerPrices.error.message}</p>
              <button className="btn btn-ghost" type="button" onClick={() => void customerPrices.refetch()}>Coba lagi</button>
            </div>
          )}
        </div>
      </Section>

      <Section title="Barang" note="Harga di bawah modal terakhir tetap bisa diproses, tapi marginnya minus">
        <div className="border-b border-[var(--line)]">
          {rows.map((r, i) => {
            const p = r.productId ? prodMap.get(r.productId) : undefined;
            const qty = typeof r.qty === "number" ? r.qty : 0;
            const unitPrice = typeof r.unitPrice === "number" ? r.unitPrice : 0;
            const belowCost = p && r.unitPrice !== "" ? unitPrice < p.lastCost : false;
            const margin = p && unitPrice > 0 ? Math.round(((unitPrice - p.lastCost) / unitPrice) * 100) : 0;
            return (
              <div key={`${r.productId}-${i}`} className="border-t border-[var(--line)] px-4 py-4 md:px-8">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_110px_160px_auto]">
                  <div className="min-w-0">
                    <label className="label-caps block" htmlFor={`order-product-${i}`}>Barang</label>
                    <ProductPicker inputId={`order-product-${i}`} products={products.data} productId={r.productId} disabled={!customerId || customerPrices.isLoading || Boolean(customerPrices.error) || !customerPrices.data} onSelect={(productId) => pickProduct(i, productId)} />
                  </div>
                  <div>
                    <label className="label-caps block" htmlFor={`order-qty-${i}`}>Jumlah</label>
                    <input id={`order-qty-${i}`} className="input mt-1" type="number" min={1} value={r.qty}
                      step={1}
                      onChange={(e) => { const value = e.target.value; setRow(i, { qty: value === "" ? "" : Number(value) }); }}
                      placeholder="Qty"
                    />
                  </div>
                  <div>
                    <label className="label-caps block" htmlFor={`order-price-${i}`}>Harga satuan</label>
                    <input id={`order-price-${i}`} className="input mt-1" type="number" min={0} value={r.unitPrice}
                      step={1}
                      onChange={(e) => { const value = e.target.value; setRow(i, { unitPrice: value === "" ? "" : Number(value), priceSource: value === "" ? r.priceSource : Number(value) === p?.basePrice ? "standar" : "manual" }); }}
                      placeholder="Harga satuan"
                    />
                  </div>
                  <button
                    className="btn btn-ghost md:w-[44px] md:px-0"
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                    disabled={rows.length === 1}
                    aria-label={`Hapus baris ${p?.name ?? i + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {p && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="text-[var(--ink-soft)]">
                      {r.qty === "" ? "—" : r.qty} {p.unit} × {r.unitPrice === "" ? "—" : rp(r.unitPrice)} = <b className="text-[var(--ink)]">{rp(qty * unitPrice)}</b>
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
        <button className="btn flex-1 md:flex-none" onClick={submit} disabled={create.isPending || update.isPending || !customerId || customerPrices.isLoading || Boolean(customerPrices.error) || !customerPrices.data}>
          {create.isPending || update.isPending ? "Menyimpan…" : editId ? "Simpan perubahan" : "Simpan pesanan"}
        </button>
        <Link to="/pesanan" className="btn btn-ghost">Batal</Link>
      </div>
    </div>
  );
}

function ProductPicker({ products, productId, inputId, disabled, onSelect }: { products: Array<{ id: number; name: string; sku: string; stockQty: number; unit: string }>; productId: number; inputId: string; disabled: boolean; onSelect: (id: number) => void }) {
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
      <input id={inputId} aria-label="Cari nama barang atau SKU" disabled={disabled} className="input mt-1 w-full" value={query} placeholder="Cari nama barang / SKU…" onFocus={() => setOpen(true)} onChange={(e) => { const value = e.target.value; setQuery(value); setOpen(true); const exact = products.find((p) => p.name.toLowerCase() === value.trim().toLowerCase() || p.sku.toLowerCase() === value.trim().toLowerCase()); onSelect(exact?.id ?? 0); }} />
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
