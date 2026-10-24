import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router";
import { Plus, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { todayLocal, rp } from "@/lib/format";
import { PageHeader, Section, Loading } from "@/components/bits";

type Row = { productId: number; qty: number; unitPrice: number; priceSource: "standar" | "khusus" | "manual" };



export default function PesananBaru() {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState<number | "">("");
  const [orderDate, setOrderDate] = useState(todayLocal());
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>([{ productId: 0, qty: 1, unitPrice: 0, priceSource: "standar" }]);
  const [error, setError] = useState<string | null>(null);

  const customers = trpc.master.customers.useQuery();
  const products = trpc.master.products.useQuery();
  const customerPrices = trpc.master.customerPrices.useQuery(
    { customerId: Number(customerId) },
    { enabled: Boolean(customerId) },
  );
  const create = trpc.orders.create.useMutation();

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
    create.mutate(
      { customerId, orderDate, note: note || undefined, items },
      { onSuccess: (r) => navigate(`/pesanan/${r.id}`), onError: (e) => setError(e.message) },
    );
  };

  if (customers.isLoading || products.isLoading) return <Loading />;

  return (
    <div>
      <PageHeader title="Pesanan baru" sub="Buat pesanan pelanggan — invoice dibuat nanti dari pesanan ini" />

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
              <div className="border-t border-[var(--line)] px-4 py-4 md:px-8">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_110px_160px_auto]">
                  <select className="select" value={r.productId} onChange={(e) => pickProduct(i, Number(e.target.value))}>
                    <option value={0}>Pilih barang…</option>
                    {(products.data ?? []).map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.name} · stok {pr.stockQty} {pr.unit}
                      </option>
                    ))}
                  </select>
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
        <button className="btn flex-1 md:flex-none" onClick={submit} disabled={create.isPending}>
          {create.isPending ? "Menyimpan…" : "Simpan pesanan"}
        </button>
        <Link to="/pesanan" className="btn btn-ghost">Batal</Link>
      </div>
    </div>
  );
}
