import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { X, AlertTriangle, Check, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { rp, tanggal, todayLocal, waNumber } from "@/lib/format";
import { sharePurchaseOrderPdf } from "@/lib/pdf";
import { PageHeader, Section, StatusBadge, Loading, LoadError } from "@/components/bits";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-none border-[var(--line-strong)] bg-[var(--paper)] p-0">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line-strong)] bg-[var(--paper)] px-4 py-3">
          <DialogTitle className="font-display text-lg font-semibold">{title}</DialogTitle>
          <DialogClose asChild>
            <button type="button" aria-label="Tutup dialog" className="flex size-11 items-center justify-center transition-colors hover:bg-[var(--paper-2)]">
              <X size={18} />
            </button>
          </DialogClose>
        </div>
        <div className="p-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export default function PesananDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = Number(id);
  const utils = trpc.useUtils();
  const q = trpc.orders.detail.useQuery({ id: orderId }, { refetchOnMount: "always" });
  const suppliers = trpc.master.suppliers.useQuery();

  const confirmPO = trpc.orders.confirmPurchaseOrder.useMutation({ onSuccess: () => q.refetch() });
  const deleteOrder = trpc.orders.deleteDraft.useMutation({ onSuccess: () => navigate("/pesanan") });
  const deletePO = trpc.orders.deleteSentPurchaseOrder.useMutation({ onSuccess: () => { q.refetch(); utils.orders.list.invalidate(); } });
  const orderToSupplier = trpc.orders.orderToSupplier.useMutation({
    onSuccess: () => { setPoModal(false); void q.refetch(); utils.orders.list.invalidate(); },
  });
  const recordFaktur = trpc.orders.recordSupplierInvoice.useMutation({
    onSuccess: () => { setFakModal(null); q.refetch(); },
  });
  const createInvoice = trpc.invoices.createFromOrder.useMutation({
    onSuccess: () => { q.refetch(); utils.invoices.list.invalidate(); },
    onError: (e) => alert(e.message),
  });

  const [poModal, setPoModal] = useState(false);
  const [fakModal, setFakModal] = useState<number | null>(null); // poId
  const [poSupplier, setPoSupplier] = useState<number | "">("");
  const [poItems, setPoItems] = useState<Record<number, { qty: number; unitCost: number }>>({});
  const [fakNumber, setFakNumber] = useState("");
  const [fakPrinted, setFakPrinted] = useState(0);
  const [fakDue, setFakDue] = useState("");
  const [fakTax, setFakTax] = useState(false);
  const [fakItems, setFakItems] = useState<Record<number, { qty: number; unitCost: number; discountPercent: number; ppnPercent: number }>>({});
  const [pdfBusy, setPdfBusy] = useState<number | null>(null);

  const d = q.data;

  const openPoModal = () => {
    if (!d) return;
    const init: Record<number, { qty: number; unitCost: number }> = {};
    for (const it of d.items) init[it.productId] = { qty: it.qty, unitCost: it.lastCost };
    setPoItems(init);
    setPoSupplier("");
    setPoModal(true);
  };

  const openFakModal = (poId: number) => {
    if (!d) return;
    const po = d.pos.find((p) => p.id === poId);
    if (!po) return;
    const init: Record<number, { qty: number; unitCost: number; discountPercent: number; ppnPercent: number }> = {};
    let total = 0;
    for (const it of po.items) {
      init[it.productId] = { qty: it.qty, unitCost: it.unitCost, discountPercent: 0, ppnPercent: 0 };
      total += it.qty * it.unitCost;
    }
    setFakItems(init);
    setFakPrinted(total);
    setFakNumber("");
    setFakDue("");
    setFakTax(false);
    setFakModal(poId);
  };

  if (q.isLoading || !d) return q.error ? <LoadError message={q.error.message} retry={() => q.refetch()} /> : <Loading />;
  const { order } = d;

  const invoiced = d.invoices.filter((v) => v.status !== "draft").reduce((s, v) => s + v.subtotal, 0);
  const sisaTagih = d.total - invoiced;
  const poDone = d.pos.filter((p) => p.status === "confirmed").length;

  return (
    <div>
      <PageHeader
        title={order.number}
        sub={`${order.customerName} · ${tanggal(order.orderDate)}`}
        action={<div className="flex flex-wrap items-center gap-2"><StatusBadge status={order.status} />{order.status === "draft" && <><Link className="btn btn-ghost !min-h-[44px] px-3 text-xs" to={`/pesanan/baru?edit=${order.id}`}><Pencil size={14} /> Edit</Link><button className="btn btn-ghost !min-h-[44px] px-3 text-xs text-[var(--bad)]" disabled={deleteOrder.isPending} onClick={() => { if (confirm("Hapus pesanan draft ini?")) deleteOrder.mutate({ id: order.id }); }}><Trash2 size={14} /> Hapus</button></>}</div>}
      />

      {/* Barang */}
      <Section title="Barang" note={`Total pesanan ${rp(d.total)} · belum termasuk PPN · termin ${order.termDays} hari`}>
        <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
          {d.items.map((it) => (
            <div key={it.id} className="px-4 py-4 md:px-8">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-semibold">{it.productName}</span>
                <span className="font-display text-base font-semibold">{rp(it.amount)}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-[var(--ink-soft)]">
                <span>{it.qty} {it.unit} × {rp(it.unitPrice)}</span>
                <span>{it.priceSource === "standar" ? "Harga standar" : it.priceSource === "khusus" ? "Harga khusus" : "Diubah manual"}</span>
                <span>Margin {it.marginPct > 0 ? "+" : ""}{it.marginPct}%</span>
              </div>
              {it.belowCost && (
                <p className="mt-2 flex items-start gap-2 text-xs font-medium text-[var(--bad)]">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  Dijual di bawah modal terakhir ({rp(it.lastCost)}). Tetap bisa diproses, tapi marginnya minus.
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Langkah berikutnya */}
      <Section title="Langkah Berikutnya">
        <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
          <div className="px-4 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <span className={`flex h-6 w-6 items-center justify-center border text-xs font-bold ${poDone === d.pos.length && d.pos.length > 0 ? "border-[var(--ok)] bg-[var(--ok)] text-white" : "border-[var(--ink)]"}`}>
                {poDone === d.pos.length && d.pos.length > 0 ? <Check size={13} /> : "1"}
              </span>
              <div className="text-sm font-semibold">Order ke supplier</div>
              {d.pos.length > 0 && poDone === d.pos.length && <span className="text-xs font-medium text-[var(--ok)]">Selesai</span>}
            </div>
            <p className="mt-1 pl-9 text-xs text-[var(--ink-soft)]">
              {d.pos.length === 0 ? "Belum ada order ke supplier." : `${d.pos.length} supplier sudah dipesan.`}
            </p>
            <div className="mt-3 space-y-2 pl-9">
              {d.pos.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border border-[var(--line)] px-3 py-2">
                  <div className="text-sm">
                    <b>{p.number}</b> · {p.supplierName} <StatusBadge status={p.status} />
                  </div>
                  {p.status === "sent" && (
                    <div className="flex flex-wrap gap-2">
                      {waNumber(p.supplierPhone) && (
                        <a
                          className="btn btn-accent !min-h-[44px] px-3 text-xs"
                          target="_blank"
                          rel="noreferrer"
                          href={`https://wa.me/${waNumber(p.supplierPhone)}?text=${encodeURIComponent(`Halo ${p.supplierName}, berikut order ${p.number} dari Jena Medical Center:\n\n${p.items.map((it) => `${d.items.find((x) => x.productId === it.productId)?.productName ?? "Barang"} — ${it.qty} ${d.items.find((x) => x.productId === it.productId)?.unit ?? "unit"} @ ${rp(it.unitCost)}`).join("\n")}\n\nMohon konfirmasi ketersediaan dan harga. Terima kasih.`)}`}
                        >
                          <MessageCircle size={14} /> Kirim ke WhatsApp
                        </a>
                      )}
                      <button className="btn btn-ghost !min-h-[44px] px-3 text-xs" disabled={pdfBusy === p.id} onClick={async () => { setPdfBusy(p.id); try { await sharePurchaseOrderPdf({ number: p.number, orderDate: p.orderDate, supplierName: p.supplierName }, p.items.map((it) => ({ name: d.items.find((x) => x.productId === it.productId)?.productName ?? "Barang", qty: it.qty, unitCost: it.unitCost }))); } finally { setPdfBusy(null); } }}>{pdfBusy === p.id ? "Menyiapkan PDF…" : "PDF / WhatsApp"}</button>
                      <button className="btn btn-ghost !min-h-[44px] px-3 text-xs" onClick={() => confirmPO.mutate({ poId: p.id })} disabled={confirmPO.isPending}>
                        Catat balasan
                      </button>
                      <button className="btn btn-ghost !min-h-[44px] px-3 text-xs text-[var(--bad)]" disabled={deletePO.isPending} onClick={() => { if (confirm("Hapus PO yang belum dikonfirmasi ini?")) deletePO.mutate({ poId: p.id }); }}>
                        <Trash2 size={14} /> Hapus PO
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {order.status !== "closed" && (
                <button className="btn btn-accent !min-h-[44px] px-3 text-xs" onClick={openPoModal}>
                  Order ke supplier
                </button>
              )}
            </div>
          </div>

          <div className="px-4 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <span className={`flex h-6 w-6 items-center justify-center border text-xs font-bold ${sisaTagih <= 0 ? "border-[var(--ok)] bg-[var(--ok)] text-white" : "border-[var(--ink)]"}`}>
                {sisaTagih <= 0 ? <Check size={13} /> : "2"}
              </span>
              <div className="text-sm font-semibold">Invoice ke pelanggan</div>
            </div>
            <p className="mt-1 pl-9 text-xs text-[var(--ink-soft)]">
              Sudah ditagih {rp(invoiced)} · Sisa {rp(Math.max(0, sisaTagih))} (sebelum PPN)
            </p>
            <div className="mt-3 space-y-2 pl-9">
              {d.invoices.map((v) => (
                <Link key={v.id} to={`/invoice/${v.id}`} className="flex flex-wrap items-center justify-between gap-2 border border-[var(--line)] px-3 py-2 transition-colors hover:bg-[var(--paper-2)]">
                  <span className="text-sm"><b>{v.number}</b> <StatusBadge status={v.status} /></span>
                  <span className="text-sm font-semibold">{rp(v.total)}</span>
                </Link>
              ))}
              {sisaTagih > 0 && (
                <button
                  className="btn !min-h-[44px] px-3 text-xs"
                  disabled={createInvoice.isPending}
                  onClick={() =>
                    createInvoice.mutate({
                      salesOrderId: order.id,
                      items: d.items.map((it) => ({ salesOrderItemId: it.id, qty: it.qty })),
                    })
                  }
                >
                  {createInvoice.isPending ? "Membuat…" : "Buat invoice dari pesanan ini"}
                </button>
              )}
            </div>
          </div>

          <div className="px-4 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center border border-[var(--ink)] text-xs font-bold">3</span>
              <div className="text-sm font-semibold">Faktur supplier</div>
            </div>
            <p className="mt-1 pl-9 text-xs text-[var(--ink-soft)]">
              Dicatat dari faktur cetak; sistem menghitung ulang dan menandai selisih.
            </p>
            <div className="mt-3 space-y-2 pl-9">
              {d.pos.map((p) => (
                <div key={p.id}>
                  {p.faktur.map((f) => (
                    <FakturRow key={f.id} faktur={f} />
                  ))}
                  {p.status === "confirmed" && p.faktur.length === 0 && (
                    <button className="btn btn-ghost !min-h-[44px] px-3 text-xs" onClick={() => openFakModal(p.id)}>
                      Catat faktur dari {p.supplierName}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Modal order ke supplier */}
      {poModal && d && (
        <Modal title="Order ke supplier" onClose={() => setPoModal(false)}>
          <label className="label-caps block" htmlFor="po-supplier">Supplier</label>
          <select id="po-supplier" className="select mt-1" disabled={suppliers.isLoading || Boolean(suppliers.error)} value={poSupplier} onChange={(e) => setPoSupplier(Number(e.target.value) || "")}>
            <option value="">Pilih supplier…</option>
            {(suppliers.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {suppliers.isLoading && <p className="mt-2 text-sm text-[var(--ink-soft)]" role="status">Memuat daftar supplier…</p>}
          {suppliers.error && <div className="mt-2 flex flex-wrap items-center gap-3" role="alert"><p className="text-sm text-[var(--bad)]">Daftar supplier gagal dimuat: {suppliers.error.message}</p><button className="btn btn-ghost" type="button" onClick={() => void suppliers.refetch()}>Coba lagi</button></div>}
          {suppliers.data?.length === 0 && <p className="mt-2 text-sm text-[var(--ink-soft)]">Belum ada supplier tersedia untuk dipilih.</p>}
          <div className="label-caps mt-4">Barang yang dipesan</div>
          <div className="mt-1 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {d.items.map((it) => {
              const v = poItems[it.productId] ?? { qty: it.qty, unitCost: it.lastCost };
              return (
                <div key={it.productId} className="grid grid-cols-[minmax(0,1fr)_58px_80px] items-center gap-2 py-2 sm:grid-cols-[minmax(0,1fr)_72px_110px]">
                  <span className="min-w-0 truncate text-sm">{it.productName}</span>
                  <input aria-label={`${it.productName}: jumlah dipesan`} className="input min-w-0 !min-h-[44px] px-2 text-sm" type="number" min={0} value={v.qty}
                    onChange={(e) => setPoItems({ ...poItems, [it.productId]: { ...v, qty: Math.max(0, Number(e.target.value) || 0) } })} />
                  <input aria-label={`${it.productName}: harga modal per unit`} className="input min-w-0 !min-h-[44px] px-2 text-sm" type="number" min={0} value={v.unitCost}
                    onChange={(e) => setPoItems({ ...poItems, [it.productId]: { ...v, unitCost: Math.max(0, Number(e.target.value) || 0) } })} />
                </div>
              );
            })}
          </div>
          <button
            className="btn mt-4 w-full"
            disabled={!poSupplier || orderToSupplier.isPending || suppliers.isLoading || Boolean(suppliers.error) || !suppliers.data?.length}
            onClick={() =>
              orderToSupplier.mutate({
                salesOrderId: order.id,
                supplierId: Number(poSupplier),
                items: Object.entries(poItems)
                  .map(([pid, v]) => ({ productId: Number(pid), qty: v.qty, unitCost: v.unitCost }))
                  .filter((i) => i.qty > 0),
              })
            }
          >
            {orderToSupplier.isPending ? "Mengirim…" : "Kirim order"}
          </button>
        </Modal>
      )}

      {/* Modal catat faktur supplier */}
      {fakModal !== null && d && (
        <Modal title="Catat faktur supplier" onClose={() => setFakModal(null)}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-caps block" htmlFor="supplier-invoice-number">No. faktur cetak</label>
              <input id="supplier-invoice-number" className="input mt-1" value={fakNumber} onChange={(e) => setFakNumber(e.target.value)} placeholder="mis. 8821" />
            </div>
            <div>
              <label className="label-caps block" htmlFor="supplier-invoice-due">Jatuh tempo</label>
              <input id="supplier-invoice-due" className="input mt-1" type="date" value={fakDue} onChange={(e) => setFakDue(e.target.value)} />
            </div>
          </div>
          <div className="label-caps mt-4">Barang sesuai faktur</div>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_42px_74px_42px_42px] gap-1 text-[8px] font-semibold uppercase tracking-wide text-[var(--ink-soft)] sm:grid-cols-[minmax(0,1fr)_58px_94px_62px_62px] sm:gap-2 sm:text-[10px]">
            <span className="min-w-0 truncate">Barang</span><span>Qty</span><span className="truncate">Harga modal</span><span>Diskon %</span><span>PPN %</span>
          </div>
          <div className="mt-1 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {d.pos.find((p) => p.id === fakModal)?.items.map((it) => {
              const v = fakItems[it.productId] ?? { qty: it.qty, unitCost: it.unitCost, discountPercent: 0, ppnPercent: 0 };
              const name = d.items.find((x) => x.productId === it.productId)?.productName ?? "Barang";
              return (
                <div key={it.productId} className="grid grid-cols-[minmax(0,1fr)_42px_74px_42px_42px] items-center gap-1 py-2 sm:grid-cols-[minmax(0,1fr)_58px_94px_62px_62px] sm:gap-2">
                  <span className="min-w-0 truncate text-sm" title={name}>{name}</span>
                  <input aria-label={`${name}: jumlah`} className="input min-w-0 !min-h-[44px] px-1 text-sm sm:px-2" type="number" min={0} value={v.qty}
                    onChange={(e) => setFakItems({ ...fakItems, [it.productId]: { ...v, qty: Math.max(0, Number(e.target.value) || 0) } })} />
                  <input aria-label={`${name}: harga modal per unit`} className="input min-w-0 !min-h-[44px] px-1 text-sm sm:px-2" type="number" min={0} value={v.unitCost}
                    onChange={(e) => setFakItems({ ...fakItems, [it.productId]: { ...v, unitCost: Math.max(0, Number(e.target.value) || 0) } })} />
                  <input aria-label={`${name}: diskon persen`} className="input min-w-0 !min-h-[44px] px-1 text-sm sm:px-2" type="number" min={0} max={100} value={v.discountPercent}
                    title="Diskon %" placeholder="Diskon %"
                    onChange={(e) => setFakItems({ ...fakItems, [it.productId]: { ...v, discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })} />
                  <input aria-label={`${name}: PPN persen`} className="input min-w-0 !min-h-[44px] px-1 text-sm sm:px-2" type="number" min={0} max={100} value={v.ppnPercent}
                    title="PPN %" placeholder="PPN %"
                    onChange={(e) => setFakItems({ ...fakItems, [it.productId]: { ...v, ppnPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })} />
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <label className="label-caps block" htmlFor="supplier-invoice-printed-total">Total tercetak di faktur</label>
            <input id="supplier-invoice-printed-total" className="input mt-1" type="number" min={0} value={fakPrinted} onChange={(e) => setFakPrinted(Math.max(0, Number(e.target.value) || 0))} />
            {(() => {
              const computed = Object.values(fakItems).reduce((s, v) => {
                const gross = v.qty * v.unitCost;
                const net = gross - Math.round(gross * v.discountPercent / 100);
                return s + net + Math.round(net * v.ppnPercent / 100);
              }, 0);
              const selisih = fakPrinted - computed;
              return (
                <p className={`mt-1 text-xs ${selisih !== 0 ? "font-semibold text-[var(--bad)]" : "text-[var(--ink-soft)]"}`}>
                  Hitungan sistem {rp(computed)}{selisih !== 0 ? ` · selisih ${rp(Math.abs(selisih))} — periksa sebelum dibukukan` : ""}
                </p>
              );
            })()}
          </div>
          <label className="mt-4 flex min-h-[44px] items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--slate)]" checked={fakTax} onChange={(e) => setFakTax(e.target.checked)} />
            Faktur pajak masukan lengkap (PPN bisa dikreditkan)
          </label>
          <button
            className="btn mt-4 w-full"
            disabled={!fakNumber || recordFaktur.isPending}
            onClick={() =>
              recordFaktur.mutate({
                poId: fakModal,
                number: fakNumber,
                invoiceDate: todayLocal(),
                dueDate: fakDue || undefined,
                printedTotal: fakPrinted,
                taxInvoiceComplete: fakTax,
                items: Object.entries(fakItems)
                  .map(([pid, v]) => ({ productId: Number(pid), qty: v.qty, unitCost: v.unitCost, discountPercent: v.discountPercent, ppnPercent: v.ppnPercent }))
                  .filter((i) => i.qty > 0),
              })
            }
          >
            {recordFaktur.isPending ? "Menyimpan…" : "Simpan sebagai draf"}
          </button>
          <p className="mt-2 text-xs text-[var(--ink-soft)]">Draf faktur belum menjadi hutang. Bukukan dari daftar faktur setelah dicek.</p>
        </Modal>
      )}
    </div>
  );
}

function FakturRow({ faktur }: { faktur: { id: number; number: string; status: string; selisih: number } }) {
  const utils = trpc.useUtils();
  const postFaktur = trpc.orders.postSupplierInvoice.useMutation({
    onSuccess: () => { void utils.orders.detail.invalidate(); },
  });
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--line)] px-3 py-2">
      <div className="text-sm">
        <b>Faktur {faktur.number}</b> <StatusBadge status={faktur.status} />
        {faktur.selisih !== 0 && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--bad)]">
            <AlertTriangle size={12} /> Selisih {rp(Math.abs(faktur.selisih))}
          </span>
        )}
      </div>
      {faktur.status === "draft" && (
        <button className="btn btn-accent !min-h-[44px] px-3 text-xs" disabled={postFaktur.isPending} onClick={() => postFaktur.mutate({ id: faktur.id })}>
          Bukukan (jadi hutang)
        </button>
      )}
    </div>
  );
}
