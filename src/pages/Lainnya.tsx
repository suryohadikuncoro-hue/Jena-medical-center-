import { Link } from "react-router";
import { Users, Truck, Package, ArrowRight } from "lucide-react";
import { PageHeader, Section } from "@/components/bits";

const MENU = [
  { to: "/pelanggan", label: "Pelanggan", desc: "Kontak, termin pembayaran, alamat", icon: Users, tone: "bg-[#e6f2fc] text-[var(--slate)]" },
  { to: "/supplier", label: "Supplier", desc: "Kontak pemasok barang medis", icon: Truck, tone: "bg-[var(--warn-bg)] text-[var(--warn)]" },
  { to: "/barang", label: "Barang dan harga", desc: "Harga jual, modal terakhir, HPP rata-rata, stok", icon: Package, tone: "bg-[var(--ok-bg)] text-[var(--ok)]" },
];

export default function Lainnya() {
  return (
    <div>
      <PageHeader title="Master Data" sub="Kelola data dasar pelanggan, supplier, dan barang" />
      <Section>
        <div className="divide-y divide-[var(--line)]">
          {MENU.map((m) => (
            <Link key={m.to} to={m.to} className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--slate-hover)]/40 md:px-5">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${m.tone}`} aria-hidden="true">
                <m.icon size={18} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--ink)]">{m.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[var(--ink-soft)]">{m.desc}</span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-[var(--ink-soft)]/60 transition group-hover:translate-x-0.5 group-hover:text-[var(--slate)]" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </Section>
      <p className="px-4 py-6 text-xs leading-relaxed text-[var(--ink-soft)] md:px-8">
        Sistem otomatis: mencatat pembelian dan kewajiban supplier, menghitung modal/HPP sesuai kebijakan rata-rata
        bergerak, mencatat penjualan dan piutang, membentuk jurnal akuntansi, dan memperbarui laporan keuangan.
      </p>
    </div>
  );
}
