import { Link } from "react-router";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { rp, rpShort, tanggalPanjang, tanggal } from "@/lib/format";
import { Section, Loading, LoadError } from "@/components/bits";
import { DualBars, TrendBars } from "@/components/charts";

export default function Beranda() {
  const q = trpc.reports.dashboard.useQuery(undefined, { refetchOnMount: "always" });

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;
  const d = q.data;

  return (
    <div>
      {/* Salam */}
      <div className="px-4 pb-5 pt-6 md:px-8 md:pt-10">
        <div className="rise flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold leading-[1.1] md:text-4xl">Halo, Suryo</h1>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              {tanggalPanjang(new Date())} · angka dari dokumen, belum dari pembukuan
            </p>
          </div>
          <Link to="/pesanan/baru" className="btn rise-1 rise shrink-0">+ Pesanan baru</Link>
        </div>
      </div>

      {/* Ringkasan */}
      <Section title="Ringkasan" note="Dokumen yang perlu diproses" className="rise-1 rise">
        <div className="grid grid-cols-1 divide-y divide-[var(--line)] border-b border-[var(--line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Link to="/pesanan?status=draft" className="block px-4 py-4 transition-colors duration-200 hover:bg-[var(--paper-2)] md:px-8">
            <div className="font-display text-3xl font-semibold">{d.baruCount}</div>
            <div className="mt-1 text-sm font-medium">Pesanan baru</div>
            <div className="text-xs text-[var(--ink-soft)]">Belum dipesan ke supplier</div>
          </Link>
          <Link to="/pesanan?status=ordered" className="block px-4 py-4 transition-colors duration-200 hover:bg-[var(--paper-2)] md:px-8">
            <div className="font-display text-3xl font-semibold">{d.menungguCount}</div>
            <div className="mt-1 text-sm font-medium">Menunggu supplier</div>
            <div className="text-xs text-[var(--ink-soft)]">Sudah dikirim, belum dibalas</div>
          </Link>
          <Link to="/faktur" className="block px-4 py-4 transition-colors duration-200 hover:bg-[var(--paper-2)] md:px-8">
            <div className="font-display text-3xl font-semibold">{d.selisihCount}</div>
            <div className="mt-1 text-sm font-medium">Faktur ada selisih</div>
            <div className="text-xs text-[var(--ink-soft)]">Hitungan sistem beda dengan faktur cetak</div>
          </Link>
        </div>
      </Section>

      {/* Aktivitas pesanan */}
      <Section title="Aktivitas Pesanan" note="Nilai pesanan dan tagihan per hari, 7 hari terakhir" className="rise-2 rise">
        <div className="pt-4">
          <DualBars data={d.days} />
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Perlu dipantau */}
        <Section title="Perlu Dipantau" note="Dokumen yang butuh perhatian" className="rise-2 rise lg:border-r lg:border-[var(--line)]">
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {d.pantau.length === 0 && (
              <p className="px-4 py-6 text-sm text-[var(--ink-soft)] md:px-8">Tidak ada dokumen yang butuh perhatian.</p>
            )}
            {d.pantau.map((p, i) => (
              <Link
                key={i}
                to={p.kind === "selisih" ? "/faktur" : "/invoice"}
                className="flex items-start justify-between gap-4 px-4 py-4 transition-colors duration-200 hover:bg-[var(--paper-2)] md:px-8"
              >
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {p.kind === "selisih" && <AlertTriangle size={14} className="text-[var(--warn)]" />}
                    {p.title}
                  </div>
                  {p.date && <div className="mt-0.5 text-xs text-[var(--ink-soft)]">Jatuh tempo {tanggal(p.date)}</div>}
                </div>
                <div className="text-right">
                  {p.lines.map((l, j) => (
                    <div key={j} className="text-xs text-[var(--ink-soft)]">
                      {l.label} <span className="text-sm font-semibold text-[var(--ink)]">{l.value}</span>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* Perlu tindakan */}
        <Section title="Perlu Tindakan" note="Urut dari yang paling mendesak" className="rise-3 rise">
          <div className="border-b border-[var(--line)]">
            <div className="grid grid-cols-3 divide-x divide-[var(--line)] border-b border-[var(--line)] text-center">
              <Link to="/pesanan?status=draft" className="block px-2 py-4 transition-colors duration-200 hover:bg-[var(--paper-2)]">
                <div className="font-display text-2xl font-semibold">{d.baruCount}</div>
                <div className="mt-1 text-xs font-medium">Belum dipesan</div>
                <div className="mt-2 inline-block text-xs font-semibold text-[var(--slate-deep)]">Buat order →</div>
              </Link>
              <Link to="/pesanan?status=ordered" className="block px-2 py-4 transition-colors duration-200 hover:bg-[var(--paper-2)]">
                <div className="font-display text-2xl font-semibold">{d.menungguCount}</div>
                <div className="mt-1 text-xs font-medium">Menunggu balasan</div>
                <div className="mt-2 inline-block text-xs font-semibold text-[var(--slate-deep)]">Catat balasan →</div>
              </Link>
              <Link to="/faktur" className="block px-2 py-4 transition-colors duration-200 hover:bg-[var(--paper-2)]">
                <div className="font-display text-2xl font-semibold">{d.selisihCount}</div>
                <div className="mt-1 text-xs font-medium">Faktur selisih</div>
                <div className="mt-2 inline-block text-xs font-semibold text-[var(--slate-deep)]">Periksa →</div>
              </Link>
            </div>
            <div className="grid grid-cols-2 divide-x divide-[var(--line)]">
              <div className="px-4 py-4 md:px-8">
                <div className="label-caps">Ditagih</div>
                <div className="font-display mt-1 text-xl font-semibold">{rpShort(d.ditagih)}</div>
                <div className="mt-1 text-xs text-[var(--ink-soft)]">
                  Draf {d.invoiceStatus.draf} · Terbit {d.invoiceStatus.terbit} · Lunas {d.invoiceStatus.lunas}
                </div>
              </div>
              <div className="px-4 py-4 md:px-8">
                <div className="label-caps">Belum ditagih</div>
                <div className="font-display mt-1 text-xl font-semibold">{rpShort(d.belumDitagih)}</div>
                <div className="mt-1 text-xs text-[var(--ink-soft)]">
                  Siap ditagih: {d.siapDitagihCount} pesanan{" "}
                  {d.siapDitagihCount > 0 && (
                    <Link to="/pesanan?status=confirmed" className="font-semibold text-[var(--slate-deep)] underline">Buat invoice</Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Ikhtisar pembukuan */}
      <Section
        title="Ikhtisar"
        note="Angka dari jurnal yang sudah dibukukan"
        className="rise-3 rise"
      >
        <div className="border-b border-[var(--line)]">
          <div className="grid grid-cols-2 divide-x divide-[var(--line)] border-b border-[var(--line)] text-sm md:grid-cols-4">
            <div className="px-4 py-4 md:px-8">
              <div className="label-caps">Draf invoice</div>
              <div className="font-display mt-1 text-2xl font-semibold">{d.dokumenBelumDibukukan.drafInvoice}</div>
              <div className="text-xs text-[var(--ink-soft)]">{rp(d.dokumenBelumDibukukan.nilaiDrafInvoice)} · belum jadi piutang</div>
            </div>
            <div className="px-4 py-4 md:px-8">
              <div className="label-caps">Draf faktur supplier</div>
              <div className="font-display mt-1 text-2xl font-semibold">{d.dokumenBelumDibukukan.drafFaktur}</div>
              <div className="text-xs text-[var(--ink-soft)]">{rp(d.dokumenBelumDibukukan.nilaiDrafFaktur)} · belum jadi hutang</div>
            </div>
            <div className="px-4 py-4 md:px-8">
              <div className="label-caps">Pendapatan bulan ini</div>
              <div className="font-display mt-1 text-2xl font-semibold">{rpShort(d.pembukuan.pendapatan)}</div>
              <div className="text-xs text-[var(--ink-soft)]">dari pembukuan</div>
            </div>
            <div className="px-4 py-4 md:px-8">
              <div className="label-caps">Laba kotor</div>
              <div className="font-display mt-1 text-2xl font-semibold">{rpShort(d.pembukuan.labaKotor)}</div>
              <div className="text-xs text-[var(--ink-soft)]">
                Piutang {rpShort(d.pembukuan.piutang)} · Hutang {rpShort(d.pembukuan.hutang)}
              </div>
            </div>
          </div>

          <div className="border-b border-[var(--line)] py-4">
            <div className="label-caps px-4 pb-2 md:px-8">Tren 6 bulan — pendapatan dibanding harga pokok</div>
            <TrendBars data={d.tren} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
            <p className="text-xs text-[var(--ink-soft)]">
              Sebelum tutup buku: {d.perluDiselesaikan.pajakMasukBelumLengkap} faktur pajak masuk belum lengkap ·{" "}
              {d.perluDiselesaikan.fakturSelisih} faktur selisih · {d.perluDiselesaikan.drafInvoice} draf invoice
            </p>
            <Link to="/laporan" className="btn btn-ghost">
              Buka laporan <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <p className="px-4 py-4 text-xs leading-relaxed text-[var(--ink-soft)] md:px-8">
          Pembukuan internal saja. Angka laporan bersumber dari jurnal yang sudah dibukukan; draf invoice dan faktur
          supplier belum menjadi pendapatan, piutang, atau hutang. Ringkasan PPN bukan SPT atau e-Faktur.
        </p>
      </Section>
    </div>
  );
}
