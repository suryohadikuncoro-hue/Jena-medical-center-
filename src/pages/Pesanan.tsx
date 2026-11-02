import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { rp, tanggal } from "@/lib/format";
import { PageHeader, Section, StatusBadge, Loading, LoadError, Empty, FilterChips, SearchField } from "@/components/bits";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "draft", label: "Belum dipesan" },
  { key: "ordered", label: "Menunggu supplier" },
  { key: "confirmed", label: "Diproses" },
  { key: "closed", label: "Selesai" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function Pesanan() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("status") ?? "all";
  const status = (FILTERS.some((f) => f.key === raw) ? raw : "all") as FilterKey;
  const [cari, setCari] = useState("");
  const q = trpc.orders.list.useQuery(undefined, { refetchOnMount: "always" });

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  const term = cari.trim().toLowerCase();
  const rows = q.data.filter((o) => {
    const cocokStatus = status === "all" || (status === "ordered" ? o.pendingSupplierCount > 0 : o.status === status);
    const cocokCari = !term || o.number.toLowerCase().includes(term) || o.customerName.toLowerCase().includes(term);
    return cocokStatus && cocokCari;
  });

  return (
    <div>
      <PageHeader
        title="Pesanan"
        sub={`${q.data.length} pesanan · pengiriman diurus supplier dan pelanggan`}
        action={
          <Link to="/pesanan/baru" className="btn">
            <Plus size={16} aria-hidden="true" />
            Pesanan baru
          </Link>
        }
      />

      <div className="space-y-3 px-4 pb-4 md:px-8">
        <SearchField value={cari} onChange={setCari} placeholder="Cari nomor atau pelanggan…" label="Cari pesanan" />
        <FilterChips
          items={FILTERS}
          value={status}
          onChange={(key) => setParams(key === "all" ? {} : { status: key })}
          label="Filter status pesanan"
        />
      </div>

      <Section className="!my-0">
        {rows.length === 0 ? (
          <Empty
            text={term ? "Tidak ada pesanan yang cocok dengan pencarian." : "Belum ada pesanan di status ini."}
            action={<Link className="btn" to="/pesanan/baru">Buat pesanan</Link>}
          />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {rows.map((o) => (
              <Link
                key={o.id}
                to={`/pesanan/${o.id}`}
                className="flex items-start justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-[var(--slate-hover)]/40 md:px-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[0.95rem] font-bold text-[var(--ink)]">{o.number}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-1 truncate text-[0.8125rem] text-[var(--ink-soft)]">
                    {o.customerName} · {tanggal(o.orderDate)} · termin {o.termDays} hari
                  </p>
                  {o.pendingSupplierCount > 0 && (
                    <p className="mt-1 text-xs font-semibold text-[var(--warn)]">
                      {o.pendingSupplierCount} PO menunggu balasan supplier
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-[0.95rem] font-bold tabular-nums text-[var(--ink)]">{rp(o.total)}</div>
                  <div className="mt-1 text-xs text-[var(--ink-soft)]">
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
