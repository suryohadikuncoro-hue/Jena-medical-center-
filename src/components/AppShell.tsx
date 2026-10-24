import { NavLink, Outlet } from "react-router";
import { Home, ClipboardList, FileText, BarChart3, Menu as MenuIcon } from "lucide-react";

const NAV = [
  { to: "/", label: "Beranda", icon: Home, end: true },
  { to: "/pesanan", label: "Pesanan", icon: ClipboardList },
  { to: "/invoice", label: "Invoice", icon: FileText },
  { to: "/laporan", label: "Laporan", icon: BarChart3 },
  { to: "/lainnya", label: "Lainnya", icon: MenuIcon },
];

export default function AppShell() {
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
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--line-strong)] bg-[var(--paper)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-col items-center justify-center gap-1 text-[0.625rem] font-semibold uppercase tracking-wide transition-colors duration-200 ${
                isActive ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--ink-soft)]"
              }`
            }
          >
            <n.icon size={18} strokeWidth={1.75} />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
