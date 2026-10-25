import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  TrendingUp,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { rp, rpShort, tanggal, tanggalPanjang } from "@/lib/format";
import { LoadError } from "@/components/bits";
import { DualBars, TrendBars } from "@/components/charts";

type Tone = "violet" | "mint" | "rose";

type StatCardProps = {
  label: string;
  value: number;
  detail: string;
  badge: string;
  href: string;
  icon: LucideIcon;
  tone: Tone;
};

const toneStyles: Record<Tone, { icon: string; badge: string }> = {
  violet: { icon: "bg-[#eef0ff] text-[#6873c4]", badge: "bg-[#f1f2ff] text-[#626db9]" },
  mint: { icon: "bg-[#e8f6f2] text-[#398c7c]", badge: "bg-[#eff8f5] text-[#398271]" },
  rose: { icon: "bg-[#fff0f3] text-[#c56680]", badge: "bg-[#fff3f5] text-[#b85f78]" },
};

function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#e6e9f0] bg-white shadow-[0_12px_30px_-26px_rgba(24,35,56,0.45)] ${className}`}>
      {children}
    </section>
  );
}

function StatCard({ label, value, detail, badge, href, icon: Icon, tone }: StatCardProps) {
  const style = toneStyles[tone];
  return (
    <Link
      to={href}
      aria-label={`${label}: ${value}. ${detail}`}
      className="group min-w-0 rounded-2xl border border-[#e6e9f0] bg-white p-4 shadow-[0_12px_30px_-26px_rgba(24,35,56,0.45)] transition duration-200 hover:-translate-y-0.5 hover:border-[#d5dae5] hover:shadow-[0_18px_35px_-25px_rgba(24,35,56,0.35)] focus-visible:outline-offset-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${style.icon}`}>
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <ArrowUpRight size={17} className="text-[#98a0b2] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#5663ad]" aria-hidden="true" />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-display text-3xl font-semibold tracking-tight text-[#222a3b]">{value}</span>
        <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${style.badge}`}>{badge}</span>
      </div>
      <h2 className="mt-1 text-sm font-semibold text-[#2b3344]">{label}</h2>
      <p className="mt-1 text-xs leading-relaxed text-[#788194]">{detail}</p>
    </Link>
  );
}

function FinanceMetric({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: LucideIcon; tone: Tone }) {
  const style = toneStyles[tone];
  return (
    <div className="min-w-0 rounded-xl bg-[#f7f8fb] p-4 sm:p-5" title={rp(value)}>
      <div className="flex items-center gap-2.5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${style.icon}`}>
          <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="text-xs font-medium text-[#687184]">{label}</span>
      </div>
      <div className="mt-3 truncate font-display text-xl font-semibold tracking-tight text-[#252d3f] sm:text-2xl">{rpShort(value)}</div>
      <p className="mt-1 text-[0.7rem] leading-relaxed text-[#858da0]">{detail}</p>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="min-h-[70vh] bg-[#f4f6fa] px-4 py-6 sm:px-6 md:px-8" role="status" aria-label="Memuat dashboard">
      <div className="mx-auto max-w-6xl animate-pulse space-y-5">
        <div className="h-20 rounded-2xl bg-white" />
        <div className="grid gap-4 sm:grid-cols-3"><div className="h-36 rounded-2xl bg-white" /><div className="h-36 rounded-2xl bg-white" /><div className="h-36 rounded-2xl bg-white" /></div>
        <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]"><div className="h-72 rounded-2xl bg-white" /><div className="h-72 rounded-2xl bg-white" /></div>
      </div>
      <span className="sr-only">Memuat data dashboard…</span>
    </div>
  );
}

export default function Beranda() {
  const q = trpc.reports.dashboard.useQuery(undefined, { refetchOnMount: "always" });

  if (q.isLoading) return <DashboardLoading />;
  if (q.error || !q.data) {
    return (
      <div className="min-h-[70vh] bg-[#f4f6fa] p-4 sm:p-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#e6e9f0] bg-white shadow-sm">
          <LoadError message={q.error?.message} retry={() => q.refetch()} />
        </div>
      </div>
    );
  }

  const d = q.data;
  const cards: StatCardProps[] = [
    {
      label: "Pesanan baru",
      value: d.baruCount,
      detail: "Belum diproses ke supplier",
      badge: d.baruCount > 0 ? "Perlu diproses" : "Terkendali",
      href: "/pesanan?status=draft",
      icon: ClipboardList,
      tone: "violet",
    },
    {
      label: "Menunggu supplier",
      value: d.menungguCount,
      detail: "PO terkirim, belum ada balasan",
      badge: d.menungguCount > 0 ? "Tindak lanjuti" : "Tidak ada antrean",
      href: "/pesanan?status=ordered",
      icon: Truck,
      tone: "mint",
    },
    {
      label: "Faktur ada selisih",
      value: d.selisihCount,
      detail: "Periksa nilai faktur dengan hitungan sistem",
      badge: d.selisihCount > 0 ? "Perlu verifikasi" : "Tidak ada selisih",
      href: "/faktur",
      icon: AlertTriangle,
      tone: "rose",
    },
  ];

  const actions: { label: string; detail: string; href: string; icon: LucideIcon; tone: Tone }[] = [
    { label: "Buat pesanan", detail: "Mulai order pelanggan", href: "/pesanan/baru", icon: ClipboardList, tone: "violet" },
    { label: "Tindak lanjuti supplier", detail: "Catat balasan atau penerimaan PO", href: "/pesanan?status=ordered", icon: Truck, tone: "mint" },
    { label: "Periksa faktur", detail: "Cocokkan faktur supplier", href: "/faktur", icon: FileText, tone: "rose" },
  ];

  const finance = [
    { label: "Pendapatan bulan ini", value: d.pembukuan.pendapatan, detail: "Berdasarkan jurnal", icon: TrendingUp, tone: "violet" as const },
    { label: "Laba kotor", value: d.pembukuan.labaKotor, detail: "Pendapatan dikurangi HPP", icon: Wallet, tone: "mint" as const },
    { label: "Piutang", value: d.pembukuan.piutang, detail: "Saldo jurnal berjalan", icon: FileText, tone: "rose" as const },
    { label: "Hutang", value: d.pembukuan.hutang, detail: "Saldo jurnal berjalan", icon: FileText, tone: "violet" as const },
  ];

  return (
    <div className="min-h-full bg-[#f4f6fa] px-4 py-5 sm:px-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6975b9]">
              <span className="inline-block size-2 rounded-full bg-[#83b9ac]" aria-hidden="true" />
              Jena Medical Center
              <span className="text-[#b1b7c4]">/</span>
              <span className="text-[#81899a]">Ikhtisar operasional</span>
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-[#20283a] sm:text-4xl">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#717a8d]">
              Pantau pesanan, dokumen, dan kondisi pembukuan Jena dalam satu tampilan.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-[#e2e6ee] bg-white px-3 text-xs font-medium text-[#687184] sm:flex-none">
              <CalendarDays size={15} className="text-[#7380c5]" aria-hidden="true" />
              <span>{tanggalPanjang(new Date())}</span>
            </div>
            <Link to="/pesanan/baru" className="btn min-h-11 flex-1 rounded-xl border-[#20283a] bg-[#20283a] px-4 text-white hover:bg-[#303b54] sm:flex-none">
              <ClipboardList size={16} aria-hidden="true" />
              Pesanan baru
            </Link>
          </div>
        </header>

        <section aria-label="Ringkasan dokumen" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => <StatCard key={card.label} {...card} />)}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
          <Surface className="min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-1 pt-5 sm:px-5">
              <div>
                <p className="label-caps text-[#6874bd]">Aktivitas</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-[#252d3f]">Pesanan & penagihan</h2>
                <p className="mt-1 text-xs text-[#858da0]">Nilai harian selama tujuh hari terakhir</p>
              </div>
              <span className="rounded-full bg-[#f1f2ff] px-3 py-1.5 text-[0.68rem] font-semibold text-[#626db9]">7 hari terakhir</span>
            </div>
            <div className="px-4 pb-5 pt-3 sm:px-5">
              <DualBars data={d.days} height={190} />
            </div>
          </Surface>

          <Surface className="min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-4 pb-4 pt-5 sm:px-5">
              <div>
                <p className="label-caps text-[#c16a82]">Tindak lanjut</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-[#252d3f]">Perlu dipantau</h2>
                <p className="mt-1 text-xs text-[#858da0]">Dokumen yang butuh perhatian</p>
              </div>
              <span className="grid size-9 place-items-center rounded-xl bg-[#fff0f3] text-[#c56680]">
                <AlertTriangle size={17} aria-hidden="true" />
              </span>
            </div>
            <div className="border-t border-[#edf0f4]">
              {d.pantau.length === 0 ? (
                <div className="flex min-h-44 flex-col items-center justify-center px-5 py-8 text-center">
                  <span className="grid size-11 place-items-center rounded-full bg-[#eaf6f1] text-[#438b7c]"><CheckCircle2 size={21} aria-hidden="true" /></span>
                  <p className="mt-3 text-sm font-semibold text-[#354254]">Tidak ada yang mendesak</p>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#858da0]">Dokumen yang memerlukan perhatian akan muncul di sini.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#edf0f4]">
                  {d.pantau.map((item, i) => (
                    <Link
                      key={`${item.kind}-${item.title}-${i}`}
                      to={item.kind === "selisih" ? "/faktur" : "/invoice"}
                      className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-[#fafbfc] sm:px-5"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-[#30394a]">{item.title}</h3>
                          {item.date && <p className="mt-1 text-xs text-[#858da0]">Jatuh tempo {tanggal(item.date)}</p>}
                        </div>
                        <ArrowUpRight size={16} className="mt-0.5 shrink-0 text-[#a0a7b5] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#6975b9]" aria-hidden="true" />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {item.lines.map((line, j) => (
                          <span key={`${line.label}-${j}`} className="min-w-0 text-xs text-[#858da0]">
                            {line.label}: <b className="font-semibold text-[#4a5364]">{line.value}</b>
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Surface>
        </div>

        <section aria-labelledby="quick-actions-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="label-caps text-[#6874bd]">Aksi cepat</p>
              <h2 id="quick-actions-heading" className="mt-1 font-display text-lg font-semibold text-[#252d3f]">Lanjutkan pekerjaan</h2>
            </div>
            <Link to="/pesanan" className="hidden items-center gap-1 text-xs font-semibold text-[#626db9] hover:text-[#3d4b93] sm:flex">
              Semua pesanan <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {actions.map(({ label, detail, href, icon: Icon, tone }) => (
              <Link key={label} to={href} className="group flex min-h-[92px] items-center gap-3 rounded-2xl border border-[#e6e9f0] bg-white p-4 shadow-[0_12px_30px_-26px_rgba(24,35,56,0.45)] transition hover:-translate-y-0.5 hover:border-[#d5dae5] hover:shadow-md focus-visible:outline-offset-4">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${toneStyles[tone].icon}`}><Icon size={18} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#30394a]">{label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#858da0]">{detail}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-[#a0a7b5] transition group-hover:translate-x-0.5 group-hover:text-[#6975b9]" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
          <Surface className="min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-4 pt-5 sm:px-5">
              <div>
                <p className="label-caps text-[#398c7c]">Dari jurnal yang dibukukan</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-[#252d3f]">Ikhtisar pembukuan</h2>
                <p className="mt-1 text-xs text-[#858da0]">Angka bulan berjalan</p>
              </div>
              <Link to="/laporan" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#626db9] transition hover:bg-[#f1f2ff]">
                Buka laporan <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 border-t border-[#edf0f4] p-4 sm:grid-cols-2 sm:p-5">
              {finance.map((metric) => <FinanceMetric key={metric.label} {...metric} />)}
            </div>
            <div className="border-t border-[#edf0f4] px-4 pb-5 pt-4 sm:px-5">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#30394a]">Pendapatan dibanding HPP</h3>
                <span className="text-[0.68rem] text-[#858da0]">Tren 6 bulan</span>
              </div>
              <TrendBars data={d.tren} height={160} />
            </div>
          </Surface>

          <Surface className="min-w-0 overflow-hidden">
            <div className="px-4 pb-4 pt-5 sm:px-5">
              <p className="label-caps text-[#6874bd]">Status dokumen</p>
              <h2 className="mt-1 font-display text-lg font-semibold text-[#252d3f]">Tagihan & draf</h2>
              <p className="mt-1 text-xs text-[#858da0]">Ringkasan dokumen operasional</p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-[#edf0f4] p-4 sm:p-5">
              <div className="rounded-xl bg-[#f7f8fb] p-3 sm:p-4">
                <p className="text-xs font-medium text-[#687184]">Nilai ditagih</p>
                <p className="mt-2 truncate font-display text-lg font-semibold text-[#252d3f]" title={rp(d.ditagih)}>{rpShort(d.ditagih)}</p>
                <p className="mt-1 text-[0.65rem] leading-relaxed text-[#858da0]">Draf {d.invoiceStatus.draf} · Terbit {d.invoiceStatus.terbit} · Lunas {d.invoiceStatus.lunas}</p>
              </div>
              <div className="rounded-xl bg-[#f7f8fb] p-3 sm:p-4">
                <p className="text-xs font-medium text-[#687184]">Belum ditagih</p>
                <p className="mt-2 truncate font-display text-lg font-semibold text-[#252d3f]" title={rp(d.belumDitagih)}>{rpShort(d.belumDitagih)}</p>
                <p className="mt-1 text-[0.65rem] leading-relaxed text-[#858da0]">Siap ditagih: {d.siapDitagihCount} pesanan</p>
                {d.siapDitagihCount > 0 && <Link to="/pesanan?status=confirmed" className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-[#626db9] underline underline-offset-2">Buat invoice <ArrowRight size={13} aria-hidden="true" /></Link>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:px-5">
              <div className="flex items-start gap-2 rounded-xl border border-[#edf0f4] p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#eef0ff] text-[#6873c4]"><FileText size={16} aria-hidden="true" /></span>
                <div className="min-w-0"><p className="text-xs text-[#858da0]">Draf invoice</p><p className="mt-0.5 text-sm font-semibold text-[#30394a]">{d.dokumenBelumDibukukan.drafInvoice} · {rpShort(d.dokumenBelumDibukukan.nilaiDrafInvoice)}</p></div>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-[#edf0f4] p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e8f6f2] text-[#398c7c]"><FileText size={16} aria-hidden="true" /></span>
                <div className="min-w-0"><p className="text-xs text-[#858da0]">Draf faktur</p><p className="mt-0.5 text-sm font-semibold text-[#30394a]">{d.dokumenBelumDibukukan.drafFaktur} · {rpShort(d.dokumenBelumDibukukan.nilaiDrafFaktur)}</p></div>
              </div>
            </div>
            <div className="border-t border-[#edf0f4] px-4 py-4 sm:px-5">
              <p className="text-xs leading-relaxed text-[#7d8698]">
                Sebelum tutup buku: {d.perluDiselesaikan.pajakMasukBelumLengkap} faktur pajak belum lengkap · {d.perluDiselesaikan.fakturSelisih} faktur selisih · {d.perluDiselesaikan.drafInvoice} draf invoice.
              </p>
            </div>
            <p className="px-4 pb-5 text-[0.68rem] leading-relaxed text-[#9097a6] sm:px-5">
              Ringkasan PPN bukan SPT atau e-Faktur. Draf belum menjadi pendapatan, piutang, atau hutang.
            </p>
          </Surface>
        </div>

        <p className="px-1 pb-2 text-[0.68rem] leading-relaxed text-[#858da0]">
          Angka operasional berasal dari dokumen; angka keuangan bersumber dari jurnal yang sudah dibukukan.
        </p>
      </div>
    </div>
  );
}
