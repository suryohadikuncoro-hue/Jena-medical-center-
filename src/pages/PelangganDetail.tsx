import { Link, useParams } from "react-router";
import { ArrowRight, MapPin, MessageCircle, Phone, Tag, Timer } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { rp, tanggal, waNumber } from "@/lib/format";
import { PageHeader, Section, StatusBadge, Loading, LoadError, Empty, Metric } from "@/components/bits";

export default function PelangganDetail() {
  const { id } = useParams();
  const customerId = Number(id);
  const customers = trpc.master.customers.useQuery();
  const orders = trpc.orders.list.useQuery();
  const prices = trpc.master.customerPrices.useQuery({ customerId }, { enabled: Number.isFinite(customerId) && customerId > 0 });

  if (customers.isLoading) return <Loading />;
  if (customers.error || !customers.data) return <LoadError message={customers.error?.message} retry={() => customers.refetch()} />;

  const customer = customers.data.find((c) => c.id === customerId);
  if (!customer) return <LoadError message="Pelanggan tidak ditemukan." />;

  const wa = waNumber(customer.phone);
  const riwayat = (orders.data ?? []).filter((o) => o.customerId === customerId);
  const nilaiPesanan = riwayat.reduce((s, o) => s + o.total, 0);
  const berjalan = riwayat.filter((o) => o.status !== "closed").length;
  const hargaKhusus = (prices.data ?? []).filter((p) => p.isSpecial);

  return (
    <div>
      <PageHeader
        title={customer.name}
        sub={`${customer.code} · pelanggan sejak dokumen pertama`}
        back="/pelanggan"
        backLabel="Daftar pelanggan"
        action={
          wa ? (
            <a className="btn min-h-11 px-3 text-xs" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
              <MessageCircle size={15} aria-hidden="true" /> WhatsApp
            </a>
          ) : undefined
        }
      />

      <Section title="Informasi pelanggan">
        <div className="divide-y divide-[var(--line)]">
          <div className="flex items-start gap-3 px-4 py-3 md:px-5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e6f2fc] text-[var(--slate)]" aria-hidden="true"><Phone size={15} /></span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Telepon</p>
              <p className="mt-0.5 break-words text-sm font-semibold text-[var(--ink)]">{customer.phone || "Belum diisi"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3 md:px-5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--slate-hover)] text-[var(--slate)]" aria-hidden="true"><MapPin size={15} /></span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Alamat</p>
              <p className="mt-0.5 break-words text-sm font-semibold text-[var(--ink)]">{customer.address || "Belum diisi"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3 md:px-5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--warn-bg)] text-[var(--warn)]" aria-hidden="true"><Timer size={15} /></span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Termin pembayaran</p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">{customer.termDays} hari</p>
            </div>
          </div>
        </div>
      </Section>

      <section className="mx-4 my-3 grid grid-cols-3 gap-2.5 md:mx-8" aria-label="Ringkasan pelanggan">
        <Metric label="Pesanan" value={riwayat.length} hint="Total dokumen" />
        <Metric label="Nilai" value={rp(nilaiPesanan)} hint="Semua pesanan" tone="green" />
        <Metric label="Berjalan" value={berjalan} hint="Belum selesai" tone="amber" />
      </section>

      <Section title="Riwayat pesanan" note="Pesanan terbaru pelanggan ini" action={<Link to="/pesanan/baru" className="text-xs font-semibold text-[var(--slate)]">Pesanan baru</Link>}>
        {orders.isLoading ? (
          <p className="px-4 py-4 text-sm text-[var(--ink-soft)] md:px-5" role="status">Memuat pesanan…</p>
        ) : riwayat.length === 0 ? (
          <Empty text="Belum ada pesanan untuk pelanggan ini." />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {riwayat.map((o) => (
              <Link key={o.id} to={`/pesanan/${o.id}`} className="group flex items-start justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-[var(--slate-hover)]/40 md:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[0.8125rem] font-bold text-[var(--ink)]">{o.number}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--ink-soft)]">{tanggal(o.orderDate)} · {o.itemCount} barang</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="font-display text-sm font-bold tabular-nums text-[var(--ink)]">{rp(o.total)}</span>
                  <ArrowRight size={14} className="text-[var(--ink-soft)]/60 transition group-hover:translate-x-0.5 group-hover:text-[var(--slate)]" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="Harga khusus" note="Harga jual yang berbeda dari harga standar">
        {prices.isLoading ? (
          <p className="px-4 py-4 text-sm text-[var(--ink-soft)] md:px-5" role="status">Memuat harga…</p>
        ) : prices.error ? (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5" role="alert">
            <p className="text-sm text-[var(--bad)]">Harga gagal dimuat: {prices.error.message}</p>
            <button className="btn btn-ghost min-h-9 px-3 text-xs" type="button" onClick={() => void prices.refetch()}>Coba lagi</button>
          </div>
        ) : hargaKhusus.length === 0 ? (
          <Empty text="Belum ada harga khusus. Semua barang memakai harga standar." />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {hargaKhusus.map((p) => (
              <div key={p.productId} className="flex items-start justify-between gap-4 px-4 py-3 md:px-5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--ok-bg)] text-[var(--ok)]" aria-hidden="true"><Tag size={15} /></span>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-[var(--ink)]">{p.productName}</p>
                    <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Standar {rp(p.basePrice)} · margin {p.marginPct}%</p>
                  </div>
                </div>
                <span className="shrink-0 font-display text-sm font-bold tabular-nums text-[var(--ink)]">{rp(p.price)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-[var(--line)] px-4 py-3 md:px-5">
          <Link to="/pelanggan" className="text-xs font-semibold text-[var(--slate)] hover:text-[var(--slate-deep)]">Atur harga khusus</Link>
        </div>
      </Section>
    </div>
  );
}
