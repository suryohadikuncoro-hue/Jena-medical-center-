import type { ReactNode } from "react";
import { Link } from "react-router";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-5 md:px-8 md:pb-5 md:pt-8">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold leading-[1.15] tracking-tight text-[var(--navy)] md:text-[1.75rem]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--ink-soft)]">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Section({ title, note, children, className = "" }: { title?: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`mx-4 my-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_1px_2px_rgba(23,32,51,0.04)] md:mx-8 ${className}`}>
      {(title || note) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--line)] px-4 py-3.5 md:px-6">
          {title && <h2 className="font-display text-[0.9375rem] font-semibold text-[var(--navy)]">{title}</h2>}
          {note && <p className="text-xs leading-relaxed text-[var(--ink-soft)]">{note}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Baris filter berupa chip dengan jumlah; dipakai di halaman daftar. */
export function FilterChips<K extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { key: K; label: string; count?: number }[];
  value: K;
  onChange: (key: K) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-2 overflow-x-auto px-4 pb-4 md:px-8 [scrollbar-width:none]">
      {items.map((it) => (
        <button key={it.key} type="button" className="chip" aria-pressed={value === it.key} onClick={() => onChange(it.key)}>
          {it.label}
          {it.count !== undefined && <span className="chip-count">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Baris daftar dokumen: nomor + status di kiri, nilai di kanan. */
export function DocRow({
  to,
  number,
  status,
  meta,
  note,
  noteTone = "soft",
  amount,
  amountNote,
}: {
  to: string;
  number: string;
  status: ReactNode;
  meta: ReactNode;
  note?: ReactNode;
  noteTone?: "soft" | "warn";
  amount: ReactNode;
  amountNote?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-4 px-4 py-4 transition-colors duration-150 hover:bg-[var(--slate-tint)] md:px-6"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-[0.9375rem] font-semibold text-[var(--navy)]">{number}</span>
          {status}
        </div>
        <div className="mt-1 line-clamp-2 text-sm text-[var(--ink-soft)]">{meta}</div>
        {note && (
          <div className={`mt-1 text-xs font-medium ${noteTone === "warn" ? "text-[var(--warn)]" : "text-[var(--ink-soft)]"}`}>{note}</div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="font-display text-[0.9375rem] font-semibold tabular-nums text-[var(--navy)]">{amount}</div>
        {amountNote && <div className="mt-0.5 text-xs text-[var(--ink-soft)]">{amountNote}</div>}
      </div>
    </Link>
  );
}

const BADGES: Record<string, { label: string; dot: string; cls: string }> = {
  draft: { label: "Draf", dot: "bg-[#98a2b3]", cls: "bg-[#f2f4f7] text-[#475467]" },
  ordered: { label: "Menunggu supplier", dot: "bg-[#d99a1c]", cls: "bg-[var(--warn-tint)] text-[#8a5b00]" },
  sent: { label: "Terkirim", dot: "bg-[#d99a1c]", cls: "bg-[var(--warn-tint)] text-[#8a5b00]" },
  confirmed: { label: "Terkonfirmasi", dot: "bg-[var(--slate)]", cls: "bg-[var(--slate-tint)] text-[var(--slate-deep)]" },
  closed: { label: "Selesai", dot: "bg-[var(--ok)]", cls: "bg-[var(--ok-tint)] text-[var(--ok)]" },
  issued: { label: "Terbit", dot: "bg-[var(--slate)]", cls: "bg-[var(--slate-tint)] text-[var(--slate-deep)]" },
  partial: { label: "Sebagian", dot: "bg-[#d99a1c]", cls: "bg-[var(--warn-tint)] text-[#8a5b00]" },
  paid: { label: "Lunas", dot: "bg-[var(--ok)]", cls: "bg-[var(--ok-tint)] text-[var(--ok)]" },
  posted: { label: "Dibukukan", dot: "bg-[var(--slate)]", cls: "bg-[var(--slate-tint)] text-[var(--slate-deep)]" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = BADGES[status] ?? { label: status, dot: "bg-[#98a2b3]", cls: "bg-[#f2f4f7] text-[var(--ink)]" };
  return (
    <span className={`badge gap-1.5 ${s.cls}`}>
      <i className={`inline-block size-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export function Loading() {
  return (
    <div className="px-4 py-10 md:px-8" role="status" aria-live="polite">
      <div className="mx-auto max-w-6xl animate-pulse space-y-3">
        <div className="h-8 w-48 rounded-lg bg-[var(--paper-2)]" />
        <div className="h-24 rounded-2xl bg-white" />
        <div className="h-24 rounded-2xl bg-white" />
      </div>
      <span className="sr-only">Memuat data…</span>
    </div>
  );
}

export function LoadError({ message, retry }: { message?: string; retry?: () => void }) {
  return (
    <div className="px-4 py-16 text-center md:px-8">
      <p className="text-sm font-medium text-[var(--bad)]">{message ?? "Data belum bisa dimuat."}</p>
      <p className="mt-1 text-xs text-[var(--ink-soft)]">Periksa koneksi internet, lalu coba lagi.</p>
      {retry && (
        <button className="btn btn-ghost mt-4" type="button" onClick={retry}>
          Muat ulang
        </button>
      )}
    </div>
  );
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center md:px-8">
      <p className="text-sm text-[var(--ink-soft)]">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function KV({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--line)] px-4 py-2.5 md:px-6">
      <span className="min-w-0 flex-1 text-sm leading-snug text-[var(--ink-soft)]">{k}</span>
      <span className={`max-w-full break-words text-right text-sm tabular-nums ${strong ? "font-display text-base font-bold text-[var(--navy)]" : "font-medium"}`}>{v}</span>
    </div>
  );
}
