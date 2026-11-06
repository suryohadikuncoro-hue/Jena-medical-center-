import { Link, useSearchParams } from "react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { rp, tanggal } from "@/lib/format";
import { PageHeader, Section, StatusBadge, Loading, LoadError, Empty, FilterChips } from "@/components/bits";

type Key = "all" | "draft" | "ordered" | "confirmed" | "closed";

export default function Pesanan() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "all") as Key;
  const utils = trpc.useUtils();
  const q = trpc.orders.list.useQuery(undefined, { refetchOnMount: "always" });
  const deleteDraft = trpc.orders.deleteDraft.useMutation({
    onSuccess: async () => {
      await q.refetch();
      await utils.reports.dashboard.invalidate();
    },
  });

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  const match = (o: (typeof q.data)[number], k: Key) => k === "all" || (k === "ordered" ? o.pendingSupplierCount > 0 : o.status === k);
  const count = (k: Key) => q.data.filter((o) => match(o, k)).length;
  const rows = q.data.filter((o) => match(o, status));

  return (
    <div>
      <PageHeader
        title="Pesanan"
        sub={`${q.data.length} pesanan · pengiriman diurus supplier dan pelanggan, tidak dicatat di sini`}
        action={
          <Link to="/pesanan/baru" className="btn">
            <Plus size={18} aria-hidden="true" />
            Pesanan baru
          </Link>
        }
      />

      <FilterChips<Key>
        label="Filter status pesanan"
        value={status}
        onChange={(k) => setParams(k === "all" ? {} : { status: k })}
        items={[
          { key: "all", label: "Semua", count: count("all") },
          { key: "draft", label: "Belum dipesan", count: count("draft") },
          { key: "ordered", label: "Menunggu supplier", count: count("ordered") },
          { key: "confirmed", label: "Terkonfirmasi", count: count("confirmed") },
          { key: "closed", label: "Selesai", count: count("closed") },
        ]}
      />

      {deleteDraft.error && (
        <p className="px-4 pb-3 text-sm text-[var(--bad)] md:px-8" role="alert">
          Pesanan gagal dihapus: {deleteDraft.error.message}
        </p>
      )}

      <Section>
        {rows.length === 0 ? (
          <Empty text="Belum ada pesanan di status ini." action={<Link className="btn" to="/pesanan/baru">Buat pesanan</Link>} />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {rows.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors duration-150 hover:bg-[var(--slate-tint)] md:px-6">
                <Link to={`/pesanan/${o.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[0.9375rem] font-semibold text-[var(--navy)]">{o.number}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm text-[var(--ink-soft)]">
                      {o.customerName} · {tanggal(o.orderDate)} · termin {o.termDays} hari
                    </div>
                    {o.pendingSupplierCount > 0 && (
                      <div className="mt-1 text-xs font-medium text-[var(--warn)]">{o.pendingSupplierCount} PO menunggu balasan supplier</div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-[0.9375rem] font-semibold tabular-nums text-[var(--navy)]">{rp(o.total)}</div>
                    <div className="mt-0.5 text-xs text-[var(--ink-soft)]">{o.invoiced > 0 ? `Ditagih ${rp(o.invoiced)}` : "Belum ditagih"}</div>
                  </div>
                </Link>
                {o.status === "draft" && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Link to={`/pesanan/baru?edit=${o.id}`} className="btn btn-ghost !min-h-[44px] px-3 text-xs">
                      <Pencil size={14} /> Edit
                    </Link>
                    <button
                      type="button"
                      className="btn btn-ghost !min-h-[44px] px-3 text-xs text-[var(--bad)]"
                      disabled={deleteDraft.isPending}
                      onClick={() => {
                        if (confirm(`Hapus pesanan ${o.number}? Pesanan draf yang dihapus tidak dapat dipulihkan.`)) {
                          deleteDraft.mutate({ id: o.id });
                        }
                      }}
                    >
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
