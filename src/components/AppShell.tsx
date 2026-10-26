import { NavLink, Outlet } from "react-router";
import { useState } from "react";
import { Home, ClipboardList, FileText, BarChart3, Menu as MenuIcon, CreditCard, ReceiptText, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
      <div className="min-h-[100dvh] w-full min-w-0 max-w-full overflow-x-clip bg-[var(--paper)] text-[var(--ink)]">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-[#30394d] bg-[#1d2638] text-white md:flex">
        <div className="border-b border-[#30394d] px-5 py-5">
          <div className="font-display text-lg font-semibold leading-tight">Jena</div>
          <div className="label-caps mt-1 text-white/60">Business Suite</div>
        </div>
        <nav className="flex-1 py-2">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex min-h-[48px] items-center gap-3 border-b border-[#30394d] border-l-4 border-l-transparent px-5 text-sm font-medium transition-colors duration-200 ${
                  isActive ? "border-l-[#a6d8ca] bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <n.icon size={16} strokeWidth={1.75} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 text-xs text-white/55">Jena Medical Center</div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex w-full min-w-0 items-center justify-between border-b border-[var(--line-strong)] bg-[var(--paper)]/95 px-4 py-3 backdrop-blur-sm md:hidden">
        <div>
          <div className="font-display text-base font-semibold leading-tight">Jena</div>
          <div className="label-caps">Business Suite</div>
        </div>
        <div className="text-xs text-[var(--ink-soft)]">Jena Medical Center</div>
      </header>

      <main className="w-full min-w-0 pb-24 md:pb-10 md:pl-56">
        <div className="mx-auto w-full min-w-0 max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-[#30394d] bg-[#1d2638] text-white md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors duration-200 ${
              isActive ? "bg-white/10 text-[#b8e6da]" : "text-white/65 hover:bg-white/5 hover:text-white"
            }`
          }
        >
          <Home size={18} strokeWidth={1.75} />
          Dashboard
        </NavLink>
        <NavLink
          to="/laporan"
          className={({ isActive }) =>
            `flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors duration-200 ${
              isActive ? "bg-white/10 text-[#b8e6da]" : "text-white/65 hover:bg-white/5 hover:text-white"
            }`
          }
        >
          <BarChart3 size={18} strokeWidth={1.75} />
          Laporan
        </NavLink>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wide text-white/65 transition-colors duration-200 hover:bg-white/5 hover:text-white"
        >
          <MenuIcon size={18} strokeWidth={1.75} />
          Menu
        </button>
      </nav>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="md:hidden"
          className="bottom-0 left-0 right-0 top-auto z-50 grid h-auto max-h-[80dvh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-t-xl rounded-b-none border-x-0 border-b-0 border-t border-[var(--line-strong)] bg-[var(--paper)] p-0 shadow-2xl sm:max-w-none md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <DialogHeader className="flex-row items-center justify-between border-b border-[var(--line-strong)] px-5 py-4 text-left">
            <div>
              <DialogTitle className="font-display text-lg font-semibold">Menu</DialogTitle>
              <DialogDescription className="text-xs text-[var(--ink-soft)]">Pilih fitur yang ingin dibuka</DialogDescription>
            </div>
            <DialogClose asChild>
              <button type="button" className="btn btn-ghost size-11 min-h-[44px] p-0" aria-label="Tutup menu"><X size={18} /></button>
            </DialogClose>
          </DialogHeader>
          <nav className="grid grid-cols-2" aria-label="Menu aplikasi">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setMenuOpen(false)}
                aria-label={n.label}
                className={({ isActive }) => `flex min-h-[64px] min-w-0 items-center gap-2 border-b border-r border-[var(--line)] px-3 text-[0.8125rem] font-semibold sm:gap-3 sm:px-5 sm:text-sm ${isActive ? "bg-[var(--ink)] text-[var(--paper)]" : "hover:bg-[var(--paper-2)]"}`}
              >
                <n.icon className="shrink-0" size={18} strokeWidth={1.75} />
                <span className="min-w-0 truncate">{n.label}</span>
              </NavLink>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
}
