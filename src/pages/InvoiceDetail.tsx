import { Link, useParams } from "react-router";
import { MessageCircle, Save, Trash2, Wallet } from "lucide-react";
import { shareInvoicePdf } from "@/lib/pdf";
import { useEffect, useState } from "react";
import { trpc } from "@/providers/trpc";
import { rp, tanggal, waNumber } from "@/lib/format";
import { PageHeader, Section, StatusBadge, Loading, LoadError, Empty } from "@/components/bits";

export default function InvoiceDetail() {
  const { id } = useParams();
  const q = trpc.invoices.detail.useQuery({ id: Number(id) }, { refetchOnMount: "always" });
  const utils = trpc.useUtils();
  const issue = trpc.invoices.issue.useMutation({ onSuccess: () => { q.refetch(); utils.invoices.list.invalidate(); } });
  const updateDraft = trpc.invoices.updateDraft.useMutation({ onSuccess: () => { q.refetch(); } });
  const del = trpc.invoices.deleteDraft.useMutation({ onSuccess: () => { window.location.assign("/invoice"); } });
  const [adjustments, setAdjustments] = useState<Record<number, { discountPercent: number; ppnPercent: number }>>({});
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    const invoiceItems = q.data?.items ?? [];
    // Form state must reset when a different invoice payload arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdjustments(Object.fromEntries(invoiceItems.map((it) => [it.id, { discountPercent: it.discountPercent, ppnPercent: it.ppnPercent }])));
  }, [q.data?.items]);

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;
  const { invoice: inv, items, payments, paid, remaining, soNumber } = q.data;

  const wa = waNumber(inv.customerPhone);
  const waText = encodeURIComponent(
    `Kepada ${inv.customerName},\n\nBerikut invoice ${inv.number} dari Jena Medical Center tertanggal ${tanggal(inv.issueDate)}.\n\nSubtotal: ${rp(inv.subtotal)}\nPPN manual: ${rp(inv.ppnAmount)}\nTotal tagihan: ${rp(inv.total)}\nJatuh tempo: ${tanggal(inv.dueDate)}\n\nMohon konfirmasi pembayaran. Terima kasih.`,
  );

  return (
    <div>
      <PageHeader
        title={inv.number}
        sub={`${inv.customerName}${soNumber ? ` · dari ${soNumber}` : ""}`}
        back="/invoice"
        backLabel="Daftar invoice"
        action={<StatusBadge status={inv.status} />}
      />

      <Section title="Rincian tagihan" note={`Terbit ${tanggal(inv.issueDate)} · jatuh tempo ${tanggal(inv.dueDate)}`}>
        <div className="divide-y divide-[var(--line)]">
          {items.map((it) => {
            const gross = it.qty * it.unitPrice;
            const net = gross - Math.round(gross * it.discountPercent / 100);
            const line = net + Math.round(net * it.ppnPercent / 100);
            return (
              <div key={it.id} className="flex items-baseline justify-between gap-4 px-4 py-3.5 md:px-5">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-[var(--ink)]">{it.description}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-soft)]">
                    {it.qty} × {rp(it.unitPrice)} · diskon {it.discountPercent}% · PPN {it.ppnPercent}%{!it.taxable && " · tidak kena PPN"}
                  </p>
                </div>
                <span className="shrink-0 font-display text-sm font-bold tabular-nums text-[var(--ink)]">{rp(line)}</span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[var(--line)] bg-[var(--paper)] px-4 py-3.5 md:px-5">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--ink-soft)]">Subtotal</span>
            <span className="font-medium tabular-nums text-[var(--ink)]">{rp(inv.subtotal)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-[var(--ink-soft)]">PPN manual</span>
            <span className="font-medium tabular-nums text-[var(--ink)]">{rp(inv.ppnAmount)}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between border-t border-[var(--line-strong)] pt-2">
            <span className="text-sm font-semibold text-[var(--ink)]">Total tagihan</span>
            <span className="font-display text-lg font-bold tabular-nums text-[var(--ink)]">{rp(inv.total)}</span>
          </div>
        </div>

        {inv.status === "draft" && (
          <div className="border-t border-[var(--line)] px-4 py-4 md:px-5">
            <p className="text-xs leading-relaxed text-[var(--ink-soft)]">PPN dan diskon diisi manual per item. Nilai 0 berarti tidak ada.</p>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_76px_76px] gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)] sm:grid-cols-[minmax(0,1fr)_92px_92px]">
              <span>Barang</span><span>Diskon %</span><span>PPN %</span>
            </div>
            <div className="mt-1.5 space-y-2">
              {items.map((it) => {
                const v = adjustments[it.id] ?? { discountPercent: 0, ppnPercent: 0 };
                return (
                  <div key={it.id} className="grid grid-cols-[minmax(0,1fr)_76px_76px] items-center gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_92px_92px]">
                    <span className="min-w-0 truncate text-[var(--ink)]" title={it.description}>{it.description}</span>
                    <input aria-label={`${it.description}: diskon persen`} className="input min-w-0 !min-h-[40px] px-2 text-sm" type="number" min={0} max={100} value={v.discountPercent} title="Diskon %" onChange={(e) => setAdjustments({ ...adjustments, [it.id]: { ...v, discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })} />
                    <input aria-label={`${it.description}: PPN persen`} className="input min-w-0 !min-h-[40px] px-2 text-sm" type="number" min={0} max={100} value={v.ppnPercent} title="PPN %" onChange={(e) => setAdjustments({ ...adjustments, [it.id]: { ...v, ppnPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })} />
                  </div>
                );
              })}
            </div>
            <button className="btn btn-ghost mt-3 w-full min-h-10 text-xs" disabled={updateDraft.isPending} onClick={() => updateDraft.mutate({ id: inv.id, items: Object.entries(adjustments).map(([id, v]) => ({ id: Number(id), ...v })) })}>
              <Save size={14} aria-hidden="true" /> {updateDraft.isPending ? "Menyimpan…" : "Simpan PPN & diskon"}
            </button>
          </div>
        )}
      </Section>

      <Section title="Pembayaran" note={`Terbayar ${rp(paid)} · Sisa ${rp(remaining)}`}>
        {payments.length === 0 ? (
          <Empty text="Belum ada pembayaran tercatat." />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 md:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--ok-bg)] text-[var(--ok)]" aria-hidden="true">
                    <Wallet size={15} />
                  </span>
                  <span className="min-w-0 truncate text-xs text-[var(--ink-soft)]">{tanggal(p.date)} · {p.method}</span>
                </div>
                <span className="shrink-0 font-display text-sm font-bold tabular-nums text-[var(--ok)]">+{rp(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
        {inv.status !== "draft" && remaining > 0 && (
          <div className="border-t border-[var(--line)] px-4 py-3 md:px-5">
            <Link to={`/pembayaran?invoice=${inv.id}`} className="btn btn-ghost w-full min-h-10 text-xs">Catat pembayaran</Link>
          </div>
        )}
      </Section>

      <div className="flex flex-wrap gap-2 px-4 py-5 md:px-8">
        {inv.status === "draft" ? (
          <>
            <button className="btn flex-1 sm:flex-none" onClick={() => issue.mutate({ id: inv.id })} disabled={issue.isPending}>
              {issue.isPending ? "Menerbitkan…" : "Terbitkan invoice"}
            </button>
            <button
              className="btn btn-ghost text-[var(--bad)]"
              onClick={() => { if (confirm("Hapus draf invoice ini?")) del.mutate({ id: inv.id }); }}
              disabled={del.isPending}
            >
              <Trash2 size={14} aria-hidden="true" /> Hapus draf
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost" disabled={pdfBusy} onClick={async () => { setPdfBusy(true); try { await shareInvoicePdf(inv, items); } finally { setPdfBusy(false); } }}>
              {pdfBusy ? "Menyiapkan PDF…" : "PDF"}
            </button>
            {wa && (
              <a className="btn flex-1 sm:flex-none" href={`https://wa.me/${wa}?text=${waText}`} target="_blank" rel="noreferrer">
                <MessageCircle size={16} aria-hidden="true" /> Kirim ke WhatsApp
              </a>
            )}
          </>
        )}
      </div>

      {inv.status === "draft" && (
        <p className="px-4 pb-6 text-xs leading-relaxed text-[var(--ink-soft)] md:px-8">
          Draf belum menjadi piutang dan belum masuk pembukuan. Menerbitkan invoice akan membentuk jurnal piutang,
          pendapatan, PPN sesuai input manual, dan HPP secara otomatis.
        </p>
      )}
    </div>
  );
}
