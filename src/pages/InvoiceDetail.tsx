import { Link, useParams } from "react-router";
import { MessageCircle, Trash2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/providers/trpc";
import { rp, tanggal, waNumber } from "@/lib/format";
import { PageHeader, Section, StatusBadge, KV, Loading, LoadError } from "@/components/bits";

export default function InvoiceDetail() {
  const { id } = useParams();
  const q = trpc.invoices.detail.useQuery({ id: Number(id) }, { refetchOnMount: "always" });
  const utils = trpc.useUtils();
  const issue = trpc.invoices.issue.useMutation({ onSuccess: () => { q.refetch(); utils.invoices.list.invalidate(); } });
  const updateDraft = trpc.invoices.updateDraft.useMutation({ onSuccess: () => { q.refetch(); } });
  const del = trpc.invoices.deleteDraft.useMutation({ onSuccess: () => { window.location.assign("/invoice"); } });
  const [adjustments, setAdjustments] = useState<Record<number, { discountPercent: number; ppnPercent: number }>>({});

  useEffect(() => {
    const invoiceItems = q.data?.items ?? [];
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
        action={<StatusBadge status={inv.status} />}
      />

      <Section title="Rincian tagihan">
        <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
          {items.map((it) => (
            <div key={it.id} className="flex items-baseline justify-between gap-4 px-4 py-3 md:px-8">
              <div>
                <div className="text-sm font-medium">{it.description}</div>
                  <div className="text-xs text-[var(--ink-soft)]">
                  {it.qty} × {rp(it.unitPrice)} · diskon {it.discountPercent}% · PPN {it.ppnPercent}%{!it.taxable && " · tidak kena PPN"}
                </div>
              </div>
              <span className="text-sm font-semibold">{rp((it.qty * it.unitPrice) - Math.round(it.qty * it.unitPrice * it.discountPercent / 100) + Math.round(((it.qty * it.unitPrice) - Math.round(it.qty * it.unitPrice * it.discountPercent / 100)) * it.ppnPercent / 100))}</span>
            </div>
          ))}
          <div className="px-4 py-3 md:px-8">
            <div className="flex justify-between text-sm"><span className="text-[var(--ink-soft)]">Subtotal</span><span className="font-medium">{rp(inv.subtotal)}</span></div>
            <div className="mt-1 flex justify-between text-sm"><span className="text-[var(--ink-soft)]">PPN manual</span><span className="font-medium">{rp(inv.ppnAmount)}</span></div>
            <div className="mt-2 flex justify-between border-t border-[var(--line-strong)] pt-2">
              <span className="text-sm font-semibold">Total tagihan</span>
              <span className="font-display text-lg font-semibold">{rp(inv.total)}</span>
            </div>
          </div>
          {inv.status === "draft" && (
            <div className="border-b border-[var(--line)] px-4 py-4 md:px-8">
              <div className="mb-2 text-xs text-[var(--ink-soft)]">PPN dan diskon diisi manual per item. Nilai 0 berarti tidak ada.</div>
              <div className="grid grid-cols-[1fr_92px_92px] gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                <span>Barang</span><span>Diskon %</span><span>PPN %</span>
              </div>
              <div className="space-y-2">
                {items.map((it) => {
                  const v = adjustments[it.id] ?? { discountPercent: 0, ppnPercent: 0 };
                  return <div key={it.id} className="grid grid-cols-[1fr_92px_92px] items-center gap-2 text-sm">
                    <span className="truncate">{it.description}</span>
                    <input aria-label="Diskon persen" className="input !min-h-[40px] px-2 text-sm" type="number" min={0} max={100} value={v.discountPercent} title="Diskon %" onChange={(e) => setAdjustments({ ...adjustments, [it.id]: { ...v, discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })} />
                    <input aria-label="PPN persen" className="input !min-h-[40px] px-2 text-sm" type="number" min={0} max={100} value={v.ppnPercent} title="PPN %" onChange={(e) => setAdjustments({ ...adjustments, [it.id]: { ...v, ppnPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })} />
                  </div>;
                })}
              </div>
              <div className="mt-3 flex justify-end">
                <button className="btn btn-accent !min-h-[40px] px-3 text-xs" disabled={updateDraft.isPending} onClick={() => updateDraft.mutate({ id: inv.id, items: Object.entries(adjustments).map(([id, v]) => ({ id: Number(id), ...v })) })}>
                  <Save size={14} /> {updateDraft.isPending ? "Menyimpan…" : "Simpan PPN & diskon"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Pembayaran" note={`Terbayar ${rp(paid)} · Sisa ${rp(remaining)}`}>
        <div className="border-b border-[var(--line)]">
          {payments.length === 0 && <p className="px-4 py-3 text-sm text-[var(--ink-soft)] md:px-8">Belum ada pembayaran tercatat.</p>}
          {payments.map((p) => (
            <KV key={p.id} k={`${tanggal(p.date)} · ${p.method}`} v={rp(p.amount)} />
          ))}
          {inv.status !== "draft" && remaining > 0 && (
            <div className="px-4 py-3 md:px-8">
              <Link to={`/pembayaran?invoice=${inv.id}`} className="btn btn-ghost !min-h-[40px] px-3 text-xs">Catat pembayaran</Link>
            </div>
          )}
        </div>
      </Section>

      <div className="flex flex-wrap gap-3 px-4 py-6 md:px-8">
        {inv.status === "draft" ? (
          <>
            <button className="btn flex-1 md:flex-none" onClick={() => issue.mutate({ id: inv.id })} disabled={issue.isPending}>
              {issue.isPending ? "Menerbitkan…" : "Terbitkan invoice"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { if (confirm("Hapus draf invoice ini?")) del.mutate({ id: inv.id }); }}
              disabled={del.isPending}
            >
              <Trash2 size={14} /> Hapus draf
            </button>
          </>
        ) : (
          wa && (
            <a className="btn btn-accent flex-1 md:flex-none" href={`https://wa.me/${wa}?text=${waText}`} target="_blank" rel="noreferrer">
              <MessageCircle size={16} /> Kirim invoice via WhatsApp
            </a>
          )
        )}
      </div>

      {inv.status === "draft" && (
        <p className="px-4 pb-6 text-xs text-[var(--ink-soft)] md:px-8">
          Draf belum menjadi piutang dan belum masuk pembukuan. Menerbitkan invoice akan membentuk jurnal piutang,
          pendapatan, PPN sesuai input manual, dan HPP secara otomatis.
        </p>
      )}
    </div>
  );
}
