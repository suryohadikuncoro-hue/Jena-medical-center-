import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useState } from "react";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Database,
  FileText,
  Home,
  LayoutGrid,
  Plus,
  ReceiptText,
  X,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Operasional",
    items: [
      { to: "/", label: "Dashboard", icon: Home, end: true },
      { to: "/pesanan", label: "Pesanan", icon: ClipboardList },
      { to: "/invoice", label: "Invoice", icon: FileText },
      { to: "/faktur", label: "Faktur supplier", icon: ReceiptText },
      { to: "/pembayaran", label: "Pembayaran", icon: CreditCard },
    ],
  },
  { title: "Pembukuan", items: [{ to: "/laporan", label: "Laporan", icon: BarChart3 }] },
  { title: "Data dasar", items: [{ to: "/lainnya", label: "Master data", icon: Database }] },
];

/** Bar bawah HP hanya tiga: Dashboard, Laporan, Menu (sisanya ada di lembar Menu). */
const TABS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/laporan", label: "Laporan", icon: BarChart3 },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-[var(--slate)]" aria-hidden="true">
        <Plus size={20} strokeWidth={2.6} className="text-white" />
      </span>
      <div className="min-w-0 leading-tight">
        <div className="font-display text-[0.9375rem] font-bold text-[var(--ink)]">Jena Suite</div>
        <div className="text-xs text-[var(--ink-soft)]">Jena Medical Center</div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  const inTabs = TABS.some((t) => (t.end ? pathname === t.to : pathname.startsWith(t.to)));

  return (
    <div className="min-h-[100dvh] w-full min-w-0 max-w-full overflow-x-hidden bg-[var(--paper)] text-[var(--ink)]">
      {/* Sidebar desktop: terang dan ringan */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--line)] bg-white md:flex">
        <div className="px-5 pb-5 pt-6">
          <BrandMark />
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Menu utama">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="px-3 pb-1.5 text-xs font-medium text-[#9aa5b5]">{g.title}</p>
              <ul className="space-y-0.5">
                {g.items.map((n) => (
                  <li key={n.to}>
                    <NavLink
                      to={n.to}
                      end={n.end}
                      className={({ isActive }) =>
                        `flex min-h-[42px] items-center gap-3 rounded-[11px] px-3 text-sm transition-colors duration-150 ${
                          isActive
                            ? "bg-[var(--slate-tint)] font-semibold text-[var(--slate-deep)]"
                            : "font-medium text-[var(--ink-soft)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
                        }`
                      }
                    >
                      <n.icon size={18} strokeWidth={1.75} />
                      {n.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-[var(--line)] px-5 py-4 text-xs text-[#9aa5b5]">Distribusi alat kesehatan</div>
      </aside>

      {/* Header HP */}
      <header className="sticky top-0 z-30 flex w-full min-w-0 items-center justify-between gap-3 bg-[var(--paper)]/90 px-4 py-3 backdrop-blur-md md:hidden">
        <BrandMark />
        <Link to="/pesanan/baru" className="grid size-11 place-items-center rounded-xl bg-[var(--slate)] text-white" aria-label="Pesanan baru">
          <Plus size={20} strokeWidth={2.2} />
        </Link>
      </header>

      <main className="w-full min-w-0 pb-28 md:pb-12 md:pl-60">
        <div className="mx-auto w-full min-w-0 max-w-[88rem]">
          <Outlet />
        </div>
      </main>

      {/* Bar bawah HP melayang, 3 menu */}
      <nav
        aria-label="Navigasi utama HP"
        className="fixed inset-x-3 z-30 grid grid-cols-3 items-center rounded-3xl border border-[var(--line)] bg-white/95 p-1.5 shadow-[0_10px_30px_-12px_rgba(24,33,47,0.3)] backdrop-blur-md md:hidden"
        style={{ bottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className="flex min-w-0 flex-col items-center gap-0.5 py-1 text-[0.6875rem] font-semibold">
            {({ isActive }) => (
              <>
                <span className={`grid h-8 w-16 place-items-center rounded-full transition-colors ${isActive ? "bg-[var(--slate-tint)] text-[var(--slate-deep)]" : "text-[#9aa5b5]"}`}>
                  <t.icon size={20} strokeWidth={isActive ? 2.1 : 1.75} aria-hidden="true" />
                </span>
                <span className={isActive ? "text-[var(--slate-deep)]" : "text-[#9aa5b5]"}>{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="flex min-w-0 flex-col items-center gap-0.5 py-1 text-[0.6875rem] font-semibold"
        >
          <span className={`grid h-8 w-16 place-items-center rounded-full transition-colors ${!inTabs || menuOpen ? "bg-[var(--slate-tint)] text-[var(--slate-deep)]" : "text-[#9aa5b5]"}`}>
            <LayoutGrid size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className={!inTabs || menuOpen ? "text-[var(--slate-deep)]" : "text-[#9aa5b5]"}>Menu</span>
        </button>
      </nav>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="md:hidden"
          className="bottom-0 left-0 right-0 top-auto z-50 grid h-auto max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-t-3xl rounded-b-none border-x-0 border-b-0 border-t border-[var(--line)] bg-white p-0 shadow-2xl sm:max-w-none md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <DialogHeader className="flex-row items-center justify-between px-5 pb-2 pt-5 text-left">
            <div>
              <DialogTitle className="font-display text-lg font-bold text-[var(--ink)]">Menu</DialogTitle>
              <DialogDescription className="text-xs text-[var(--ink-soft)]">Semua fitur Jena Suite</DialogDescription>
            </div>
            <DialogClose asChild>
              <button type="button" className="btn btn-ghost size-11 min-h-[44px] p-0" aria-label="Tutup menu">
                <X size={18} />
              </button>
            </DialogClose>
          </DialogHeader>
          <nav aria-label="Menu aplikasi" className="space-y-4 px-4 pb-5 pt-2">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <p className="px-1 pb-1.5 text-xs font-medium text-[var(--ink-soft)]">{g.title}</p>
                <div className="grid grid-cols-2 gap-2">
                  {g.items.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.end}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex min-h-[56px] min-w-0 items-center gap-3 rounded-2xl border px-3 text-sm font-semibold transition-colors ${
                          isActive
                            ? "border-[var(--slate)] bg-[var(--slate-tint)] text-[var(--slate-deep)]"
                            : "border-[var(--line)] bg-white text-[var(--ink)] active:bg-[var(--paper-2)]"
                        }`
                      }
                    >
                      <n.icon className="shrink-0" size={18} strokeWidth={1.75} />
                      <span className="min-w-0 truncate">{n.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
}
