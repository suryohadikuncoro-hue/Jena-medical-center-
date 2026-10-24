import { Link } from "react-router";
import { Users, Truck, Package, CreditCard, ReceiptText, ArrowRight } from "lucide-react";
import { PageHeader, Section } from "@/components/bits";

const MENU = [
  { to: "/pelanggan", label: "Pelanggan", desc: "Kontak, termin pembayaran, alamat", icon: Users },
  { to: "/supplier", label: "Supplier", desc: "Kontak pemasok barang medis", icon: Truck },
  { to: "/barang", label: "Barang dan harga", desc: "Harga jual, modal terakhir, HPP rata-rata, stok", icon: Package },
  { to: "/pembayaran", label: "Pembayaran", desc: "Terima tagihan pelanggan, bayar faktur supplier", icon: CreditCard },
  { to: "/faktur", label: "Faktur supplier", desc: "Cek selisih, bukukan jadi hutang", icon: ReceiptText },
];

export default function Lainnya() {
  return (
    <div>
      <PageHeader title="Menu" sub="Menu pendukung Jena Business Suite" />
      <Section>
        <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
          {MENU.map((m) => (
            <Link key={m.to} to={m.to} className="flex items-center justify-between gap-4 px-4 py-4 transition-colors duration-200 hover:bg-[var(--paper-2)] md:px-8">
              <div className="flex items-center gap-4">
                <m.icon size={20} strokeWidth={1.5} className="text-[var(--slate-deep)]" />
                <div>
                  <div className="text-sm font-semibold">{m.label}</div>
                  <div className="text-xs text-[var(--ink-soft)]">{m.desc}</div>
                </div>
              </div>
              <ArrowRight size={16} className="text-[var(--ink-soft)]" />
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
