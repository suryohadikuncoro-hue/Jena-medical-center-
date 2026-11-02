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

type Tone = "blue" | "green" | "amber" | "red";

const toneStyles: Record<Tone, { icon: string; badge: string }> = {
  blue: { icon: "bg-[#e6f2fc] text-[var(--slate)]", badge: "bg-[#e6f2fc] text-[var(--slate-deep)]" },
  green: { icon: "bg-[var(--ok-bg)] text-[var(--ok)]", badge: "bg-[var(--ok-bg)] text-[var(--ok)]" },
  amber: { icon: "bg-[var(--warn-bg)] text-[var(--warn)]", badge: "bg-[var(--warn-bg)] text-[var(--warn)]" },
  red: { icon: "bg-[var(--bad-bg)] text-[var(--bad)]", badge: "bg-[var(--bad-bg)] text-[var(--bad)]" },
};

function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card overflow-hidden ${className}`}>{children}</section>;
}

type StatCardProps = {
  label: string;
  value: number;
  detail: string;
  badge: string;
  href: string;
  icon: LucideIcon;
  tone: Tone;
  className?: string;
};

function StatCard({ label, value, detail, badge, href, icon: Icon, tone, className = "" }: StatCardProps) {
  const style = toneStyles[tone];
  return (
    <Link
      to={href}
      aria-label={`${label}: ${value}. ${detail}`}
      className={`group min-w-0 rounded-2xl border border-[var(--line)] bg-white p-3 shadow-[0_1px_2px_rgb(16_38_58/0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-md sm:p-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${style.icon}`}>
          <Icon size={19} strokeWidth={2} aria-hidden="true" />
        </span>
        <ArrowUpRight size={16} className="text-[var(--ink-soft)]/60 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--slate)]" aria-hidden="true" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">{value}</span>
        <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-semibold ${style.badge}`}>{badge}</span>
      </div>
      <h2 className="mt-1 text-[0.8125rem] font-semibold text-[var(--ink)]">{label}</h2>
      <p className="mt-0.5 text-[0.7rem] leading-relaxed text-[var(--ink-soft)]">{detail}</p>
    </Link>
  );
}

function FinanceMetric({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: LucideIcon; tone: Tone }) {
  const style = toneStyles[tone];
  return (
    <div className="min-w-0 rounded-xl bg-[var(--paper)] p-3">
      <div className="flex items-center gap-2">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${style.icon}`}>
          <Icon size={15} strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="min-w-0 truncate text-[0.7rem] font-semibold text-[var(--ink-soft)]">{label}</span>
      </div>
      <div className="mt-2 break-words font-display text-sm font-bold tabular-nums text-[var(--ink)]" title={rp(value)}>{rp(value)}</div>
      <p className="mt-0.5 text-[0.65rem] leading-relaxed text-[var(--ink-soft)]">{detail}</p>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="px-4 py-5 md:px-8" role="status" aria-label="Memuat dashboard">
      <div className="animate-pulse space-y-4">
        <div className="h-16 rounded-2xl bg-white" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="h-32 rounded-2xl bg-white" />
          <div className="h-32 rounded-2xl bg-white" />
          <div className="col-span-2 h-32 rounded-2xl bg-white sm:col-span-1" />
        </div>
        <div className="h-64 rounded-2xl bg-white" />
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
      <div className="px-4 py-8 md:px-8">
        <div className="card">
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
      badge: d.baruCount > 0 ? "Perlu diproses" : "Tidak ada antrean",
      href: "/pesanan?status=draft",
      icon: ClipboardList,
      tone: "blue",
    },
    {
      label: "Menunggu supplier",
      value: d.menungguCount,
      detail: "PO terkirim, belum ada balasan",
      badge: d.menungguCount > 0 ? "Tindak lanjuti" : "Tidak ada antrean",
      href: "/pesanan?status=ordered",
      icon: Truck,
      tone: "amber",
    },
    {
      label: "Faktur ada selisih",
      value: d.selisihCount,
      detail: "Periksa nilai faktur dengan hitungan sistem",
      badge: d.selisihCount > 0 ? "Perlu verifikasi" : "Tidak ada selisih",
      href: "/faktur",
      icon: AlertTriangle,
      tone: "red",
    },
  ];

  const actions: { label: string; detail: string; href: string; icon: LucideIcon; tone: Tone }[] = [
    { label: "Buat pesanan", detail: "Mulai order pelanggan", href: "/pesanan/baru", icon: ClipboardList, tone: "blue" },
    { label: "Tindak lanjuti supplier", detail: "Catat balasan atau penerimaan PO", href: "/pesanan?status=ordered", icon: Truck, tone: "amber" },
    { label: "Periksa faktur", detail: "Cocokkan faktur supplier", href: "/faktur", icon: FileText, tone: "red" },
  ];

  const finance = [
    { label: "Pendapatan", value: d.pembukuan.pendapatan, detail: "Bulan berjalan", icon: TrendingUp, tone: "blue" as const },
    { label: "Laba kotor", value: d.pembukuan.labaKotor, detail: "Pendapatan − HPP", icon: Wallet, tone: "green" as const },
    { label: "Piutang", value: d.pembukuan.piutang, detail: "Saldo jurnal", icon: FileText, tone: "amber" as const },
    { label: "Hutang", value: d.pembukuan.hutang, detail: "Saldo jurnal", icon: FileText, tone: "red" as const },
  ];

  return (
    <div className="w-full min-w-0 space-y-4 px-4 py-5 md:px-8 md:py-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[0.7rem] font-semibold text-[var(--ink-soft)]">
            <span className="inline-block size-1.5 rounded-full bg-[var(--teal)]" aria-hidden="true" />
            Jena Medical Center
            <span aria-hidden="true">/</span>
            <span className="text-[var(--slate)]">Ikhtisar operasional</span>
          </div>
          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-[var(--ink)] md:text-3xl">Dashboard</h1>
          <p className="mt-1 max-w-2xl text-[0.8125rem] leading-relaxed text-[var(--ink-soft)]">
            Pantau pesanan, dokumen, dan kondisi pembukuan dalam satu tampilan.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-medium text-[var(--ink-soft)] sm:flex-none">
            <CalendarDays size={15} className="text-[var(--slate)]" aria-hidden="true" />
            <span>{tanggalPanjang(new Date())}</span>
          </div>
          <Link to="/pesanan/baru" className="btn min-h-11 flex-1 sm:flex-none">
            <ClipboardList size={16} aria-hidden="true" />
            Pesanan baru
          </Link>
        </div>
      </header>

      <section aria-label="Ringkasan dokumen" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card, index) => (
          <StatCard key={card.label} {...card} className={index === 2 ? "col-span-2 sm:col-span-1" : ""} />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(270px,1fr)]">
        <Surface>
          <div className="flex flex-wrap items-start justify-between gap-2 px-4 pb-1 pt-4 md:px-5">
            <div>
              <p className="label-caps text-[var(--slate)]">Aktivitas</p>
              <h2 className="mt-1 font-display text-base font-bold text-[var(--ink)]">Pesanan & penagihan</h2>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Nilai harian tujuh hari terakhir</p>
            </div>
            <span className="rounded-full bg-[var(--slate-hover)] px-2.5 py-1 text-[0.65rem] font-semibold text-[var(--slate-deep)]">7 hari</span>
          </div>
          <div className="px-3 pb-4 pt-2 md:px-4">
            <DualBars data={d.days} height={180} />
          </div>
        </Surface>

        <Surface>
          <div className="flex items-start justify-between gap-2 px-4 pb-3 pt-4 md:px-5">
            <div>
              <p className="label-caps text-[var(--bad)]">Tindak lanjut</p>
              <h2 className="mt-1 font-display text-base font-bold text-[var(--ink)]">Perlu dipantau</h2>
            </div>
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--bad-bg)] text-[var(--bad)]">
              <AlertTriangle size={16} aria-hidden="true" />
            </span>
          </div>
          <div className="border-t border-[var(--line)]">
            {d.pantau.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center px-4 py-7 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-[var(--ok-bg)] text-[var(--ok)]"><CheckCircle2 size={20} aria-hidden="true" /></span>
                <p className="mt-2.5 text-sm font-semibold text-[var(--ink)]">Tidak ada yang mendesak</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--ink-soft)]">Dokumen yang butuh perhatian muncul di sini.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {d.pantau.map((item, i) => (
                  <Link
                    key={`${item.kind}-${item.title}-${i}`}
                    to={item.kind === "selisih" ? "/faktur" : "/invoice"}
                    className="group flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-[var(--paper)] md:px-5"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-[0.8125rem] font-semibold text-[var(--ink)]">{item.title}</h3>
                        {item.date && <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Jatuh tempo {tanggal(item.date)}</p>}
                      </div>
                      <ArrowUpRight size={15} className="mt-0.5 shrink-0 text-[var(--ink-soft)]/60 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--slate)]" aria-hidden="true" />
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {item.lines.map((line, j) => (
                        <span key={`${line.label}-${j}`} className="min-w-0 text-[0.7rem] text-[var(--ink-soft)]">
                          {line.label}: <b className="font-semibold text-[var(--ink)]">{line.value}</b>
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
        <div className="mb-2 flex items-end justify-between gap-3">
          <h2 id="quick-actions-heading" className="font-display text-base font-bold text-[var(--ink)]">Aksi cepat</h2>
          <Link to="/pesanan" className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-[var(--slate)] hover:text-[var(--slate-deep)]">
            Semua pesanan <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {actions.map(({ label, detail, href, icon: Icon, tone }) => (
            <Link key={label} to={href} className="group flex min-h-[80px] items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-3.5 shadow-[0_1px_2px_rgb(16_38_58/0.04)] transition hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-md">
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${toneStyles[tone].icon}`}><Icon size={17} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8125rem] font-semibold text-[var(--ink)]">{label}</span>
                <span className="mt-0.5 block text-[0.7rem] leading-relaxed text-[var(--ink-soft)]">{detail}</span>
              </span>
              <ArrowRight size={15} className="shrink-0 text-[var(--ink-soft)]/60 transition group-hover:translate-x-0.5 group-hover:text-[var(--slate)]" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(270px,1fr)]">
        <Surface>
          <div className="flex flex-wrap items-start justify-between gap-2 px-4 pb-3 pt-4 md:px-5">
            <div>
              <p className="label-caps text-[var(--ok)]">Jurnal yang dibukukan</p>
              <h2 className="mt-1 font-display text-base font-bold text-[var(--ink)]">Ikhtisar pembukuan</h2>
            </div>
            <Link to="/laporan" className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[var(--slate)] transition hover:bg-[var(--slate-hover)]">
              Laporan <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 border-t border-[var(--line)] p-3 md:p-4">
            {finance.map((metric) => <FinanceMetric key={metric.label} {...metric} />)}
          </div>
          <div className="border-t border-[var(--line)] px-4 pb-4 pt-3 md:px-5">
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[0.8125rem] font-semibold text-[var(--ink)]">Pendapatan vs HPP</h3>
              <span className="text-[0.65rem] text-[var(--ink-soft)]">Tren 6 bulan</span>
            </div>
            <TrendBars data={d.tren} height={150} />
          </div>
        </Surface>

        <Surface>
          <div className="px-4 pb-3 pt-4 md:px-5">
            <p className="label-caps text-[var(--slate)]">Status dokumen</p>
            <h2 className="mt-1 font-display text-base font-bold text-[var(--ink)]">Tagihan & draf</h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5 border-t border-[var(--line)] p-3 md:p-4">
            <div className="rounded-xl bg-[var(--paper)] p-3">
              <p className="text-[0.7rem] font-semibold text-[var(--ink-soft)]">Nilai ditagih</p>
              <p className="mt-1.5 break-words font-display text-sm font-bold tabular-nums text-[var(--ink)]" title={rp(d.ditagih)}>{rp(d.ditagih)}</p>
              <p className="mt-1 text-[0.62rem] leading-relaxed text-[var(--ink-soft)]">Draf {d.invoiceStatus.draf} · Terbit {d.invoiceStatus.terbit} · Lunas {d.invoiceStatus.lunas}</p>
            </div>
            <div className="rounded-xl bg-[var(--paper)] p-3">
              <p className="text-[0.7rem] font-semibold text-[var(--ink-soft)]">Belum ditagih</p>
              <p className="mt-1.5 break-words font-display text-sm font-bold tabular-nums text-[var(--ink)]" title={rp(d.belumDitagih)}>{rp(d.belumDitagih)}</p>
              <p className="mt-1 text-[0.62rem] leading-relaxed text-[var(--ink-soft)]">{d.siapDitagihCount} pesanan siap ditagih</p>
              {d.siapDitagihCount > 0 && (
                <Link to="/pesanan?status=confirmed" className="mt-1.5 inline-flex min-h-7 items-center gap-1 text-[0.68rem] font-semibold text-[var(--slate)] underline underline-offset-2">
                  Buat invoice <ArrowRight size={12} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 px-3 pb-3 md:px-4">
            <div className="flex items-start gap-2 rounded-xl border border-[var(--line)] p-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--slate-hover)] text-[var(--slate)]"><FileText size={14} aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="text-[0.65rem] text-[var(--ink-soft)]">Draf invoice</p>
                <p className="mt-0.5 text-xs font-semibold text-[var(--ink)]">{d.dokumenBelumDibukukan.drafInvoice} · {rpShort(d.dokumenBelumDibukukan.nilaiDrafInvoice)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-[var(--line)] p-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--ok-bg)] text-[var(--ok)]"><FileText size={14} aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="text-[0.65rem] text-[var(--ink-soft)]">Draf faktur</p>
                <p className="mt-0.5 text-xs font-semibold text-[var(--ink)]">{d.dokumenBelumDibukukan.drafFaktur} · {rpShort(d.dokumenBelumDibukukan.nilaiDrafFaktur)}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-[var(--line)] px-4 py-3 md:px-5">
            <p className="text-[0.68rem] leading-relaxed text-[var(--ink-soft)]">
              Sebelum tutup buku: {d.perluDiselesaikan.pajakMasukBelumLengkap} faktur pajak belum lengkap · {d.perluDiselesaikan.fakturSelisih} faktur selisih · {d.perluDiselesaikan.drafInvoice} draf invoice.
            </p>
          </div>
        </Surface>
      </div>

      <p className="px-1 text-[0.65rem] leading-relaxed text-[var(--ink-soft)]">
        Angka operasional berasal dari dokumen; angka keuangan bersumber dari jurnal yang sudah dibukukan. Ringkasan PPN bukan SPT atau e-Faktur.
      </p>
    </div>
  );
}
