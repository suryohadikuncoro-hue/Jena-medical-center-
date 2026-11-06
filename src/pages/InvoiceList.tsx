import { useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { rp, tanggal } from "@/lib/format";
import { PageHeader, Section, StatusBadge, Loading, LoadError, Empty, FilterChips, DocRow } from "@/components/bits";

type Key = "all" | "draft" | "open" | "paid";

export default function InvoiceList() {
  const [params, setParams] = useSearchParams();
  const f = (params.get("f") ?? "all") as Key;
  const q = trpc.invoices.list.useQuery(undefined, { refetchOnMount: "always" });

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  const match = (i: (typeof q.data)[number], k: Key) =>
    k === "all" ? true : k === "draft" ? i.status === "draft" : k === "paid" ? i.status === "paid" : i.status === "issued" || i.status === "partial";
  const count = (k: Key) => q.data.filter((i) => match(i, k)).length;
  const rows = q.data.filter((i) => match(i, f));

  return (
    <div>
      <PageHeader title="Invoice" sub="Draf dibuat otomatis dari pesanan. Terbitkan invoice untuk membukukan piutang." />
      <FilterChips<Key>
        label="Filter status invoice"
        value={f}
        onChange={(k) => setParams(k === "all" ? {} : { f: k })}
        items={[
          { key: "all", label: "Semua", count: count("all") },
          { key: "draft", label: "Draf", count: count("draft") },
          { key: "open", label: "Belum lunas", count: count("open") },
          { key: "paid", label: "Lunas", count: count("paid") },
        ]}
      />
      <Section>
        {rows.length === 0 ? (
          <Empty text="Belum ada invoice di status ini." />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {rows.map((i) => (
              <DocRow
                key={i.id}
                to={`/invoice/${i.id}`}
                number={i.number}
                status={<StatusBadge status={i.status} />}
                meta={`${i.customerName} · ${tanggal(i.issueDate)}${i.dueDate ? ` · tempo ${tanggal(i.dueDate)}` : ""}`}
                amount={rp(i.total)}
                amountNote={i.status === "draft" ? "Belum diterbitkan" : i.remaining > 0 ? `Sisa ${rp(i.remaining)}` : "Lunas"}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
