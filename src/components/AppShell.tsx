import { NavLink, Outlet, useLocation } from "react-router";
import { useState } from "react";
import { Home, ClipboardList, FileText, BarChart3, Menu as MenuIcon, CreditCard, ReceiptText, X, Bell, ChevronDown, Users, Truck, Package } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSession } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Beranda", icon: Home, end: true },
  { to: "/pesanan", label: "Pesanan", icon: ClipboardList },
  { to: "/invoice", label: "Invoice", icon: FileText },
  { to: "/faktur", label: "Faktur", icon: ReceiptText },
  { to: "/pembayaran", label: "Pembayaran", icon: CreditCard },
  { to: "/laporan", label: "Laporan", icon: BarChart3 },
  { to: "/lainnya", label: "Master Data", icon: MenuIcon },
];

const MASTER = [
  { to: "/pelanggan", label: "Pelanggan", icon: Users },
  { to: "/supplier", label: "Supplier", icon: Truck },
  { to: "/barang", label: "Barang", icon: Package },
];

function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`relative grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#19b5c4] to-[#0b7fc4] text-white ${className}`} aria-hidden="true">
      <span className="absolute h-4 w-1 rounded-full bg-white" />
      <span className="absolute h-1 w-4 rounded-full bg-white" />
    </span>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0b7fc4] text-[0.7rem] font-bold text-white" aria-hidden="true">
      {initials}
    </span>
  );
}

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const session = getSession();
  const email = session?.user?.email ?? "";
  const initials = (email.slice(0, 2).toUpperCase() || "AD");
  const displayName = email ? email.split("@")[0] : "Admin";

  const menuActive = ["/lainnya", "/pelanggan", "/supplier", "/barang"].some((p) => pathname.startsWith(p));

  return (
    <div className="min-h-[100dvh] w-full min-w-0 max-w-full overflow-x-hidden bg-[var(--paper)] text-[var(--ink)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--line)] bg-white md:flex">
        <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-5 py-4">
          <Logo />
          <div className="min-w-0">
            <div className="font-display text-base font-bold leading-tight text-[var(--ink)]">Jena</div>
            <div className="label-caps text-[0.6rem] text-[var(--slate)]">Business Suite</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors duration-150 ${
                  isActive ? "bg-[var(--slate-hover)] text-[var(--slate-deep)]" : "text-[var(--ink-soft)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
                }`
              }
            >
              <n.icon size={17} strokeWidth={2} aria-hidden="true" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[var(--line)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Avatar initials={initials} />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold capitalize text-[var(--ink)]">{displayName}</div>
              <div className="truncate text-[0.65rem] text-[var(--ink-soft)]">Jena Medical Center</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo />
            <div className="min-w-0">
              <div className="font-display text-sm font-bold leading-tight text-[var(--ink)]">JENA</div>
              <div className="text-[0.55rem] font-semibold uppercase leading-tight tracking-[0.14em] text-[var(--ink-soft)]">Business Suite</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <NavLink
              to="/faktur"
              aria-label="Notifikasi dokumen"
              className="relative grid size-9 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--ink-soft)] transition-colors hover:bg-[var(--slate-hover)] hover:text-[var(--slate)]"
            >
              <Bell size={17} aria-hidden="true" />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#e5484d] ring-2 ring-white" aria-hidden="true" />
            </NavLink>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              className="flex min-h-9 items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 transition-colors hover:bg-[var(--paper)]"
            >
              <Avatar initials={initials} />
              <span className="max-w-[5.5rem] truncate text-xs font-semibold capitalize text-[var(--ink)]">{displayName}</span>
              <ChevronDown size={14} className="shrink-0 text-[var(--ink-soft)]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full min-w-0 pb-24 md:pb-10 md:pl-60">
        <div className="mx-auto w-full min-w-0 max-w-5xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] border-t border-[var(--line)] bg-white shadow-[0_-6px_20px_-18px_rgba(16,42,67,0.5)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigasi utama"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 text-[0.65rem] font-semibold transition-colors ${
              isActive ? "text-[var(--slate)]" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
            }`
          }
        >
          <Home size={19} strokeWidth={2} aria-hidden="true" />
          Dashboard
        </NavLink>
        <NavLink
          to="/laporan"
          className={({ isActive }) =>
            `flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 text-[0.65rem] font-semibold transition-colors ${
              isActive ? "text-[var(--slate)]" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
            }`
          }
        >
          <BarChart3 size={19} strokeWidth={2} aria-hidden="true" />
          Laporan
        </NavLink>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 text-[0.65rem] font-semibold transition-colors ${
            menuActive ? "text-[var(--slate)]" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
          }`}
        >
          <MenuIcon size={19} strokeWidth={2} aria-hidden="true" />
          Menu
        </button>
      </nav>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="md:hidden"
          className="bottom-0 left-0 right-0 top-auto z-50 grid h-auto max-h-[82dvh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-t-2xl rounded-b-none border-x-0 border-b-0 border-t border-[var(--line)] bg-white p-0 shadow-2xl sm:max-w-none md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <DialogHeader className="flex-row items-center justify-between border-b border-[var(--line)] px-5 py-4 text-left">
            <div>
              <DialogTitle className="font-display text-base font-bold text-[var(--ink)]">Menu</DialogTitle>
              <DialogDescription className="text-xs text-[var(--ink-soft)]">Pilih fitur yang ingin dibuka</DialogDescription>
            </div>
            <DialogClose asChild>
              <button type="button" className="grid size-10 place-items-center rounded-full bg-[var(--paper)] text-[var(--ink-soft)]" aria-label="Tutup menu"><X size={18} /></button>
            </DialogClose>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 px-4 pt-4" aria-label="Menu aplikasi">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2 text-center text-[0.7rem] font-semibold transition-colors ${
                    isActive
                      ? "border-[var(--slate)] bg-[var(--slate-hover)] text-[var(--slate-deep)]"
                      : "border-[var(--line)] bg-white text-[var(--ink-soft)] hover:bg-[var(--paper)]"
                  }`
                }
              >
                <n.icon size={19} strokeWidth={2} aria-hidden="true" />
                <span className="min-w-0 leading-tight">{n.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="mt-4 border-t border-[var(--line)] px-4 py-3">
            <p className="label-caps mb-2">Data master</p>
            <div className="divide-y divide-[var(--line)]">
              {MASTER.map((m) => (
                <NavLink
                  key={m.to}
                  to={m.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-[var(--ink)]"
                >
                  <m.icon size={16} className="text-[var(--slate)]" aria-hidden="true" />
                  {m.label}
                </NavLink>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
