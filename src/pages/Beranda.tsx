import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, FileText, Plus, Truck, type LucideIcon } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { rp, rpShort, tanggal, tanggalPanjang, todayLocal } from "@/lib/format";
import { LoadError } from "@/components/bits";
import { Donut, RevenueMarginChart, Sparkline } from "@/components/viz";

const TEAL = "#0e8a83";

function Card({ title, note, action, children, className = "" }: { title: string; note?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-[18px] border border-[var(--line)] bg-white p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight text-[var(--ink)]">{title}</h2>
          {note && <p className="mt-0.5 text-[0.78rem] text-[var(--ink-soft)]">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Pill({ tone, children }: { tone: "up" | "down" | "neutral"; children: ReactNode }) {
  const cls = tone === "up" ? "bg-[var(--ok-tint)] text-[var(--ok)]" : tone === "down" ? "bg-[var(--bad-tint)] text-[var(--bad)]" : "bg-[var(--paper-2)] text-[var(--ink-soft)]";
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

function Kpi({ label, value, sub, pill, series, color }: { label: string; value: number; sub: string; pill: ReactNode; series: number[]; color: string }) {
  const [unit, ...rest] = rpShort(value).split(" ");
  return (
    <div className="min-w-0 rounded-[18px] border border-[var(--line)] bg-white px-4 pb-3.5 pt-4 sm:px-5" title={rp(value)}>
      <div className="flex items-center justify-between gap-2">
        <span className="whitespace-nowrap text-[0.8125rem] font-medium text-[var(--ink-soft)]">{label}</span>
        {pill}
      </div>
      <p className="mb-1.5 mt-2 whitespace-nowrap text-xl font-bold tracking-tight text-[var(--ink)] sm:text-[1.75rem]">
        <span className="mr-1 text-[0.8em] font-semibold text-[var(--ink-soft)]">{unit}</span>
        {rest.join(" ")}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
        <span className="min-w-0 text-[0.78rem] leading-snug text-[var(--ink-soft)]">{sub}</span>
        <div className="w-full sm:w-[92px] sm:shrink-0"><Sparkline data={series} color={color} height={34} /></div>
      </div>
    </div>
  );
}

type Todo = { key: string; icon: LucideIcon; tone: "bad" | "warn" | "ok"; title: string; sub: string; cta: string; to: string };

const TONE = {
  bad: "bg-[var(--bad-tint)] text-[var(--bad)]",
  warn: "bg-[var(--warn-tint)] text-[var(--warn)]",
  ok: "bg-[var(--slate-tint)] text-[var(--slate-deep)]",
};

function DashboardLoading() {
  return (
    <div className="px-4 py-6 sm:px-6 md:px-8" role="status" aria-label="Memuat dashboard">
      <div className="mx-auto max-w-[88rem] animate-pulse space-y-4">
        <div className="h-14 w-64 rounded-xl bg-white" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-32 rounded-[18px] bg-white" />)}</div>
        <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]"><div className="h-80 rounded-[18px] bg-white" /><div className="h-80 rounded-[18px] bg-white" /></div>
      </div>
      <span className="sr-only">Memuat data dashboard…</span>
    </div>
  );
}

export default function Beranda() {
  const [filter, setFilter] = useState({ from: "", to: "" });
  const [draft, setDraft] = useState({ from: "", to: "" });
  const invalidRange = Boolean(draft.from && draft.to && draft.from > draft.to);
  const q = trpc.reports.dashboard.useQuery(
    { from: filter.from || undefined, to: filter.to || undefined },
    { refetchOnMount: "always" },
  );

  if (q.isLoading) return <DashboardLoading />;
  if (q.error || !q.data) {
    return (
      <div className="p-4 sm:p-8">
        <div className="mx-auto max-w-2xl rounded-[18px] border border-[var(--line)] bg-white">
          <LoadError message={q.error?.message} retry={() => q.refetch()} />
        </div>
      </div>
    );
  }

  const d = q.data;
  const p = d.pembukuan;
  const now = new Date();
  const margin = p.pendapatan > 0 ? (p.labaKotor / p.pendapatan) * 100 : 0;
  const hasDateFilter = Boolean(filter.from || filter.to);
  const periodLabel = !hasDateFilter
    ? "Seluruh data"
    : `${filter.from ? tanggal(filter.from) : "Awal data"} – ${filter.to ? tanggal(filter.to) : "Hari ini"}`;
  const u = d.umurPiutang;
  const telat = u.telat1_30 + u.telat31_60 + u.telatLebih60;
  const seri = (k: "pendapatan" | "labaKotor" | "piutang" | "hutang") => d.seri.map((s) => s[k]);

  const stages = [
    { key: "draft", name: "Draf", value: d.baruCount, color: "#c3ccda", sub: "Belum dipesan ke supplier", to: "/pesanan?status=draft" },
    { key: "ordered", name: "Menunggu supplier", value: d.menungguCount, color: "#f2b035", sub: "PO terkirim, belum dibalas", to: "/pesanan?status=ordered" },
    { key: "confirmed", name: "Terkonfirmasi", value: d.terkonfirmasiCount, color: "#5aa7f0", sub: d.siapDitagihCount > 0 ? `${d.siapDitagihCount} siap ditagih · ${rpShort(d.belumDitagih)}` : "Belum ada yang siap ditagih", to: "/pesanan?status=confirmed" },
    { key: "open", name: "Ditagih", value: d.invoiceStatus.terbit, color: TEAL, sub: "Invoice terbit, belum lunas", to: "/invoice?f=open" },
    { key: "paid", name: "Lunas", value: d.invoiceStatus.lunas, color: "#2e9e6b", sub: "Invoice sudah dibayar", to: "/invoice?f=paid" },
  ];
  const stageTotal = stages.reduce((a, s) => a + s.value, 0);

  const aging = [
    { name: "Belum jatuh tempo", value: u.belumTempo, color: TEAL },
    { name: "Telat 1–30 hari", value: u.telat1_30, color: "#f2b035" },
    { name: "Telat 31–60 hari", value: u.telat31_60, color: "#ee8a4b" },
    { name: "Telat > 60 hari", value: u.telatLebih60, color: "#e4687a" },
  ];

  const topMax = Math.max(1, ...d.pelangganTeratas.map((c) => c.nilai));

  const dueInv = d.pantau.find((x) => x.kind === "invoice" && x.date);
  const todos: Todo[] = [];
  const drafFaktur = d.dokumenBelumDibukukan.drafFaktur;
  if (drafFaktur > 0) todos.push({ key: "faktur", icon: AlertTriangle, tone: "bad", title: `${drafFaktur} faktur supplier belum dibukukan`, sub: `Masih berstatus draf · total ${rpShort(d.dokumenBelumDibukukan.totalDrafFaktur)}`, cta: "Bukukan", to: "/faktur" });
  if (dueInv) todos.push({ key: "tempo", icon: Clock, tone: "warn", title: `${dueInv.title} jatuh tempo ${tanggal(dueInv.date)}`, sub: dueInv.lines.map((l) => `${l.label} ${l.value}`).join(" · "), cta: "Buka", to: "/invoice" });
  if (d.menungguCount > 0) todos.push({ key: "po", icon: Truck, tone: "warn", title: `${d.menungguCount} pesanan menunggu balasan supplier`, sub: "PO sudah terkirim", cta: "Tindak lanjut", to: "/pesanan?status=ordered" });
  if (d.siapDitagihCount > 0) todos.push({ key: "tagih", icon: FileText, tone: "ok", title: `${d.siapDitagihCount} pesanan siap ditagih`, sub: `Total ${rpShort(d.belumDitagih)}`, cta: "Buat invoice", to: "/pesanan?status=confirmed" });
  if (d.baruCount > 0) todos.push({ key: "baru", icon: Plus, tone: "ok", title: `${d.baruCount} pesanan baru belum dipesan`, sub: "Masih berstatus draf", cta: "Proses", to: "/pesanan?status=draft" });
  const shown = todos.slice(0, 4);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-clip px-4 pb-6 pt-2 sm:px-6 md:px-8 md:py-8">
      <div className="mx-auto w-full min-w-0 max-w-[88rem] space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3 pb-1">
          <div className="min-w-0">
            <p className="text-[0.8125rem] text-[var(--ink-soft)]">{tanggalPanjang(now)}</p>
            <h1 className="mt-0.5 text-[1.625rem] font-bold leading-tight tracking-tight text-[var(--ink)] md:text-3xl">Ikhtisar bisnis</h1>
          </div>
          <Link to="/pesanan/baru" className="btn hidden md:inline-flex">
            <Plus size={18} aria-hidden="true" />
            Pesanan baru
          </Link>
        </header>

        <form
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--line)] bg-white p-3 sm:p-4"
          onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!invalidRange) setFilter(draft); }}
          aria-label="Filter tanggal dashboard"
        >
          <div className="mr-auto min-w-[9rem]">
            <p className="text-xs font-semibold text-[var(--ink-soft)]">Periode data</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{periodLabel}</p>
          </div>
          <label className="grid gap-1 text-xs font-medium text-[var(--ink-soft)]">
            Dari
            <input type="date" value={draft.from} max={draft.to || todayLocal()} onChange={(event) => setDraft({ ...draft, from: event.target.value })} className="input min-h-10 px-3 text-sm text-[var(--ink)]" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--ink-soft)]">
            Sampai
            <input type="date" value={draft.to} min={draft.from || undefined} max={todayLocal()} onChange={(event) => setDraft({ ...draft, to: event.target.value })} className="input min-h-10 px-3 text-sm text-[var(--ink)]" />
          </label>
          <button className="btn min-h-10" type="submit" disabled={invalidRange}>Terapkan</button>
          <button
            className="btn btn-ghost min-h-10"
            type="button"
            onClick={() => {
              const to = todayLocal();
              const from = `${to.slice(0, 7)}-01`;
              const month = { from, to };
              setDraft(month);
              setFilter(month);
            }}
          >
            Bulan ini
          </button>
          {invalidRange && <p className="w-full text-xs text-[var(--bad)]" role="alert">Tanggal awal harus sebelum atau sama dengan tanggal akhir.</p>}
        </form>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Kpi
            label="Pendapatan"
            value={p.pendapatan}
            color={TEAL}
            series={seri("pendapatan")}
            pill={<Pill tone="neutral">{hasDateFilter ? "Periode" : "Semua"}</Pill>}
            sub={periodLabel}
          />
          <Kpi
            label="Laba kotor"
            value={p.labaKotor}
            color="#f2b035"
            series={seri("labaKotor")}
            pill={<Pill tone="neutral">{hasDateFilter ? "Periode" : "Semua"}</Pill>}
            sub={`Margin ${margin.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`}
          />
          <Kpi
            label="Piutang"
            value={p.piutang}
            color="#5aa7f0"
            series={seri("piutang")}
            pill={<Pill tone={telat > 0 ? "down" : "neutral"}>{telat > 0 ? `${rpShort(telat).replace("Rp ", "")} telat` : "Tidak telat"}</Pill>}
            sub={`Saldo saat ini · ${p.invoiceBelumLunas} invoice aktif`}
          />
          <Kpi
            label="Hutang"
            value={p.hutang}
            color="#8d9bb2"
            series={seri("hutang")}
            pill={<Pill tone="neutral">{d.hutangTempo7.count} faktur</Pill>}
            sub={d.hutangTempo7.count > 0 ? `${rpShort(d.hutangTempo7.nilai)} tempo ≤ 7 hari · posisi saat ini` : "Posisi saat ini · tidak ada tempo ≤ 7 hari"}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
          <Card
            title="Pendapatan, HPP, dan margin"
            note={`Pendapatan dan HPP · ${periodLabel}, dari jurnal yang sudah dibukukan`}
            action={
              <div className="hidden shrink-0 gap-4 text-xs text-[var(--ink-soft)] sm:flex" aria-hidden="true">
                <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-[#0e8a83]" />Pendapatan</span>
                <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-[#c3ccda]" />HPP</span>
                <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#f2b035]" />Margin</span>
              </div>
            }
            className="order-2 xl:order-none"
          >
            <div className="mb-2 flex gap-4 text-xs text-[var(--ink-soft)] sm:hidden" aria-hidden="true">
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-[#0e8a83]" />Pendapatan</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-[#c3ccda]" />HPP</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#f2b035]" />Margin</span>
            </div>
            <RevenueMarginChart data={d.tren} />
          </Card>

          <Card title="Alur pesanan" note={`${stageTotal} dokumen · posisi saat ini (semua data)`} className="order-3 xl:order-none">
            <div className="mb-3 flex h-3.5 gap-[3px] overflow-hidden rounded-full" aria-hidden="true">
              {stages.filter((s) => s.value > 0).map((s) => <i key={s.key} className="block h-full" style={{ flex: s.value, background: s.color }} />)}
              {stageTotal === 0 && <i className="block h-full flex-1 bg-[var(--paper-2)]" />}
            </div>
            <div className="-mx-2">
              {stages.map((s) => (
                <Link key={s.key} to={s.to} className="group flex min-h-[52px] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[var(--paper)]">
                  <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.84rem] font-semibold text-[var(--ink)]">{s.name}</span>
                    <span className="block truncate text-xs text-[var(--ink-soft)]">{s.sub}</span>
                  </span>
                  <b className="text-[0.9375rem] font-bold tabular-nums text-[var(--ink)]">{s.value}</b>
                  <ChevronRight size={15} className="shrink-0 text-[#b5bdca] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </Card>

          <Card title="Perlu tindakan" note={shown.length ? `${shown.length} hal, urut dari yang paling mendesak` : undefined} className="order-1 xl:order-none xl:col-span-2 xl:hidden">
            <TodoList items={shown} />
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.1fr]">
          <Card title="Umur piutang" note={p.piutang > 0 ? `${rpShort(p.piutang)} belum dibayar · posisi saat ini` : "Posisi saat ini · tidak ada piutang"}>
            <div className="flex items-center gap-3">
              <Donut parts={aging} size={120} title={rpShort(u.belumTempo + telat).replace("Rp ", "")} caption="total piutang" />
              <ul className="min-w-0 flex-1 text-[0.8125rem]">
                {aging.map((a) => (
                  <li key={a.name} className="flex items-center gap-2 py-1.5">
                    <i className="size-2.5 shrink-0 rounded-[3px]" style={{ background: a.color }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-xs leading-tight text-[var(--ink-soft)]">{a.name}</span>
                    <b className="tabular-nums text-[var(--ink)]">{(a.value / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })}</b>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-2 text-xs text-[var(--ink-soft)]">Dalam juta rupiah.</p>
          </Card>

          <Card title="Pelanggan teratas" note={`Nilai pesanan dalam periode · juta rupiah`}>
            {d.pelangganTeratas.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--ink-soft)]">Belum ada pesanan dalam periode ini.</p>
            ) : (
              <ul>
                {d.pelangganTeratas.map((c) => (
                  <li key={c.nama} className="grid grid-cols-[minmax(0,7.75rem)_1fr_2.75rem] items-center gap-3 py-2 text-[0.8125rem]">
                    <span className="truncate" title={c.nama}>{c.nama}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-[var(--paper-2)]"><i className="block h-full rounded-full bg-[var(--slate)]" style={{ width: `${(c.nilai / topMax) * 100}%` }} /></span>
                    <b className="text-right tabular-nums">{(c.nilai / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })}</b>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Perlu tindakan" note={shown.length ? `${shown.length} hal, urut dari yang paling mendesak` : undefined} className="hidden md:col-span-2 xl:col-span-1 xl:block">
            <TodoList items={shown} />
          </Card>
        </div>

        <p className="px-1 pb-2 text-xs leading-relaxed text-[var(--ink-soft)]">
          Angka operasional berasal dari dokumen; angka keuangan bersumber dari jurnal yang sudah dibukukan. Ringkasan PPN bukan SPT atau e-Faktur.
        </p>
      </div>
    </div>
  );
}

function TodoList({ items }: { items: Todo[] }) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center text-center">
        <span className="grid size-11 place-items-center rounded-full bg-[var(--ok-tint)] text-[var(--ok)]"><CheckCircle2 size={21} aria-hidden="true" /></span>
        <p className="mt-3 text-sm font-semibold text-[var(--ink)]">Semua beres</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--ink-soft)]">Tidak ada dokumen yang menunggu tindakan.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-[var(--line)]">
      {items.map((t) => (
        <li key={t.key} className="py-3.5 first:pt-0 last:pb-0">
          <Link to={t.to} aria-label={`${t.title}. ${t.cta}`} className="group flex items-start gap-3">
            <span className={`grid size-[34px] shrink-0 place-items-center rounded-[10px] ${TONE[t.tone]}`}><t.icon size={17} strokeWidth={1.9} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.84rem] font-semibold leading-snug text-[var(--ink)]">{t.title}</span>
              <span className="mt-0.5 block text-xs leading-snug text-[var(--ink-soft)]">{t.sub}</span>
            </span>
            <ChevronRight size={16} className="mt-2 shrink-0 text-[#b5bdca] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
