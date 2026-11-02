import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft, Search, type LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  sub,
  action,
  back,
  backLabel = "Kembali",
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  back?: string;
  backLabel?: string;
}) {
  return (
    <div className="px-4 pb-3 pt-4 md:px-8 md:pb-5 md:pt-7">
      {back && (
        <Link
          to={back}
          className="mb-2 inline-flex min-h-8 items-center gap-0.5 text-xs font-semibold text-[var(--slate)] transition-colors hover:text-[var(--slate-deep)]"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[1.4rem] font-bold leading-tight tracking-tight text-[var(--ink)] md:text-2xl">{title}</h1>
          {sub && <p className="mt-1 max-w-3xl text-[0.8125rem] leading-relaxed text-[var(--ink-soft)] md:text-sm">{sub}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function Section({
  title,
  note,
  children,
  className = "",
  action,
}: {
  title?: string;
  note?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`card mx-4 my-3 overflow-hidden md:mx-8 ${className}`}>
      {(title || note || action) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[var(--line)] px-4 py-3 md:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold text-[var(--ink)]">{title}</h2>}
            {note && <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-soft)]">{note}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    draft: { label: "Draf", cls: "bg-[#eef3f8] text-[#5a7186]", dot: "bg-[#8ba3b7]" },
    ordered: { label: "Menunggu supplier", cls: "bg-[var(--warn-bg)] text-[var(--warn)]", dot: "bg-[#e0a33a]" },
    sent: { label: "Terkirim", cls: "bg-[var(--warn-bg)] text-[var(--warn)]", dot: "bg-[#e0a33a]" },
    confirmed: { label: "Diproses", cls: "bg-[#e6f2fc] text-[var(--slate-deep)]", dot: "bg-[var(--slate)]" },
    closed: { label: "Selesai", cls: "bg-[var(--ok-bg)] text-[var(--ok)]", dot: "bg-[var(--ok)]" },
    cancelled: { label: "Dibatalkan", cls: "bg-[var(--bad-bg)] text-[var(--bad)]", dot: "bg-[var(--bad)]" },
    issued: { label: "Terbit", cls: "bg-[#e6f2fc] text-[var(--slate-deep)]", dot: "bg-[var(--slate)]" },
    partial: { label: "Sebagian", cls: "bg-[var(--warn-bg)] text-[var(--warn)]", dot: "bg-[#e0a33a]" },
    paid: { label: "Lunas", cls: "bg-[var(--ok-bg)] text-[var(--ok)]", dot: "bg-[var(--ok)]" },
    posted: { label: "Dibukukan", cls: "bg-[#e6f2fc] text-[var(--slate-deep)]", dot: "bg-[var(--slate)]" },
  };
  const s = map[status] ?? { label: status, cls: "bg-[#eef3f8] text-[var(--ink)]", dot: "bg-[#8ba3b7]" };
  return (
    <span className={`badge ${s.cls}`}>
      <i className={`size-1.5 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export function Loading() {
  return (
    <div className="px-4 py-8 text-center text-sm text-[var(--ink-soft)] md:px-8" role="status" aria-live="polite">
      Memuat data…
    </div>
  );
}

export function LoadError({ message, retry }: { message?: string; retry?: () => void }) {
  return (
    <div className="px-4 py-16 text-center md:px-8">
      <p className="text-sm text-[var(--bad)]">{message ?? "Gagal memuat data."}</p>
      {retry && (
        <button className="btn btn-ghost mt-4" type="button" onClick={retry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center md:px-8">
      <p className="text-sm text-[var(--ink-soft)]">{text}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function KV({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--line)] px-4 py-2.5 md:px-5">
      <span className="min-w-0 flex-1 text-sm leading-snug text-[var(--ink-soft)]">{k}</span>
      <span className={`max-w-full break-words text-right text-sm ${strong ? "font-display text-base font-bold text-[var(--ink)]" : "font-semibold"}`}>{v}</span>
    </div>
  );
}

/** Rounded pill filter row used on list screens. */
export function FilterChips<T extends string>({
  items,
  value,
  onChange,
  label = "Filter daftar",
}: {
  items: ReadonlyArray<{ key: T; label: string }>;
  value: T;
  onChange: (key: T) => void;
  label?: string;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={value === item.key}
          onClick={() => onChange(item.key)}
          className={`chip ${value === item.key ? "chip-active" : ""}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** Search field with a leading magnifier, used above list screens. */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
}) {
  return (
    <label className="search-field">
      <Search size={16} className="shrink-0 text-[#93a6b6]" aria-hidden="true" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label ?? placeholder} />
    </label>
  );
}

/** Compact metric tile for summary grids. */
export function Metric({
  label,
  value,
  hint,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    blue: "bg-[#e6f2fc] text-[var(--slate)]",
    green: "bg-[var(--ok-bg)] text-[var(--ok)]",
    amber: "bg-[var(--warn-bg)] text-[var(--warn)]",
    red: "bg-[var(--bad-bg)] text-[var(--bad)]",
  };
  return (
    <div className="min-w-0 rounded-xl border border-[var(--line)] bg-white p-3">
      <div className="flex items-center gap-2">
        {Icon && (
          <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>
            <Icon size={16} strokeWidth={2} aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0 truncate text-[0.7rem] font-semibold text-[var(--ink-soft)]">{label}</span>
      </div>
      <div className="mt-2 break-words font-display text-[0.95rem] font-bold tabular-nums text-[var(--ink)]">{value}</div>
      {hint && <p className="mt-0.5 text-[0.65rem] leading-relaxed text-[var(--ink-soft)]">{hint}</p>}
    </div>
  );
}
