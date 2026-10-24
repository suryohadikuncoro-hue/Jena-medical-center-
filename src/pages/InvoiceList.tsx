import { Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { rp, tanggal } from "@/lib/format";
import { PageHeader, Section, StatusBadge, Loading, LoadError, Empty } from "@/components/bits";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "draft", label: "Draf" },
  { key: "open", label: "Belum lunas" },
  { key: "paid", label: "Lunas" },
] as const;

export default function InvoiceList() {
  const [params, setParams] = useSearchParams();
  const f = params.get("f") ?? "all";
  const q = trpc.invoices.list.useQuery(undefined, { refetchOnMount: "always" });

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  const rows = q.data.filter((i) =>
    f === "all" ? true : f === "draft" ? i.status === "draft" : f === "paid" ? i.status === "paid" : i.status === "issued" || i.status === "partial",
  );

  return (
    <div>
      <PageHeader title="Invoice" sub="Invoice dibuat otomatis dari pesanan; terbitkan untuk membukukan piutang" />
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 md:px-8">
        {FILTERS.map((x) => (
          <button
            key={x.key}
            onClick={() => setParams(x.key === "all" ? {} : { f: x.key })}
            className={`min-h-[44px] shrink-0 border px-4 text-sm font-medium transition-colors duration-200 ${
              f === x.key ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]" : "border-[var(--line-strong)] hover:bg-[var(--paper-2)]"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <Section>
        {rows.length === 0 ? (
          <Empty text="Belum ada invoice." />
        ) : (
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {rows.map((i) => (
              <Link key={i.id} to={`/invoice/${i.id}`} className="flex items-center justify-between gap-4 px-4 py-4 transition-colors duration-200 hover:bg-[var(--paper-2)] md:px-8">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-semibold">{i.number}</span>
                    <StatusBadge status={i.status} />
                  </div>
                  <div className="mt-1 truncate text-sm text-[var(--ink-soft)]">
                    {i.customerName} · {tanggal(i.issueDate)}{i.dueDate ? ` · tempo ${tanggal(i.dueDate)}` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-base font-semibold">{rp(i.total)}</div>
                  <div className="text-xs text-[var(--ink-soft)]">{i.remaining > 0 && i.status !== "draft" ? `Sisa ${rp(i.remaining)}` : i.status === "draft" ? "Belum diterbitkan" : "Lunas"}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
