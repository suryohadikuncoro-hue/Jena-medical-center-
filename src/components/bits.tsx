import type { ReactNode } from "react";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-3 pt-5 md:px-8 md:pb-4 md:pt-7">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold leading-[1.15] tracking-tight md:text-3xl">{title}</h1>
        {sub && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--ink-soft)]">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Section({ title, note, children, className = "" }: { title?: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`mx-4 my-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)] md:mx-8 ${className}`}>
      {(title || note) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--line)] px-4 py-3 md:px-6">
          {title && <h2 className="text-sm font-semibold text-[var(--ink)]">{title}</h2>}
          {note && <p className="text-xs leading-relaxed text-[var(--ink-soft)]">{note}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draf", cls: "bg-[#f2f4f7] text-[#475467]" },
    ordered: { label: "Menunggu supplier", cls: "bg-[#fff3d6] text-[#8a5b00]" },
    sent: { label: "Terkirim", cls: "bg-[#fff3d6] text-[#8a5b00]" },
    confirmed: { label: "Terkonfirmasi", cls: "bg-[#eef0ff] text-[#4e5fa8]" },
    closed: { label: "Selesai", cls: "bg-[#e8f6f2] text-[#2f7568]" },
    issued: { label: "Terbit", cls: "bg-[#eef0ff] text-[#4e5fa8]" },
    partial: { label: "Sebagian", cls: "bg-[#fff3d6] text-[#8a5b00]" },
    paid: { label: "Lunas", cls: "bg-[#e8f6f2] text-[#2f7568]" },
    posted: { label: "Dibukukan", cls: "bg-[#eef0ff] text-[#4e5fa8]" },
  };
  const s = map[status] ?? { label: status, cls: "bg-[#f2f4f7] text-[var(--ink)]" };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function Loading() {
  return (
    <div className="px-4 py-10 text-center text-sm text-[var(--ink-soft)] md:px-8" role="status" aria-live="polite">Memuat data…</div>
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
    <div className="px-4 py-8 text-center md:px-8">
      <p className="text-sm text-[var(--ink-soft)]">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function KV({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--line)] px-4 py-2.5 md:px-6">
      <span className="min-w-0 flex-1 text-sm leading-snug text-[var(--ink-soft)]">{k}</span>
      <span className={`max-w-full break-words text-right text-sm ${strong ? "font-display text-base font-semibold" : "font-medium"}`}>{v}</span>
    </div>
  );
}
