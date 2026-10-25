import { NavLink, Outlet } from "react-router";
import { useState } from "react";
import { Home, ClipboardList, FileText, BarChart3, Menu as MenuIcon, CreditCard, ReceiptText, X } from "lucide-react";

const NAV = [
  { to: "/", label: "Beranda", icon: Home, end: true },
  { to: "/pesanan", label: "Pesanan", icon: ClipboardList },
  { to: "/invoice", label: "Invoice", icon: FileText },
  { to: "/faktur", label: "Faktur", icon: ReceiptText },
  { to: "/pembayaran", label: "Pembayaran", icon: CreditCard },
  { to: "/laporan", label: "Laporan", icon: BarChart3 },
  { to: "/lainnya", label: "Master Data", icon: MenuIcon },
];

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-[var(--paper)] text-[var(--ink)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-[var(--line)] md:flex">
        <div className="border-b border-[var(--line-strong)] px-5 py-5">
          <div className="font-display text-lg font-semibold leading-tight">Jena</div>
          <div className="label-caps mt-1">Business Suite</div>
        </div>
        <nav className="flex-1 py-2">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex min-h-[44px] items-center gap-3 border-b border-[var(--line)] px-5 text-sm font-medium transition-colors duration-200 ${
                  isActive ? "bg-[var(--ink)] text-[var(--paper)]" : "hover:bg-[var(--paper-2)]"
                }`
              }
            >
              <n.icon size={16} strokeWidth={1.75} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 text-xs text-[var(--ink-soft)]">Jena Medical Center</div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--line-strong)] bg-[var(--paper)]/95 px-4 py-3 backdrop-blur-sm md:hidden">
        <div>
          <div className="font-display text-base font-semibold leading-tight">Jena</div>
          <div className="label-caps">Business Suite</div>
        </div>
        <div className="text-xs text-[var(--ink-soft)]">Jena Medical Center</div>
      </header>

      <main className="pb-24 md:pb-10 md:pl-56">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-[var(--line-strong)] bg-[var(--paper)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex min-h-[56px] flex-col items-center justify-center gap-1 text-[0.625rem] font-semibold uppercase tracking-wide transition-colors duration-200 ${
              isActive ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--ink-soft)]"
            }`
          }
        >
          <Home size={18} strokeWidth={1.75} />
          Dashboard
        </NavLink>
        <NavLink
          to="/laporan"
          className={({ isActive }) =>
            `flex min-h-[56px] flex-col items-center justify-center gap-1 text-[0.625rem] font-semibold uppercase tracking-wide transition-colors duration-200 ${
              isActive ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--ink-soft)]"
            }`
          }
        >
          <BarChart3 size={18} strokeWidth={1.75} />
          Laporan
        </NavLink>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--ink-soft)] transition-colors duration-200 hover:bg-[var(--paper-2)]"
        >
          <MenuIcon size={18} strokeWidth={1.75} />
          Menu
        </button>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu aplikasi">
          <button type="button" className="absolute inset-0 h-full w-full bg-black/30" aria-label="Tutup menu" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-x-4 bottom-20 max-h-[75dvh] overflow-y-auto border border-[var(--line-strong)] bg-[var(--paper)] shadow-2xl" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex items-center justify-between border-b border-[var(--line-strong)] px-5 py-4">
              <div>
                <div className="font-display text-lg font-semibold">Menu</div>
                <div className="text-xs text-[var(--ink-soft)]">Pilih fitur yang ingin dibuka</div>
              </div>
              <button type="button" className="btn btn-ghost min-h-0 px-2 py-2" aria-label="Tutup menu" onClick={() => setMenuOpen(false)}><X size={18} /></button>
            </div>
            <nav className="grid grid-cols-2">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `flex min-h-[64px] items-center gap-3 border-b border-r border-[var(--line)] px-5 text-sm font-semibold ${isActive ? "bg-[var(--ink)] text-[var(--paper)]" : "hover:bg-[var(--paper-2)]"}`}
                >
                  <n.icon size={18} strokeWidth={1.75} />
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
