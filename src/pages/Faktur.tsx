import { useState } from "react";
import { ChevronRight, Pencil, Trash2, X, Plus, Save } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { rp, tanggal } from "@/lib/format";
import { PageHeader, Section, StatusBadge, Loading, LoadError, Empty } from "@/components/bits";

type ItemDraft = { productId: number; qty: number; unitCost: number; discountPercent: number; ppnPercent: number };
type Detail = {
  id: number; number: string; supplierId: number; supplierName: string; poId: number | null; invoiceDate: string; dueDate: string | null;
  taxInvoiceComplete: boolean; status: string; totalAfterDiscount: number; totalPpn: number; total: number;
  items: { id: number; productId: number; productName: string; sku: string; unit: string; qty: number; unitCost: number; discountPercent: number; ppnPercent: number }[];
};
const today = () => new Date().toISOString().slice(0, 10);

function calculateTotals(items: ItemDraft[]) {
  return items.reduce((totals, item) => {
    const gross = item.qty * item.unitCost;
    const net = gross - Math.round(gross * item.discountPercent / 100);
    const ppn = Math.round(net * item.ppnPercent / 100);
    return { totalAfterDiscount: totals.totalAfterDiscount + net, totalPpn: totals.totalPpn + ppn, total: totals.total + net + ppn };
  }, { totalAfterDiscount: 0, totalPpn: 0, total: 0 });
}

function InvoiceTotals({ totalAfterDiscount, totalPpn, total }: { totalAfterDiscount: number; totalPpn: number; total: number }) {
  return <div className="mt-4 ml-auto max-w-sm space-y-2 text-sm">
    <div className="flex justify-between"><span>DPP</span><b>{rp(totalAfterDiscount)}</b></div>
    <div className="flex justify-between"><span>Total PPN</span><b>{rp(totalPpn)}</b></div>
    <div className="flex justify-between border-t pt-2"><span>Total</span><b>{rp(total)}</b></div>
  </div>;
}

export default function Faktur() {
  const q = trpc.orders.supplierInvoices.useQuery(undefined, { refetchOnMount: "always" });
  const post = trpc.orders.postSupplierInvoice.useMutation({ onSuccess: () => q.refetch() });
  const [selected, setSelected] = useState<number | null>(null);
  const detail = trpc.orders.supplierInvoiceDetail.useQuery({ id: selected ?? 0 }, { enabled: selected !== null });
  const products = trpc.master.products.useQuery();
  const [editing, setEditing] = useState(false);
  const [number, setNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [taxInvoiceComplete, setTaxInvoiceComplete] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>([]);
  const save = trpc.orders.updateSupplierInvoiceDraft.useMutation({ onSuccess: async () => { await q.refetch(); await detail.refetch(); setEditing(false); } });
  const remove = trpc.orders.deleteSupplierInvoiceDraft.useMutation({ onSuccess: async () => { setSelected(null); await q.refetch(); } });
  const d = detail.data as Detail | undefined;
  const startEdit = () => {
    if (!d) return;
    setNumber(d.number);
    setInvoiceDate(d.invoiceDate);
    setDueDate(d.dueDate ?? "");
    setTaxInvoiceComplete(d.taxInvoiceComplete);
    setItems(d.items.map((item) => ({ productId: item.productId, qty: item.qty, unitCost: item.unitCost, discountPercent: item.discountPercent, ppnPercent: item.ppnPercent })));
    setEditing(true);
  };
  const totals = calculateTotals(items);
  const addItem = () => setItems((current) => [...current, { productId: products.data?.[0]?.id ?? 0, qty: 1, unitCost: 0, discountPercent: 0, ppnPercent: 0 }]);
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  return <div>
    <PageHeader title="Faktur supplier" sub="Draf belum menjadi hutang; bukukan setelah rincian faktur diperiksa" />
    <Section>
      {q.data.length === 0 ? <Empty text="Belum ada faktur supplier tercatat." /> :
        <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
          {q.data.map((f) => <button type="button" key={f.id} onClick={() => { setSelected(f.id); setEditing(false); }} className="block w-full px-4 py-4 text-left transition hover:bg-[var(--surface-soft)] md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3"><div>
              <div className="flex flex-wrap items-center gap-2"><span className="font-display text-base font-semibold">Faktur {f.number}</span><StatusBadge status={f.status} />{!f.taxInvoiceComplete && f.status !== "draft" && <span className="badge bg-[#fff3d6] text-[var(--warn)]">Pajak belum lengkap</span>}</div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">{f.supplierName} · {tanggal(f.invoiceDate)}{f.dueDate ? ` · tempo ${tanggal(f.dueDate)}` : ""}</div>
            </div><div className="flex items-center gap-3"><div className="text-right"><div className="font-display text-base font-semibold">{rp(f.total)}</div><div className="text-xs text-[var(--ink-soft)]">Total</div></div><ChevronRight size={18} /></div></div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"><span className="text-[var(--ink-soft)]">DPP: {rp(f.totalAfterDiscount)}</span><span className="text-[var(--ink-soft)]">Total PPN: {rp(f.totalPpn)}</span>{f.status !== "draft" && f.remaining > 0 && <span className="text-[var(--ink-soft)]">Sisa hutang {rp(f.remaining)}</span>}</div>
          </button>)}
        </div>}
    </Section>

    {selected !== null && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4" onClick={() => setSelected(null)}>
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xl md:rounded-2xl md:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Detail faktur {d?.number ?? ""}</h2><button className="btn btn-ghost !min-h-10" onClick={() => setSelected(null)} aria-label="Tutup"><X /></button></div>
        {detail.isLoading ? <Loading /> : detail.error ? <LoadError message={detail.error.message} retry={() => detail.refetch()} /> : d && <>
          {!editing ? <>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-soft)] p-3 text-sm md:grid-cols-3"><div><span className="text-[var(--ink-soft)]">Supplier</span><p className="font-semibold">{d.supplierName}</p></div><div><span className="text-[var(--ink-soft)]">Tanggal faktur</span><p className="font-semibold">{tanggal(d.invoiceDate)}</p></div><div><span className="text-[var(--ink-soft)]">Jatuh tempo</span><p className="font-semibold">{d.dueDate ? tanggal(d.dueDate) : "—"}</p></div><div><span className="text-[var(--ink-soft)]">Status</span><p><StatusBadge status={d.status} /></p></div><div><span className="text-[var(--ink-soft)]">Pajak lengkap</span><p className="font-semibold">{d.taxInvoiceComplete ? "Ya" : "Tidak"}</p></div></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead><tr className="border-b text-left text-[var(--ink-soft)]"><th className="py-2">Barang</th><th>Qty</th><th>Harga</th><th>Diskon</th><th>PPN</th><th className="text-right">Total</th></tr></thead><tbody>{d.items.map((item) => { const net = item.qty * item.unitCost - Math.round(item.qty * item.unitCost * item.discountPercent / 100); return <tr key={item.id} className="border-b border-[var(--line)]"><td className="py-3">{item.productName}<div className="text-xs text-[var(--ink-soft)]">{item.sku}</div></td><td>{item.qty} {item.unit}</td><td>{rp(item.unitCost)}</td><td>{item.discountPercent}%</td><td>{item.ppnPercent}%</td><td className="text-right">{rp(net + Math.round(net * item.ppnPercent / 100))}</td></tr>; })}</tbody></table></div>
            <InvoiceTotals totalAfterDiscount={d.totalAfterDiscount} totalPpn={d.totalPpn} total={d.total} />
            <div className="mt-5 flex flex-wrap justify-end gap-2">{d.status === "draft" && <><button className="btn btn-ghost text-[var(--bad)]" disabled={remove.isPending} onClick={() => { if (confirm("Hapus faktur Draf ini beserta rincian barangnya?")) remove.mutate({ id: d.id }); }}><Trash2 size={16} /> Hapus</button><button className="btn btn-accent" onClick={startEdit}><Pencil size={16} /> Edit faktur</button><button className="btn btn-primary" disabled={post.isPending} onClick={() => post.mutate({ id: d.id })}>Bukukan faktur</button></>}</div>
          </> : <>
            <div className="grid gap-3 md:grid-cols-2"><label className="text-sm">Nomor faktur<input className="input mt-1 w-full" value={number} onChange={(event) => setNumber(event.target.value)} /></label><label className="text-sm">Tanggal faktur<input type="date" className="input mt-1 w-full" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></label><label className="text-sm">Jatuh tempo<input type="date" className="input mt-1 w-full" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={taxInvoiceComplete} onChange={(event) => setTaxInvoiceComplete(event.target.checked)} /> Faktur pajak lengkap</label></div>
            <div className="mt-4 flex items-center justify-between"><h3 className="font-semibold">Rincian barang</h3><button className="btn btn-ghost" onClick={addItem}><Plus size={16} /> Tambah barang</button></div>
            <div className="space-y-3">{items.map((item, index) => <div key={index} className="rounded-xl border border-[var(--line)] p-3"><div className="flex gap-2"><select className="input min-w-0 flex-1" value={item.productId} onChange={(event) => setItems((current) => current.map((value, i) => i === index ? { ...value, productId: Number(event.target.value) } : value))}>{products.data?.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select><button className="btn btn-ghost text-[var(--bad)]" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}><Trash2 size={16} /></button></div><div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">{([ ["qty", "Qty"], ["unitCost", "Harga"], ["discountPercent", "Diskon %"], ["ppnPercent", "PPN %"] ] as const).map(([key, label]) => <label className="text-xs" key={key}>{label}<input type="number" className="input mt-1 w-full" value={item[key]} min={0} onChange={(event) => setItems((current) => current.map((value, i) => i === index ? { ...value, [key]: Number(event.target.value) } : value))} /></label>)}</div></div>)}</div>
            <InvoiceTotals {...totals} />
            <div className="mt-5 flex justify-end gap-2"><button className="btn btn-ghost" onClick={() => setEditing(false)}>Batal</button><button className="btn btn-primary" disabled={save.isPending || !items.length || items.some((item) => !item.productId || item.qty < 1)} onClick={() => save.mutate({ id: d.id, number, invoiceDate, dueDate: dueDate || null, taxInvoiceComplete, items })}><Save size={16} /> Simpan perubahan</button></div>
            {save.error && <p className="mt-2 text-sm text-[var(--bad)]">{save.error.message}</p>}
          </>}
        </>}
      </div>
    </div>}
  </div>;
}
