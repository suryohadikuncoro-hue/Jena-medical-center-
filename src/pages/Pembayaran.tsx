import { useState } from "react";
import { useSearchParams } from "react-router";
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

  const [direction, setDirection] = useState<"in" | "out">(presetInvoice ? "in" : "in");
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
      <PageHeader title="Pembayaran" sub="Mencatat pembayaran pelanggan dan pembayaran ke supplier" />

      <Section title="Catat pembayaran">
        <div className="border-b border-[var(--line)] px-4 py-4 md:px-8">
          <div className="grid grid-cols-2 border border-[var(--line-strong)]">
            {(["in", "out"] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => setDirection(dir)}
                aria-pressed={direction === dir}
                className={`min-h-[44px] text-sm font-semibold transition-colors duration-200 ${
                  direction === dir ? "bg-[var(--ink)] text-[var(--paper)]" : "hover:bg-[var(--paper-2)]"
                }`}
              >
                {dir === "in" ? "Dari pelanggan" : "Ke supplier"}
              </button>
            ))}
          </div>

          {open.isLoading && <p className="mt-3 text-sm text-[var(--ink-soft)]" role="status">Memuat tagihan terbuka…</p>}
          {open.error && (
            <div className="mt-3 flex flex-wrap items-center gap-3" role="alert">
              <p className="text-sm text-[var(--bad)]">Daftar tagihan gagal dimuat: {open.error.message}</p>
              <button className="btn btn-ghost" type="button" onClick={() => void open.refetch()}>Coba lagi</button>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {direction === "in" ? (
              <div>
                <label className="label-caps block" htmlFor="payment-invoice">Invoice pelanggan</label>
                <select id="payment-invoice" className="select mt-1" disabled={open.isLoading || Boolean(open.error) || !open.data} value={invoiceId} onChange={(e) => setInvoiceId(Number(e.target.value))}>
                  <option value={0}>Pilih invoice…</option>
                  {(open.data?.invoices ?? []).map((i) => (
                    <option key={i.id} value={i.id}>{i.number} · {i.customerName} · sisa {rp(i.remaining)}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="label-caps block" htmlFor="payment-supplier-invoice">Faktur supplier</label>
                <select id="payment-supplier-invoice" className="select mt-1" disabled={open.isLoading || Boolean(open.error) || !open.data} value={fakturId} onChange={(e) => setFakturId(Number(e.target.value))}>
                  <option value={0}>Pilih faktur supplier…</option>
                  {(open.data?.supplierInvoices ?? []).map((f) => (
                    <option key={f.id} value={f.id}>{f.number} · {f.supplierName} · sisa {rp(f.remaining)}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label-caps block" htmlFor="payment-date">Tanggal pembayaran</label>
              <input id="payment-date" className="input mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label-caps block" htmlFor="payment-amount">Jumlah (Rp)</label>
              <input id="payment-amount" className="input mt-1" type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <div>
              <label className="label-caps block" htmlFor="payment-method">Metode pembayaran</label>
              <select id="payment-method" className="select mt-1" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                <option value="transfer">Transfer bank</option>
                <option value="cash">Tunai</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
          </div>
          {selectedRemaining !== undefined && (
            <p className="mt-2 rounded-xl bg-[#eef0ff] px-3 py-2 text-xs text-[#3d4b93]" role="status">
              Sisa tagihan yang dipilih: <strong className="tabular-nums">{rp(selectedRemaining)}</strong>
            </p>
          )}
          <label className="label-caps mt-3 block" htmlFor="payment-note">Catatan (opsional)</label>
          <input id="payment-note" className="input mt-1" placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <p className="mt-2 text-sm font-medium text-[var(--bad)]" role="alert">{error}</p>}
          <button className="btn mt-3 w-full md:w-auto" onClick={submit} disabled={record.isPending || open.isLoading || Boolean(open.error) || !open.data}>
            {record.isPending ? "Menyimpan…" : "Simpan pembayaran"}
          </button>
          <p className="mt-2 text-xs text-[var(--ink-soft)]">Jurnal kas/bank dan piutang/hutang terbentuk otomatis.</p>
        </div>
      </Section>

      <Section title="Riwayat pembayaran">
        {list.data.length === 0 ? (
          <Empty text="Belum ada pembayaran tercatat." />
        ) : (
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {list.data.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 md:px-8">
                <div>
                  <div className="text-sm font-medium">
                    {p.direction === "in" ? "Dari pelanggan" : "Ke supplier"} · {p.refNumber}
                  </div>
                  <div className="text-xs text-[var(--ink-soft)]">{tanggal(p.date)} · {p.method}{p.note ? ` · ${p.note}` : ""}</div>
                </div>
                <span className={`font-display text-base font-semibold ${p.direction === "in" ? "text-[var(--ok)]" : "text-[var(--ink)]"}`}>
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
