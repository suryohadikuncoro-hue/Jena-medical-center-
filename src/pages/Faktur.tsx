import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { rp, tanggal } from "@/lib/format";
import { PageHeader, Section, StatusBadge, Loading, LoadError, Empty, FilterChips, SearchField } from "@/components/bits";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "draft", label: "Draf" },
  { key: "posted", label: "Dibukukan" },
  { key: "selisih", label: "Ada selisih" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function Faktur() {
  const q = trpc.orders.supplierInvoices.useQuery(undefined, { refetchOnMount: "always" });
  const post = trpc.orders.postSupplierInvoice.useMutation({ onSuccess: () => q.refetch() });
  const [filter, setFilter] = useState<FilterKey>("all");
  const [cari, setCari] = useState("");

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  const term = cari.trim().toLowerCase();
  const rows = q.data.filter((f) => {
    const cocokFilter =
      filter === "all" ? true : filter === "selisih" ? f.selisih !== 0 : f.status === filter;
    const cocokCari = !term || f.number.toLowerCase().includes(term) || f.supplierName.toLowerCase().includes(term);
    return cocokFilter && cocokCari;
  });

  const jumlahSelisih = q.data.filter((f) => f.selisih !== 0).length;

  return (
    <div>
      <PageHeader
        title="Faktur supplier"
        sub={jumlahSelisih > 0 ? `${jumlahSelisih} faktur punya selisih dan perlu diperiksa` : "Draf belum menjadi hutang; bukukan setelah isi faktur dicek"}
      />

      <div className="space-y-3 px-4 pb-4 md:px-8">
        <SearchField value={cari} onChange={setCari} placeholder="Cari nomor faktur atau supplier…" label="Cari faktur supplier" />
        <FilterChips items={FILTERS} value={filter} onChange={setFilter} label="Filter faktur supplier" />
      </div>

      {rows.length === 0 ? (
        <Section className="!my-0">
          <Empty text={term ? "Tidak ada faktur yang cocok dengan pencarian." : "Belum ada faktur supplier tercatat."} />
        </Section>
      ) : (
        <div className="space-y-3 px-4 pb-4 md:px-8">
          {rows.map((f) => (
            <article key={f.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[0.95rem] font-bold text-[var(--ink)]">Faktur {f.number}</span>
                    <StatusBadge status={f.status} />
                    {!f.taxInvoiceComplete && f.status !== "draft" && (
                      <span className="badge bg-[var(--warn-bg)] text-[var(--warn)]">
                        <i className="size-1.5 shrink-0 rounded-full bg-[#e0a33a]" aria-hidden="true" />
                        Pajak belum lengkap
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[0.8125rem] text-[var(--ink-soft)]">
                    {f.supplierName} · {tanggal(f.invoiceDate)}
                    {f.dueDate ? ` · tempo ${tanggal(f.dueDate)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-display text-[0.95rem] font-bold tabular-nums text-[var(--ink)]">{rp(f.printedTotal)}</div>
                  <div className="text-[0.68rem] text-[var(--ink-soft)]">nilai tercetak</div>
                </div>
              </div>

              <div className="space-y-2 border-t border-[var(--line)] px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-xs text-[var(--ink-soft)]">Hitungan sistem</span>
                  <span className="text-sm font-semibold tabular-nums text-[var(--ink)]">{rp(f.computedTotal)}</span>
                </div>
                {f.status !== "draft" && f.remaining > 0 && (
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-xs text-[var(--ink-soft)]">Sisa hutang</span>
                    <span className="text-sm font-semibold tabular-nums text-[var(--warn)]">{rp(f.remaining)}</span>
                  </div>
                )}

                {f.selisih !== 0 ? (
                  <p className="flex items-start gap-2 rounded-xl bg-[var(--bad-bg)] px-3 py-2 text-xs font-semibold leading-relaxed text-[var(--bad)]">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Tercetak {f.selisih > 0 ? "lebih tinggi" : "lebih rendah"} {rp(Math.abs(f.selisih))} dari hitungan sistem.
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-xs font-medium text-[var(--ok)]">
                    <CheckCircle2 size={14} aria-hidden="true" />
                    Nilai faktur sudah sesuai
                  </p>
                )}

                {f.status === "draft" && (
                  <button
                    className="btn mt-1 w-full"
                    disabled={post.isPending || f.selisih !== 0}
                    title={f.selisih !== 0 ? "Perbaiki selisih dulu sebelum dibukukan" : undefined}
                    onClick={() => post.mutate({ id: f.id })}
                  >
                    {post.isPending ? "Membukukan…" : f.selisih !== 0 ? "Periksa selisih dulu" : "Bukukan (jadi hutang)"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="px-4 py-2 text-xs leading-relaxed text-[var(--ink-soft)] md:px-8">
        Faktur dengan selisih tidak bisa dibukukan — perbaiki jumlah barang atau total tercetak agar hutang sesuai dokumen.
      </p>
    </div>
  );
}
