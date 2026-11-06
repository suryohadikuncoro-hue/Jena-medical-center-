import { Link } from "react-router";
import { ChevronRight, Package, Truck, Users } from "lucide-react";
import { PageHeader, Section } from "@/components/bits";

const MENU = [
  { to: "/pelanggan", label: "Pelanggan", desc: "Kontak, termin pembayaran, alamat", icon: Users },
  { to: "/supplier", label: "Supplier", desc: "Kontak pemasok barang medis", icon: Truck },
  { to: "/barang", label: "Barang dan harga", desc: "Harga jual, modal terakhir, HPP rata-rata, stok", icon: Package },
];

export default function Lainnya() {
  return (
    <div>
      <PageHeader title="Master data" sub="Kelola data dasar pelanggan, supplier, dan barang." />
      <Section>
        <div className="divide-y divide-[var(--line)]">
          {MENU.map((m) => (
            <Link key={m.to} to={m.to} className="group flex items-center justify-between gap-4 px-4 py-4 transition-colors duration-150 hover:bg-[var(--slate-tint)] md:px-6">
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--slate-tint)] text-[var(--slate-deep)]">
                  <m.icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--navy)]">{m.label}</div>
                  <div className="text-xs text-[var(--ink-soft)]">{m.desc}</div>
                </div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-[#a0a7b5] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </Section>
      <p className="px-4 py-5 text-xs leading-relaxed text-[var(--ink-soft)] md:px-8">
        Sistem mencatat pembelian dan kewajiban supplier, menghitung modal dan HPP dengan rata-rata bergerak, mencatat penjualan dan piutang, lalu membentuk jurnal dan laporan keuangan secara otomatis.
      </p>
    </div>
  );
}
