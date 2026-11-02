import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { rp, tanggal } from "@/lib/format";
import { PageHeader, Section, StatusBadge, Loading, LoadError, Empty, FilterChips, SearchField } from "@/components/bits";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "draft", label: "Draf" },
  { key: "open", label: "Belum lunas" },
  { key: "paid", label: "Lunas" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function InvoiceList() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("f") ?? "all";
  const f = (FILTERS.some((x) => x.key === raw) ? raw : "all") as FilterKey;
  const [cari, setCari] = useState("");
  const q = trpc.invoices.list.useQuery(undefined, { refetchOnMount: "always" });

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  const term = cari.trim().toLowerCase();
  const rows = q.data.filter((i) => {
    const cocokStatus =
      f === "all" ? true : f === "draft" ? i.status === "draft" : f === "paid" ? i.status === "paid" : i.status === "issued" || i.status === "partial";
    const cocokCari = !term || i.number.toLowerCase().includes(term) || i.customerName.toLowerCase().includes(term);
    return cocokStatus && cocokCari;
  });

  return (
    <div>
      <PageHeader title="Invoice" sub="Invoice dibuat otomatis dari pesanan; terbitkan untuk membukukan piutang" />

      <div className="space-y-3 px-4 pb-4 md:px-8">
        <SearchField value={cari} onChange={setCari} placeholder="Cari nomor invoice atau pelanggan…" label="Cari invoice" />
        <FilterChips items={FILTERS} value={f} onChange={(key) => setParams(key === "all" ? {} : { f: key })} label="Filter status invoice" />
      </div>

      <Section className="!my-0">
        {rows.length === 0 ? (
          <Empty text={term ? "Tidak ada invoice yang cocok dengan pencarian." : "Belum ada invoice."} />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {rows.map((i) => (
              <Link
                key={i.id}
                to={`/invoice/${i.id}`}
                className="flex items-start justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-[var(--slate-hover)]/40 md:px-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[0.95rem] font-bold text-[var(--ink)]">{i.number}</span>
                    <StatusBadge status={i.status} />
                  </div>
                  <p className="mt-1 truncate text-[0.8125rem] text-[var(--ink-soft)]">
                    {i.customerName} · {tanggal(i.issueDate)}
                    {i.dueDate ? ` · tempo ${tanggal(i.dueDate)}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-[0.95rem] font-bold tabular-nums text-[var(--ink)]">{rp(i.total)}</div>
                  <div className={`mt-1 text-xs ${i.remaining > 0 && i.status !== "draft" ? "font-semibold text-[var(--warn)]" : "text-[var(--ink-soft)]"}`}>
                    {i.remaining > 0 && i.status !== "draft" ? `Sisa ${rp(i.remaining)}` : i.status === "draft" ? "Belum diterbitkan" : "Lunas"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
