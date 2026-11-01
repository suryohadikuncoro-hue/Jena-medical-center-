import { Link, NavLink, Outlet } from "react-router";
import { useState } from "react";
import { Home, ClipboardList, FileText, BarChart3, Menu as MenuIcon, CreditCard, ReceiptText, X, Bell, ChevronDown, UserRound, LogOut } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getSession, signOut } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Beranda", icon: Home, end: true },
  { to: "/pesanan", label: "Pesanan", icon: ClipboardList },
  { to: "/invoice", label: "Invoice", icon: FileText },
  { to: "/faktur", label: "Faktur", icon: ReceiptText },
  { to: "/pembayaran", label: "Pembayaran", icon: CreditCard },
  { to: "/laporan", label: "Laporan", icon: BarChart3 },
  { to: "/lainnya", label: "Master Data", icon: MenuIcon },
];

function HeaderMenus() {
  const email = getSession()?.user?.email?.trim() || "Akun pengguna";
  const words = (email.split("@")[0] ?? email).split(/[._-]+/).filter(Boolean);
  const name = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") || "Akun";
  const initials = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("") || "A";

  async function handleSignOut() {
    await signOut();
    window.location.reload();
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Buka menu notifikasi" className="relative grid size-11 place-items-center rounded-xl text-[var(--ink-soft)] transition hover:bg-[var(--paper-2)] hover:text-[var(--slate-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--slate)]"><Bell size={19} strokeWidth={1.8} aria-hidden="true" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl border-[var(--line)] p-2">
          <DropdownMenuLabel className="px-3 pt-2 font-display text-sm font-semibold text-[var(--ink)]">Pusat tindak lanjut</DropdownMenuLabel>
          <p className="px-3 pb-2 text-xs leading-relaxed text-[var(--ink-soft)]">Buka bagian terkait untuk memeriksa pesanan dan dokumen yang perlu diproses.</p>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="min-h-11 rounded-xl px-3"><Link to="/pesanan"><ClipboardList size={16} />Pesanan</Link></DropdownMenuItem>
          <DropdownMenuItem asChild className="min-h-11 rounded-xl px-3"><Link to="/faktur"><ReceiptText size={16} />Faktur supplier</Link></DropdownMenuItem>
          <DropdownMenuItem asChild className="min-h-11 rounded-xl px-3"><Link to="/invoice"><FileText size={16} />Invoice</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Buka menu profil" className="flex min-h-11 items-center gap-2 rounded-xl px-1.5 text-left transition hover:bg-[var(--paper-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--slate)]">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--slate-hover)] text-xs font-bold text-[var(--slate-deep)]">{initials}</span><span className="max-w-16 truncate text-xs font-semibold text-[var(--ink)]">{name}</span><ChevronDown size={15} className="text-[var(--ink-soft)]" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-2xl border-[var(--line)] p-2">
          <DropdownMenuLabel className="px-3 py-2"><span className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]"><UserRound size={16} />{name}</span><span className="mt-1 block truncate text-xs font-normal text-[var(--ink-soft)]">{email}</span></DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="min-h-11 rounded-xl px-3"><Link to="/lainnya"><MenuIcon size={16} />Pengaturan & data</Link></DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { void handleSignOut(); }} className="min-h-11 rounded-xl px-3 text-[var(--bad)] focus:text-[var(--bad)]"><LogOut size={16} />Keluar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
      <div className="min-h-[100dvh] w-full min-w-0 max-w-full overflow-x-hidden bg-[var(--paper)] text-[var(--ink)]">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-[#21495a] bg-[#153747] text-white md:flex">
        <div className="border-b border-[#21495a] px-5 py-5">
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
                `flex min-h-[48px] items-center gap-3 border-b border-[#21495a] border-l-4 border-l-transparent px-5 text-sm font-medium transition-colors duration-200 ${
                  isActive ? "border-l-[#75d0c0] bg-white/10 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
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
      <header className="sticky top-0 z-30 flex w-full min-w-0 items-center justify-between gap-2 border-b border-[var(--line-strong)] bg-[var(--paper)]/95 px-3 py-2.5 backdrop-blur-sm md:hidden">
        <Link to="/" className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--slate)]" aria-label="Jena Business Suite, beranda">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--slate-hover)] font-display text-sm font-bold text-[var(--slate-deep)]">J</span>
          <span className="min-w-0"><span className="block truncate font-display text-sm font-semibold leading-tight">Jena</span><span className="label-caps block text-[0.58rem]">Business Suite</span></span>
        </Link>
        <div className="flex items-center gap-1"><span className="hidden truncate text-[0.65rem] text-[var(--ink-soft)] sm:block">Jena Medical Center</span><HeaderMenus /></div>
      </header>

      <main className="w-full min-w-0 pb-24 md:pb-10 md:pl-56">
        <div className="mx-auto w-full min-w-0 max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid w-full min-w-0 grid-cols-3 border-t border-[#21495a] bg-[#153747] text-white md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex min-w-0 min-h-[56px] flex-col items-center justify-center gap-1 overflow-hidden text-xs font-semibold uppercase tracking-wide transition-colors duration-200 ${
              isActive ? "bg-white/10 text-[#9ae2d4]" : "text-white/70 hover:bg-white/5 hover:text-white"
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
              isActive ? "bg-white/10 text-[#9ae2d4]" : "text-white/70 hover:bg-white/5 hover:text-white"
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
          className="flex min-w-0 min-h-[56px] flex-col items-center justify-center gap-1 overflow-hidden text-xs font-semibold uppercase tracking-wide text-white/70 transition-colors duration-200 hover:bg-white/5 hover:text-white"
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
                className={({ isActive }) => `flex min-h-[64px] min-w-0 items-center gap-2 border-b border-r border-[var(--line)] px-3 text-[0.8125rem] font-semibold sm:gap-3 sm:px-5 sm:text-sm ${isActive ? "bg-[var(--slate)] text-white" : "hover:bg-[var(--paper-2)]"}`}
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
