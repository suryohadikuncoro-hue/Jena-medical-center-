import { useState } from "react";
import { useSearchParams } from "react-router";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { todayLocal, rp, tanggal } from "@/lib/format";
import { PageHeader, Section, Loading, LoadError, Empty } from "@/components/bits";

export default function Pembayaran() {
  const [params] = useSearchParams();
  const presetInvoice = Number(params.get("invoice")) || 0;

  const list = trpc.payments.list.useQuery(undefined, { refetchOnMount: "always" });
  const open = trpc.payments.open.useQuery();
  const record = trpc.payments.record.useMutation({
    onSuccess: () => {
      list.refetch();
      open.refetch();
      setAmount(0);
      setNote("");
    },
    onError: (e) => setError(e.message),
  });

  const [direction, setDirection] = useState<"in" | "out">("in");
  const [invoiceId, setInvoiceId] = useState<number>(presetInvoice);
  const [fakturId, setFakturId] = useState<number>(0);
  const [date, setDate] = useState(todayLocal());
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<"transfer" | "cash" | "other">("transfer");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (list.isLoading) return <Loading />;
  if (list.error || !list.data) return <LoadError message={list.error?.message} retry={() => list.refetch()} />;

  const selectedRemaining = direction === "in"
    ? open.data?.invoices.find((invoice) => invoice.id === invoiceId)?.remaining
    : open.data?.supplierInvoices.find((invoice) => invoice.id === fakturId)?.remaining;

  const masuk = list.data.filter((p) => p.direction === "in").reduce((s, p) => s + p.amount, 0);
  const keluar = list.data.filter((p) => p.direction === "out").reduce((s, p) => s + p.amount, 0);

  const submit = () => {
    setError(null);
    if (amount <= 0) return setError("Isi jumlah pembayaran.");
    if (direction === "in" && !invoiceId) return setError("Pilih invoice yang dibayar.");
    if (direction === "out" && !fakturId) return setError("Pilih faktur supplier yang dibayar.");
    record.mutate({
      direction,
      invoiceId: direction === "in" ? invoiceId : undefined,
      supplierInvoiceId: direction === "out" ? fakturId : undefined,
      date,
      amount,
      method,
      note: note || undefined,
    });
  };

  return (
    <div>
      <PageHeader title="Pembayaran" sub="Catat pembayaran pelanggan dan pembayaran ke supplier" />

      <Section title="Catat pembayaran">
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--paper-2)] p-1" role="group" aria-label="Arah pembayaran">
            {(["in", "out"] as const).map((dir) => {
              const active = direction === dir;
              const Icon = dir === "in" ? ArrowDownLeft : ArrowUpRight;
              return (
                <button
                  key={dir}
                  type="button"
                  onClick={() => setDirection(dir)}
                  aria-pressed={active}
                  className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    active ? "bg-white text-[var(--slate-deep)] shadow-sm" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {dir === "in" ? "Dari pelanggan" : "Ke supplier"}
                </button>
              );
            })}
          </div>

          {open.isLoading && <p className="text-sm text-[var(--ink-soft)]" role="status">Memuat tagihan terbuka…</p>}
          {open.error && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--bad-bg)] px-3 py-2" role="alert">
              <p className="text-sm text-[var(--bad)]">Daftar tagihan gagal dimuat: {open.error.message}</p>
              <button className="btn btn-ghost min-h-9 px-3 text-xs" type="button" onClick={() => void open.refetch()}>Coba lagi</button>
            </div>
          )}

          <div>
            {direction === "in" ? (
              <label className="block" htmlFor="payment-invoice">
                <span className="label-caps">Invoice pelanggan</span>
                <select id="payment-invoice" className="select mt-1" disabled={open.isLoading || Boolean(open.error) || !open.data} value={invoiceId} onChange={(e) => setInvoiceId(Number(e.target.value))}>
                  <option value={0}>Pilih invoice…</option>
                  {(open.data?.invoices ?? []).map((i) => (
                    <option key={i.id} value={i.id}>{i.number} · {i.customerName} · sisa {rp(i.remaining)}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block" htmlFor="payment-supplier-invoice">
                <span className="label-caps">Faktur supplier</span>
                <select id="payment-supplier-invoice" className="select mt-1" disabled={open.isLoading || Boolean(open.error) || !open.data} value={fakturId} onChange={(e) => setFakturId(Number(e.target.value))}>
                  <option value={0}>Pilih faktur supplier…</option>
                  {(open.data?.supplierInvoices ?? []).map((f) => (
                    <option key={f.id} value={f.id}>{f.number} · {f.supplierName} · sisa {rp(f.remaining)}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {selectedRemaining !== undefined && (
            <p className="flex items-baseline justify-between gap-3 rounded-xl bg-[var(--slate-hover)] px-3 py-2 text-xs text-[var(--slate-deep)]" role="status">
              <span>Sisa tagihan yang dipilih</span>
              <strong className="font-display text-sm tabular-nums">{rp(selectedRemaining)}</strong>
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block" htmlFor="payment-date">
              <span className="label-caps">Tanggal pembayaran</span>
              <input id="payment-date" className="input mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="block" htmlFor="payment-amount">
              <span className="label-caps">Jumlah (Rp)</span>
              <input id="payment-amount" className="input mt-1" type="number" min={0} inputMode="numeric" value={amount || ""} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} />
            </label>
            <label className="block sm:col-span-2" htmlFor="payment-method">
              <span className="label-caps">Metode pembayaran</span>
              <select id="payment-method" className="select mt-1" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                <option value="transfer">Transfer bank</option>
                <option value="cash">Tunai</option>
                <option value="other">Lainnya</option>
              </select>
            </label>
          </div>

          <label className="block" htmlFor="payment-note">
            <span className="label-caps">Catatan (opsional)</span>
            <input id="payment-note" className="input mt-1" placeholder="mis. nomor referensi transfer" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          {error && <p className="text-sm font-medium text-[var(--bad)]" role="alert">{error}</p>}

          <button className="btn w-full" onClick={submit} disabled={record.isPending || open.isLoading || Boolean(open.error) || !open.data}>
            {record.isPending ? "Menyimpan…" : "Simpan pembayaran"}
          </button>
          <p className="text-xs leading-relaxed text-[var(--ink-soft)]">Jurnal kas/bank dan piutang/hutang terbentuk otomatis.</p>
        </div>
      </Section>

      <Section
        title="Riwayat pembayaran"
        note={`Masuk ${rp(masuk)} · keluar ${rp(keluar)}`}
      >
        {list.data.length === 0 ? (
          <Empty text="Belum ada pembayaran tercatat." />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {list.data.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 md:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full ${
                      p.direction === "in" ? "bg-[var(--ok-bg)] text-[var(--ok)]" : "bg-[var(--bad-bg)] text-[var(--bad)]"
                    }`}
                    aria-hidden="true"
                  >
                    {p.direction === "in" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--ink)]">
                      {p.direction === "in" ? "Dari pelanggan" : "Ke supplier"} · {p.refNumber}
                    </div>
                    <div className="truncate text-xs text-[var(--ink-soft)]">{tanggal(p.date)} · {p.method}{p.note ? ` · ${p.note}` : ""}</div>
                  </div>
                </div>
                <span className={`shrink-0 font-display text-sm font-bold tabular-nums ${p.direction === "in" ? "text-[var(--ok)]" : "text-[var(--ink)]"}`}>
                  {p.direction === "in" ? "+" : "−"}{rp(p.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
