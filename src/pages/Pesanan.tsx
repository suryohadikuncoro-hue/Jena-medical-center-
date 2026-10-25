import { Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { rp, tanggal } from "@/lib/format";
import { PageHeader, Section, StatusBadge, Loading, LoadError, Empty } from "@/components/bits";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "draft", label: "Belum dipesan" },
  { key: "ordered", label: "Menunggu supplier" },
  { key: "confirmed", label: "Terkonfirmasi" },
  { key: "closed", label: "Selesai" },
] as const;

export default function Pesanan() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "all";
  const q = trpc.orders.list.useQuery(undefined, { refetchOnMount: "always" });

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  const rows = q.data.filter((o) =>
    status === "all" || (status === "ordered" ? o.pendingSupplierCount > 0 : o.status === status)
  );

  return (
    <div>
      <PageHeader
        title="Pesanan"
        sub={`${q.data.length} pesanan · pengiriman diurus supplier dan pelanggan, tidak dicatat di sini`}
        action={<Link to="/pesanan/baru" className="btn">+ Pesanan baru</Link>}
      />

      <div className="flex gap-2 overflow-x-auto px-4 pb-4 md:px-8">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setParams(f.key === "all" ? {} : { status: f.key })}
            className={`min-h-[44px] shrink-0 border px-4 text-sm font-medium transition-colors duration-200 ${
              status === f.key
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                : "border-[var(--line-strong)] hover:bg-[var(--paper-2)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Section>
        {rows.length === 0 ? (
          <Empty text="Belum ada pesanan di status ini." action={<Link className="btn" to="/pesanan/baru">Buat pesanan</Link>} />
        ) : (
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {rows.map((o) => (
              <Link
                key={o.id}
                to={`/pesanan/${o.id}`}
                className="flex items-center justify-between gap-4 px-4 py-4 transition-colors duration-200 hover:bg-[var(--paper-2)] md:px-8"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-semibold">{o.number}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="mt-1 truncate text-sm text-[var(--ink-soft)]">
                    {o.customerName} · {tanggal(o.orderDate)} · termin {o.termDays} hari
                  </div>
                  {o.pendingSupplierCount > 0 && (
                    <div className="mt-1 text-xs font-medium text-[var(--warn)]">
                      {o.pendingSupplierCount} PO menunggu balasan supplier
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-base font-semibold">{rp(o.total)}</div>
                  <div className="text-xs text-[var(--ink-soft)]">
                    {o.invoiced > 0 ? `Ditagih ${rp(o.invoiced)}` : "Belum ditagih"}
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
