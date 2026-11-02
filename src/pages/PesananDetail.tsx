import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { X, AlertTriangle, Check, MessageCircle, Pencil, Trash2, ArrowRight, Plus } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { rp, tanggal, todayLocal, waNumber } from "@/lib/format";
import { sharePurchaseOrderPdf } from "@/lib/pdf";
import { PageHeader, Section, StatusBadge, Loading, LoadError } from "@/components/bits";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-0 sm:w-full">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-4 py-3">
          <DialogTitle className="font-display text-base font-bold text-[var(--ink)]">{title}</DialogTitle>
          <DialogClose asChild>
            <button type="button" aria-label="Tutup dialog" className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-[var(--slate-hover)] hover:text-[var(--slate)]">
              <X size={18} />
            </button>
          </DialogClose>
        </div>
        <div className="p-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

function StepMarker({ n, done }: { n: number; done: boolean }) {
  return (
    <span
      className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
        done ? "bg-[var(--ok)] text-white" : "bg-[#e6f2fc] text-[var(--slate-deep)]"
      }`}
      aria-hidden="true"
    >
      {done ? <Check size={15} /> : n}
    </span>
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
        back="/pesanan"
        backLabel="Daftar pesanan"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            {order.status === "draft" && (
              <>
                <Link className="btn btn-ghost px-3 text-xs" to={`/pesanan/baru?edit=${order.id}`}>
                  <Pencil size={14} /> Edit
                </Link>
                <button
                  className="btn btn-ghost px-3 text-xs text-[var(--bad)]"
                  disabled={deleteOrder.isPending}
                  onClick={() => { if (confirm("Hapus pesanan draft ini?")) deleteOrder.mutate({ id: order.id }); }}
                >
                  <Trash2 size={14} /> Hapus
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Barang */}
      <Section title="Barang" note={`Total pesanan ${rp(d.total)} · belum termasuk PPN · termin ${order.termDays} hari`}>
        <div className="divide-y divide-[var(--line)]">
          {d.items.map((it) => (
            <div key={it.id} className="px-4 py-3.5 md:px-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="min-w-0 break-words text-sm font-semibold text-[var(--ink)]">{it.productName}</span>
                <span className="font-display text-sm font-bold tabular-nums text-[var(--ink)]">{rp(it.amount)}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--ink-soft)]">
                <span>{it.qty} {it.unit} × {rp(it.unitPrice)}</span>
                <span>{it.priceSource === "standar" ? "Harga standar" : it.priceSource === "khusus" ? "Harga khusus" : "Diubah manual"}</span>
                <span className={it.marginPct < 0 ? "font-semibold text-[var(--bad)]" : undefined}>Margin {it.marginPct > 0 ? "+" : ""}{it.marginPct}%</span>
              </div>
              {it.belowCost && (
                <p className="mt-2 flex items-start gap-2 rounded-xl bg-[var(--bad-bg)] px-3 py-2 text-xs font-medium leading-relaxed text-[var(--bad)]">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Dijual di bawah modal terakhir ({rp(it.lastCost)}). Tetap bisa diproses, tapi marginnya minus.
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Langkah berikutnya */}
      <Section title="Langkah berikutnya">
        <div className="divide-y divide-[var(--line)]">
          <div className="px-4 py-4 md:px-5">
            <div className="flex items-center gap-3">
              <StepMarker n={1} done={d.pos.length > 0 && poDone === d.pos.length} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--ink)]">Order ke supplier</p>
                <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                  {d.pos.length === 0 ? "Belum ada order ke supplier." : `${d.pos.length} supplier sudah dipesan.`}
                </p>
              </div>
              {d.pos.length > 0 && poDone === d.pos.length && <span className="badge bg-[var(--ok-bg)] text-[var(--ok)]">Selesai</span>}
            </div>

            {d.pos.length > 0 && (
              <div className="mt-3 space-y-2">
                {d.pos.map((p) => (
                  <div key={p.id} className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="font-display text-[0.8125rem] font-bold text-[var(--ink)]">{p.number}</span>
                        <span className="min-w-0 truncate text-xs text-[var(--ink-soft)]">{p.supplierName}</span>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    {p.status === "sent" && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {waNumber(p.supplierPhone) && (
                          <a
                            className="btn min-h-10 px-3 text-xs"
                            target="_blank"
                            rel="noreferrer"
                            href={`https://wa.me/${waNumber(p.supplierPhone)}?text=${encodeURIComponent(`Halo ${p.supplierName}, berikut order ${p.number} dari Jena Medical Center:\n\n${p.items.map((it) => `${d.items.find((x) => x.productId === it.productId)?.productName ?? "Barang"} — ${it.qty} ${d.items.find((x) => x.productId === it.productId)?.unit ?? "unit"} @ ${rp(it.unitCost)}`).join("\n")}\n\nMohon konfirmasi ketersediaan dan harga. Terima kasih.`)}`}
                          >
                            <MessageCircle size={14} aria-hidden="true" /> WhatsApp
                          </a>
                        )}
                        <button
                          className="btn btn-ghost min-h-10 px-3 text-xs"
                          disabled={pdfBusy === p.id}
                          onClick={async () => {
                            setPdfBusy(p.id);
                            try {
                              await sharePurchaseOrderPdf(
                                { number: p.number, orderDate: p.orderDate, supplierName: p.supplierName },
                                p.items.map((it) => ({
                                  name: d.items.find((x) => x.productId === it.productId)?.productName ?? "Barang",
                                  qty: it.qty,
                                  unitCost: it.unitCost,
                                })),
                              );
                            } finally { setPdfBusy(null); }
                          }}
                        >
                          {pdfBusy === p.id ? "Menyiapkan…" : "PDF"}
                        </button>
                        <button className="btn btn-ghost min-h-10 px-3 text-xs" onClick={() => confirmPO.mutate({ poId: p.id })} disabled={confirmPO.isPending}>
                          Catat balasan
                        </button>
                        <button
                          className="btn btn-ghost min-h-10 px-3 text-xs text-[var(--bad)]"
                          disabled={deletePO.isPending}
                          onClick={() => { if (confirm("Hapus PO yang belum dikonfirmasi ini?")) deletePO.mutate({ poId: p.id }); }}
                        >
                          <Trash2 size={14} aria-hidden="true" /> Hapus
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {order.status !== "closed" && (
              <button className="btn btn-ghost mt-3 w-full min-h-10 text-xs" onClick={openPoModal}>
                <Plus size={14} aria-hidden="true" /> Order ke supplier
              </button>
            )}
          </div>

          <div className="px-4 py-4 md:px-5">
            <div className="flex items-center gap-3">
              <StepMarker n={2} done={sisaTagih <= 0} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--ink)]">Invoice ke pelanggan</p>
                <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                  Sudah ditagih {rp(invoiced)} · Sisa {rp(Math.max(0, sisaTagih))} (sebelum PPN)
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {d.invoices.map((v) => (
                <Link
                  key={v.id}
                  to={`/invoice/${v.id}`}
                  className="group flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--slate-hover)]/50"
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-display text-[0.8125rem] font-bold text-[var(--ink)]">{v.number}</span>
                    <StatusBadge status={v.status} />
                  </span>
                  <span className="flex items-center gap-1.5 font-display text-sm font-bold tabular-nums text-[var(--ink)]">
                    {rp(v.total)}
                    <ArrowRight size={13} className="text-[var(--ink-soft)]/60 transition group-hover:translate-x-0.5 group-hover:text-[var(--slate)]" aria-hidden="true" />
                  </span>
                </Link>
              ))}
              {sisaTagih > 0 && (
                <button
                  className="btn w-full min-h-10 text-xs"
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

          <div className="px-4 py-4 md:px-5">
            <div className="flex items-center gap-3">
              <StepMarker n={3} done={d.pos.length > 0 && d.pos.every((p) => p.faktur.length > 0)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--ink)]">Faktur supplier</p>
                <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Dicatat dari faktur cetak; sistem menghitung ulang dan menandai selisih.</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {d.pos.map((p) => (
                <div key={p.id} className="space-y-2">
                  {p.faktur.map((f) => (
                    <FakturRow key={f.id} faktur={f} />
                  ))}
                  {p.status === "confirmed" && p.faktur.length === 0 && (
                    <button className="btn btn-ghost w-full min-h-10 text-xs" onClick={() => openFakModal(p.id)}>
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
          {suppliers.error && <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl bg-[var(--bad-bg)] px-3 py-2" role="alert"><p className="text-sm text-[var(--bad)]">Daftar supplier gagal dimuat: {suppliers.error.message}</p><button className="btn btn-ghost min-h-9 px-3 text-xs" type="button" onClick={() => void suppliers.refetch()}>Coba lagi</button></div>}
          {suppliers.data?.length === 0 && <p className="mt-2 text-sm text-[var(--ink-soft)]">Belum ada supplier tersedia untuk dipilih.</p>}
          <div className="label-caps mt-4">Barang yang dipesan</div>
          <div className="mt-1 divide-y divide-[var(--line)]">
            {d.items.map((it) => {
              const v = poItems[it.productId] ?? { qty: it.qty, unitCost: it.lastCost };
              return (
                <div key={it.productId} className="grid grid-cols-[minmax(0,1fr)_58px_80px] items-center gap-2 py-2 sm:grid-cols-[minmax(0,1fr)_72px_110px]">
                  <span className="min-w-0 truncate text-sm">{it.productName}</span>
                  <input aria-label={`${it.productName}: jumlah dipesan`} className="input min-w-0 !min-h-[40px] px-2 text-sm" type="number" min={0} value={v.qty}
                    onChange={(e) => setPoItems({ ...poItems, [it.productId]: { ...v, qty: Math.max(0, Number(e.target.value) || 0) } })} />
                  <input aria-label={`${it.productName}: harga modal per unit`} className="input min-w-0 !min-h-[40px] px-2 text-sm" type="number" min={0} value={v.unitCost}
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
            <label className="block" htmlFor="supplier-invoice-number">
              <span className="label-caps">No. faktur cetak</span>
              <input id="supplier-invoice-number" className="input mt-1" value={fakNumber} onChange={(e) => setFakNumber(e.target.value)} placeholder="mis. 8821" />
            </label>
            <label className="block" htmlFor="supplier-invoice-due">
              <span className="label-caps">Jatuh tempo</span>
              <input id="supplier-invoice-due" className="input mt-1" type="date" value={fakDue} onChange={(e) => setFakDue(e.target.value)} />
            </label>
          </div>
          <div className="label-caps mt-4">Barang sesuai faktur</div>
          <div className="mt-2 hidden grid-cols-[minmax(0,1fr)_58px_94px_62px_62px] gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)] sm:grid">
            <span className="min-w-0 truncate">Barang</span><span>Qty</span><span className="truncate">Harga modal</span><span>Diskon %</span><span>PPN %</span>
          </div>
          <div className="mt-2 space-y-2 sm:space-y-0 sm:divide-y sm:divide-[var(--line)]">
            {d.pos.find((p) => p.id === fakModal)?.items.map((it) => {
              const v = fakItems[it.productId] ?? { qty: it.qty, unitCost: it.unitCost, discountPercent: 0, ppnPercent: 0 };
              const name = d.items.find((x) => x.productId === it.productId)?.productName ?? "Barang";
              return (
                <div key={it.productId} className="grid grid-cols-2 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 sm:grid-cols-[minmax(0,1fr)_58px_94px_62px_62px] sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-2">
                  <span className="col-span-2 min-w-0 break-words text-sm font-semibold text-[var(--ink)] sm:col-span-1 sm:truncate" title={name}>{name}</span>
                  <label className="flex min-w-0 flex-col gap-1 text-[0.65rem] font-medium text-[var(--ink-soft)] sm:contents">
                    <span className="sm:hidden">Qty</span>
                    <input aria-label={`${name}: jumlah`} className="input min-w-0 !min-h-[40px] px-2 text-sm" type="number" min={0} value={v.qty}
                      onChange={(e) => setFakItems({ ...fakItems, [it.productId]: { ...v, qty: Math.max(0, Number(e.target.value) || 0) } })} />
                  </label>
                  <label className="flex min-w-0 flex-col gap-1 text-[0.65rem] font-medium text-[var(--ink-soft)] sm:contents">
                    <span className="sm:hidden">Harga modal</span>
                    <input aria-label={`${name}: harga modal per unit`} className="input min-w-0 !min-h-[40px] px-2 text-sm" type="number" min={0} value={v.unitCost}
                      onChange={(e) => setFakItems({ ...fakItems, [it.productId]: { ...v, unitCost: Math.max(0, Number(e.target.value) || 0) } })} />
                  </label>
                  <label className="flex min-w-0 flex-col gap-1 text-[0.65rem] font-medium text-[var(--ink-soft)] sm:contents">
                    <span className="sm:hidden">Diskon %</span>
                    <input aria-label={`${name}: diskon persen`} className="input min-w-0 !min-h-[40px] px-2 text-sm" type="number" min={0} max={100} value={v.discountPercent}
                      title="Diskon %" onChange={(e) => setFakItems({ ...fakItems, [it.productId]: { ...v, discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })} />
                  </label>
                  <label className="flex min-w-0 flex-col gap-1 text-[0.65rem] font-medium text-[var(--ink-soft)] sm:contents">
                    <span className="sm:hidden">PPN %</span>
                    <input aria-label={`${name}: PPN persen`} className="input min-w-0 !min-h-[40px] px-2 text-sm" type="number" min={0} max={100} value={v.ppnPercent}
                      title="PPN %" onChange={(e) => setFakItems({ ...fakItems, [it.productId]: { ...v, ppnPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })} />
                  </label>
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
          <label className="mt-4 flex min-h-11 items-center gap-3 rounded-xl border border-[var(--line)] px-3 text-sm font-medium">
            <input type="checkbox" className="size-5 accent-[var(--slate)]" checked={fakTax} onChange={(e) => setFakTax(e.target.checked)} />
            Faktur pajak masukan lengkap
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
          <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">Draf faktur belum menjadi hutang. Bukukan dari daftar faktur setelah dicek.</p>
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
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-display text-[0.8125rem] font-bold text-[var(--ink)]">Faktur {faktur.number}</span>
        <StatusBadge status={faktur.status} />
        {faktur.selisih !== 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--bad)]">
            <AlertTriangle size={12} aria-hidden="true" /> Selisih {rp(Math.abs(faktur.selisih))}
          </span>
        )}
      </div>
      {faktur.status === "draft" && (
        <button className="btn min-h-10 px-3 text-xs" disabled={postFaktur.isPending} onClick={() => postFaktur.mutate({ id: faktur.id })}>
          Bukukan (jadi hutang)
        </button>
      )}
    </div>
  );
}
