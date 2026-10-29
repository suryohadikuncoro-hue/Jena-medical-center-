import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { rp, rpShort, namaBulan, bulanIni, tanggal } from "@/lib/format";
import { PageHeader, Section, KV, Loading, LoadError, Empty } from "@/components/bits";
import { TrendBars } from "@/components/charts";

const TABS = ["Ikhtisar", "Laba Rugi", "Neraca", "PPN", "Jurnal", "Buku Besar"] as const;
type Tab = (typeof TABS)[number];

export default function Laporan() {
  const [tab, setTab] = useState<Tab>("Ikhtisar");
  const [month, setMonth] = useState(bulanIni());

  return (
    <div>
      <PageHeader
        title="Laporan"
        sub={`Periode ${namaBulan(month)} (terbuka) · angka dari jurnal yang sudah dibukukan`}
        action={<label className="label-caps flex flex-col gap-1" htmlFor="report-month">Periode laporan<input id="report-month" className="input w-auto" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>}
      />

      <div className="px-4 pb-4 md:hidden">
        <label className="label-caps block" htmlFor="report-tab-mobile">Jenis laporan</label>
        <select id="report-tab-mobile" className="select mt-1" value={tab} onChange={(e) => setTab(e.target.value as Tab)}>
          {TABS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="hidden flex-wrap gap-2 px-4 pb-4 md:flex md:px-8">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`min-h-[44px] rounded-xl border px-4 text-sm font-medium transition-colors duration-200 ${
              tab === t ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line-strong)] bg-white hover:bg-[var(--paper-2)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Ikhtisar" && <Ikhtisar month={month} />}
      {tab === "Laba Rugi" && <LabaRugi month={month} />}
      {tab === "Neraca" && <Neraca month={month} />}
      {tab === "PPN" && <PPN month={month} />}
      {tab === "Jurnal" && <Jurnal month={month} />}
      {tab === "Buku Besar" && <BukuBesar month={month} />}

      <p className="px-4 py-6 text-xs leading-relaxed text-[var(--ink-soft)] md:px-8">
        Angka laporan bersumber dari jurnal yang sudah dibukukan. Draf invoice dan faktur supplier belum menjadi
        pendapatan, piutang, atau hutang. Ringkasan PPN bukan SPT atau e-Faktur.
      </p>
    </div>
  );
}

function Ikhtisar({ month }: { month: string }) {
  const q = trpc.reports.summary.useQuery({ month });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;
  const d = q.data;
  return (
    <div>
      <Section title="Dokumen belum dibukukan" note="Informasi operasional, terpisah dari saldo buku besar">
        <div className="grid grid-cols-2 divide-x divide-[var(--line)] border-b border-[var(--line)] md:grid-cols-4">
          <Stat label="Draf invoice pelanggan" n={d.dokumenBelumDibukukan.drafInvoice} sub="Belum menjadi piutang" />
          <Stat label="Nilai draf pelanggan" n={rpShort(d.dokumenBelumDibukukan.nilaiDrafInvoice)} sub="Belum termasuk PPN, bukan pendapatan" />
          <Stat label="Draf faktur supplier" n={d.dokumenBelumDibukukan.drafFaktur} sub="Belum menjadi hutang usaha" />
          <Stat label="Nilai tercetak faktur" n={rpShort(d.dokumenBelumDibukukan.nilaiDrafFaktur)} sub="Mengikuti dokumen, bukan HPP" />
        </div>
      </Section>
      <Section title="Dari pembukuan">
        <div className="grid grid-cols-2 divide-x divide-[var(--line)] border-b border-[var(--line)] md:grid-cols-5">
          <Stat label="Pendapatan" n={rpShort(d.pendapatan)} sub={d.pendapatanNaikPct !== null ? `${d.pendapatanNaikPct >= 0 ? "Naik" : "Turun"} ${Math.abs(d.pendapatanNaikPct).toFixed(1).replace(".", ",")}% dari bulan lalu` : "—"} />
          <Stat label="Laba kotor" n={rpShort(d.labaKotor)} sub={`Margin ${d.marginPct.toFixed(1).replace(".", ",")}%`} />
          <Stat label="Piutang usaha" n={rpShort(d.piutang)} sub={`${d.invoiceBelumLunas} invoice belum lunas`} />
          <Stat label="Hutang usaha" n={rpShort(d.hutang)} sub={`${d.fakturJatuhTempo} faktur berjalan`} />
          <Stat label="Kas dan bank" n={rpShort(d.kas)} sub={`${d.kasMovement >= 0 ? "Naik" : "Turun"} ${rpShort(Math.abs(d.kasMovement))} bulan ini`} />
        </div>
      </Section>
      <Section title="Tren 6 bulan" note="Pendapatan dibanding harga pokok, juta rupiah">
        <div className="border-b border-[var(--line)] py-4">
          <TrendBars data={d.tren} />
        </div>
      </Section>
      <Section title="Perlu diselesaikan" note={`Sebelum tutup buku ${namaBulan(month)}`}>
        <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
          <KV k="Faktur pajak masuk belum lengkap" v={`${d.perluDiselesaikan.pajakMasukBelumLengkap} · PPN masukan belum bisa dikreditkan`} />
          <KV k="Faktur supplier selisih" v={`${d.perluDiselesaikan.fakturSelisih} · hitungan sistem beda dengan faktur cetak`} />
          <KV k="Draf invoice" v={`${d.perluDiselesaikan.drafInvoice} · belum diterbitkan`} />
        </div>
      </Section>
    </div>
  );
}

function Stat({ label, n, sub }: { label: string; n: React.ReactNode; sub: string }) {
  return (
    <div className="border-b border-[var(--line)] px-4 py-4 md:px-8">
      <div className="label-caps">{label}</div>
      <div className="font-display mt-1 text-xl font-semibold">{n}</div>
      <div className="mt-1 text-xs text-[var(--ink-soft)]">{sub}</div>
    </div>
  );
}

function LabaRugi({ month }: { month: string }) {
  const q = trpc.reports.labaRugi.useQuery({ month });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;
  const d = q.data;
  return (
    <Section title={`Laba Rugi · ${namaBulan(month)}`}>
      <div className="border-b border-[var(--line)]">
        <div className="label-caps px-4 pt-2 md:px-8">Pendapatan</div>
        {d.pendapatan.map((r) => <KV key={r.code} k={`${r.code} · ${r.name}`} v={rp(r.amount)} />)}
        <KV k="Total pendapatan" v={rp(d.totalPendapatan)} strong />
        <div className="label-caps px-4 pt-4 md:px-8">Beban</div>
        {d.beban.map((r) => <KV key={r.code} k={`${r.code} · ${r.name}`} v={rp(r.amount)} />)}
        <KV k="Total beban" v={rp(d.totalBeban)} strong />
        <div className="flex items-baseline justify-between border-t border-[var(--line-strong)] px-4 py-4 md:px-8">
          <span className="font-display text-lg font-semibold">Laba bersih</span>
          <span className="font-display text-xl font-semibold">{rp(d.labaBersih)}</span>
        </div>
      </div>
    </Section>
  );
}

function Neraca({ month }: { month: string }) {
  const q = trpc.reports.neraca.useQuery({ month });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;
  const d = q.data;
  return (
    <Section title={`Neraca · per ${namaBulan(month)}`}>
      <div className="border-b border-[var(--line)]">
        <div className="label-caps px-4 pt-2 md:px-8">Aset</div>
        {d.aset.map((r) => <KV key={r.code} k={`${r.code} · ${r.name}`} v={rp(r.amount)} />)}
        <KV k="Total aset" v={rp(d.totalAset)} strong />
        <div className="label-caps px-4 pt-4 md:px-8">Liabilitas</div>
        {d.liabilitas.map((r) => <KV key={r.code} k={`${r.code} · ${r.name}`} v={rp(r.amount)} />)}
        <KV k="Total liabilitas" v={rp(d.totalLiabilitas)} strong />
        <div className="label-caps px-4 pt-4 md:px-8">Ekuitas</div>
        {d.ekuitas.map((r) => <KV key={r.code} k={`${r.code} · ${r.name}`} v={rp(r.amount)} />)}
        <KV k="Laba berjalan (belum ditutup)" v={rp(d.labaBerjalan)} />
        <KV k="Total ekuitas" v={rp(d.totalEkuitas)} strong />
        <div className="flex items-baseline justify-between border-t border-[var(--line-strong)] px-4 py-4 md:px-8">
          <span className="font-display text-lg font-semibold">Liabilitas + Ekuitas</span>
          <span className="font-display text-xl font-semibold">{rp(d.totalLiabilitas + d.totalEkuitas)}</span>
        </div>
      </div>
    </Section>
  );
}

function PPN({ month }: { month: string }) {
  const q = trpc.reports.ppn.useQuery({ month });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;
  const d = q.data;
  return (
    <Section title={`Ringkasan PPN · ${namaBulan(month)}`}>
      <div className="border-b border-[var(--line)]">
        <KV k="PPN keluaran (penjualan)" v={rp(d.keluaran)} />
        <KV k="PPN masukan (pembelian)" v={rp(d.masukan)} />
        <KV k="Kurang bayar" v={rp(d.kurangBayar)} strong />
        <KV k="Faktur pajak masuk belum lengkap" v={`${d.fakturMasukBelumLengkap} faktur`} />
        <p className="px-4 py-3 text-xs text-[var(--ink-soft)] md:px-8">
          Ringkasan internal — bukan SPT atau e-Faktur. PPN masukan dari faktur yang belum lengkap tidak dihitung.
        </p>
      </div>
    </Section>
  );
}

function Jurnal({ month }: { month: string }) {
  const q = trpc.reports.jurnal.useQuery({ month });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;
  return (
    <Section title={`Jurnal · ${namaBulan(month)}`}>
      {q.data.length === 0 ? (
        <Empty text="Belum ada jurnal di periode ini." />
      ) : (
        <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
          {q.data.map((e) => (
            <div key={e.id} className="px-4 py-4 md:px-8">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-semibold">{e.memo}</span>
                <span className="text-xs text-[var(--ink-soft)]">{tanggal(e.date)}</span>
              </div>
              <table className="mt-2 w-full table-fixed text-xs sm:text-sm">
                <thead>
                  <tr className="text-left text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                    <th scope="col" className="w-[54%] py-1 pr-2">Akun</th>
                    <th scope="col" className="w-[23%] py-1 text-right">Debit</th>
                    <th scope="col" className="w-[23%] py-1 pl-2 text-right">Kredit</th>
                  </tr>
                </thead>
                <tbody>
                  {e.lines.map((l) => (
                    <tr key={l.id} className="border-t border-[var(--line)]">
                      <td className="break-words py-1.5 pr-2 text-[var(--ink-soft)]">{l.code} · {l.name}</td>
                      <td className="break-words py-1.5 text-right tabular-nums">{l.debit > 0 ? rp(l.debit) : "—"}</td>
                      <td className="break-words py-1.5 pl-2 text-right tabular-nums">{l.credit > 0 ? rp(l.credit) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function BukuBesar({ month }: { month: string }) {
  const accounts = trpc.reports.accountList.useQuery();
  const [code, setCode] = useState("1101");
  const selectedCode = accounts.data?.some((account) => account.code === code) ? code : accounts.data?.[0]?.code ?? "";
  const q = trpc.reports.bukuBesar.useQuery({ month, code: selectedCode }, { enabled: Boolean(selectedCode) });
  if (accounts.isLoading) return <Loading />;
  if (accounts.error || !accounts.data) return <LoadError message={accounts.error?.message} retry={() => accounts.refetch()} />;
  if (accounts.data.length === 0) return <Empty text="Belum ada akun buku besar yang tersedia." />;
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;
  return (
    <Section title={`Buku Besar · ${namaBulan(month)}`}>
      <div className="border-b border-[var(--line)]">
        <div className="px-4 py-3 md:px-8">
          <label className="label-caps" htmlFor="ledger-account">Akun buku besar</label>
          <select id="ledger-account" className="select mt-1" value={selectedCode} onChange={(e) => setCode(e.target.value)}>
            {accounts.data.map((a) => (
              <option key={a.code} value={a.code}>{a.code} · {a.name}</option>
            ))}
          </select>
        </div>
        <KV k="Saldo awal" v={rp(q.data.opening)} />
        {q.data.rows.length ? (
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {q.data.rows.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 md:px-6">
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-medium">{tanggal(r.date)} · {r.memo}</div>
                  <div className="mt-0.5 text-xs text-[var(--ink-soft)]">{r.debit > 0 ? "Debit" : "Kredit"}: {rp(r.debit > 0 ? r.debit : r.credit)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="label-caps">Saldo berjalan</div>
                  <div className="text-sm font-semibold tabular-nums">{rp(r.balance)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : <Empty text="Belum ada transaksi untuk akun dan periode ini." />}
        <KV k="Saldo akhir" v={rp(q.data.closing)} strong />
      </div>
    </Section>
  );
}
