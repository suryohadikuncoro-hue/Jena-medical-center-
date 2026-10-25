import type { ReactNode } from "react";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-6 md:px-8">
      <div>
        <h1 className="font-display text-2xl font-semibold leading-[1.15] md:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-[var(--ink-soft)]">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Section({ title, note, children, className = "" }: { title?: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rule-strong ${className}`}>
      {(title || note) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-2 pt-4 md:px-8">
          {title && <h2 className="label-caps">{title}</h2>}
          {note && <p className="text-xs text-[var(--ink-soft)]">{note}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draf", cls: "text-[var(--ink-soft)]" },
    ordered: { label: "Menunggu supplier", cls: "text-[var(--warn)]" },
    sent: { label: "Terkirim", cls: "text-[var(--warn)]" },
    confirmed: { label: "Terkonfirmasi", cls: "text-[var(--slate-deep)]" },
    closed: { label: "Selesai", cls: "text-[var(--ok)]" },
    issued: { label: "Terbit", cls: "text-[var(--slate-deep)]" },
    partial: { label: "Sebagian", cls: "text-[var(--warn)]" },
    paid: { label: "Lunas", cls: "text-[var(--ok)]" },
    posted: { label: "Dibukukan", cls: "text-[var(--slate-deep)]" },
  };
  const s = map[status] ?? { label: status, cls: "text-[var(--ink)]" };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function Loading() {
  return (
    <div className="px-4 py-16 text-center text-sm text-[var(--ink-soft)] md:px-8" role="status" aria-live="polite">Memuat data…</div>
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
    <div className="px-4 py-12 text-center md:px-8">
      <p className="text-sm text-[var(--ink-soft)]">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function KV({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] px-4 py-3 md:px-8">
      <span className="text-sm text-[var(--ink-soft)]">{k}</span>
      <span className={`text-right text-sm ${strong ? "font-display text-base font-semibold" : "font-medium"}`}>{v}</span>
    </div>
  );
}
