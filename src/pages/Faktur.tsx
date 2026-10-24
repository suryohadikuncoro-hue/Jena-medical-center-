import { AlertTriangle } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { rp, tanggal } from "@/lib/format";
import { PageHeader, Section, StatusBadge, Loading, LoadError, Empty } from "@/components/bits";

export default function Faktur() {
  const q = trpc.orders.supplierInvoices.useQuery(undefined, { refetchOnMount: "always" });
  const post = trpc.orders.postSupplierInvoice.useMutation({ onSuccess: () => q.refetch() });

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  return (
    <div>
      <PageHeader title="Faktur supplier" sub="Draf belum menjadi hutang; bukukan setelah isi faktur dicek" />
      <Section>
        {q.data.length === 0 ? (
          <Empty text="Belum ada faktur supplier tercatat." />
        ) : (
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {q.data.map((f) => (
              <div key={f.id} className="px-4 py-4 md:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-base font-semibold">Faktur {f.number}</span>
                      <StatusBadge status={f.status} />
                      {!f.taxInvoiceComplete && f.status !== "draft" && (
                        <span className="badge text-[var(--warn)]">Pajak belum lengkap</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-[var(--ink-soft)]">
                      {f.supplierName} · {tanggal(f.invoiceDate)}{f.dueDate ? ` · tempo ${tanggal(f.dueDate)}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-base font-semibold">{rp(f.printedTotal)}</div>
                    <div className="text-xs text-[var(--ink-soft)]">nilai tercetak</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="text-[var(--ink-soft)]">Hitungan sistem: {rp(f.computedTotal)}</span>
                  {f.selisih !== 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-[var(--bad)]">
                      <AlertTriangle size={12} /> Selisih {rp(Math.abs(f.selisih))}
                    </span>
                  )}
                  {f.status !== "draft" && f.remaining > 0 && <span className="text-[var(--ink-soft)]">Sisa hutang {rp(f.remaining)}</span>}
                  {f.status === "draft" && (
                    <button
                      className="btn btn-accent !min-h-[36px] px-3 text-xs"
                      disabled={post.isPending || f.selisih !== 0}
                      title={f.selisih !== 0 ? "Perbaiki selisih dulu sebelum dibukukan" : undefined}
                      onClick={() => post.mutate({ id: f.id })}
                    >
                      {f.selisih !== 0 ? "Periksa selisih dulu" : "Bukukan (jadi hutang)"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
      <p className="px-4 py-4 text-xs text-[var(--ink-soft)] md:px-8">
        Faktur dengan selisih tidak bisa dibukukan — perbaiki jumlah barang atau total tercetak agar hutang sesuai dokumen.
      </p>
    </div>
  );
}
