import { useMemo, useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { waNumber, rp } from "@/lib/format";
import { PageHeader, Section, Loading, LoadError, Empty, SearchField } from "@/components/bits";
import { ArrowRight, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Pelanggan() {
  const q = trpc.master.customers.useQuery();
  const [selectedCustomer, setSelectedCustomer] = useState<number | "">("");
  const prices = trpc.master.customerPrices.useQuery({ customerId: Number(selectedCustomer) }, { enabled: Boolean(selectedCustomer) });
  const setPrice = trpc.master.setCustomerPrice.useMutation({ onSuccess: () => prices.refetch() });
  const create = trpc.master.createCustomer.useMutation({ onSuccess: () => { q.refetch(); reset(); } });
  const update = trpc.master.updateCustomer.useMutation({ onSuccess: () => { q.refetch(); reset(); } });
  const remove = trpc.master.deleteCustomer.useMutation({ onSuccess: () => q.refetch() });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [termDays, setTermDays] = useState(30);
  const [search, setSearch] = useState("");
  const reset = () => { setEditingId(null); setName(""); setPhone(""); setAddress(""); setTermDays(30); };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = q.data ?? [];
    if (!term) return rows;
    return rows.filter((c) => [c.name, c.code, c.phone ?? "", c.address ?? ""].some((v) => v.toLowerCase().includes(term)));
  }, [q.data, search]);

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  return (
    <div>
      <PageHeader
        title="Pelanggan"
        sub={`${q.data.length} pelanggan terdaftar`}
        action={<a href="#form-pelanggan" className="btn min-h-11 px-3 text-xs"><Plus size={15} aria-hidden="true" /> Tambah</a>}
      />

      <div className="px-4 pb-3 md:px-8">
        <SearchField value={search} onChange={setSearch} placeholder="Cari nama, kode, atau telepon" label="Cari pelanggan" />
      </div>

      <Section title="Daftar pelanggan" note={`${filtered.length} dari ${q.data.length} pelanggan`}>
        {filtered.length === 0 ? (
          <Empty text={search ? "Tidak ada pelanggan yang cocok." : "Belum ada pelanggan."} />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {filtered.map((c) => {
              const wa = waNumber(c.phone);
              return (
                <div key={c.id} className="flex items-center gap-1 px-2 py-2 md:px-3">
                  <Link to={`/pelanggan/${c.id}`} className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[var(--slate-hover)]/40">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e6f2fc] font-display text-xs font-bold text-[var(--slate-deep)]" aria-hidden="true">
                      {initials(c.name) || "?"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--ink)]">{c.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--ink-soft)]">{c.code} · termin {c.termDays} hari{c.address ? ` · ${c.address}` : ""}</span>
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-[var(--ink-soft)]/60 transition group-hover:translate-x-0.5 group-hover:text-[var(--slate)]" aria-hidden="true" />
                  </Link>
                  <div className="flex shrink-0 items-center">
                    {wa && (
                      <a className="grid size-9 place-items-center rounded-lg text-[var(--slate)] transition-colors hover:bg-[var(--slate-hover)]" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${c.name}`}>
                        <MessageCircle size={16} aria-hidden="true" />
                      </a>
                    )}
                    <button className="grid size-9 place-items-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-[var(--slate-hover)] hover:text-[var(--slate)]" aria-label={`Edit ${c.name}`} onClick={() => { setEditingId(c.id); setName(c.name); setPhone(c.phone ?? ""); setAddress(c.address ?? ""); setTermDays(c.termDays); document.getElementById("form-pelanggan")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button className="grid size-9 place-items-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-[var(--bad-bg)] hover:text-[var(--bad)]" aria-label={`Hapus ${c.name}`} disabled={remove.isPending} onClick={() => { if (confirm("Hapus pelanggan ini? Data yang sudah dipakai pesanan tidak dapat dihapus.")) remove.mutate({ id: c.id }); }}>
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <div id="form-pelanggan" className="scroll-mt-4">
        <Section title={editingId ? "Edit pelanggan" : "Tambah pelanggan"}>
          <div className="px-4 py-4 md:px-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div><label className="label-caps block" htmlFor="customer-name">Nama pelanggan</label><input id="customer-name" className="input mt-1" placeholder="Nama klinik / pelanggan" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><label className="label-caps block" htmlFor="customer-phone">Nomor WhatsApp</label><input id="customer-phone" className="input mt-1" placeholder="Nomor WhatsApp (08…)" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><label className="label-caps block" htmlFor="customer-address">Alamat</label><input id="customer-address" className="input mt-1" placeholder="Alamat" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              <div><label className="label-caps block" htmlFor="customer-terms">Termin pembayaran (hari)</label><input id="customer-terms" className="input mt-1" type="number" min={0} value={termDays} onChange={(e) => setTermDays(Math.max(0, Number(e.target.value) || 0))} /></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn flex-1 sm:flex-none"
                disabled={!name || create.isPending || update.isPending}
                onClick={() => editingId
                  ? update.mutate({ id: editingId, name, phone: phone || undefined, address: address || undefined, termDays })
                  : create.mutate({ name, phone: phone || undefined, address: address || undefined, termDays })}
              >
                {editingId ? "Simpan perubahan" : "Simpan pelanggan"}
              </button>
              {editingId && <button className="btn btn-ghost flex-1 sm:flex-none" type="button" onClick={reset}>Batal</button>}
            </div>
          </div>
        </Section>
      </div>

      <Section title="Harga khusus pelanggan" note="Atur harga jual berbeda untuk setiap pelanggan. Margin dihitung terhadap modal terakhir.">
        <div className="px-4 py-4 md:px-5">
          <label className="label-caps block" htmlFor="special-price-customer">Pelanggan</label>
          <select id="special-price-customer" className="select mt-1 max-w-md" value={selectedCustomer} onChange={(e) => setSelectedCustomer(Number(e.target.value) || "")}>
            <option value="">Pilih pelanggan…</option>
            {q.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {selectedCustomer && prices.isLoading && <p className="mt-4 text-sm text-[var(--ink-soft)]" role="status">Memuat daftar harga…</p>}
          {selectedCustomer && prices.error && (
            <div className="mt-4 flex flex-wrap items-center gap-3" role="alert">
              <p className="text-sm text-[var(--bad)]">Harga khusus gagal dimuat: {prices.error.message}</p>
              <button className="btn btn-ghost min-h-10 px-3 text-xs" type="button" onClick={() => void prices.refetch()}>Coba lagi</button>
            </div>
          )}
          {selectedCustomer && prices.data && (prices.data.length === 0 ? <Empty text="Belum ada produk yang dapat diatur harga khususnya." /> : (
            <div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {prices.data.map((p) => (
                <PriceRow key={p.productId} product={p} pending={setPrice.isPending} onSave={(price) => setPrice.mutate({ customerId: Number(selectedCustomer), productId: p.productId, price })} />
              ))}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function PriceRow({ product, pending, onSave }: { product: { productId: number; productName: string; unit: string; basePrice: number; lastCost: number; price: number; isSpecial: boolean; marginPct: number }; pending: boolean; onSave: (price: number) => void }) {
  const [price, setPrice] = useState(product.price);
  const margin = price > 0 ? Math.round(((price - product.lastCost) / price) * 100) : 0;
  return (
    <div className="grid grid-cols-1 items-center gap-2 py-3 md:grid-cols-[1fr_150px_120px_auto]">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-[var(--ink)]">{product.productName}</div>
        <div className="text-xs text-[var(--ink-soft)]">Standar {rp(product.basePrice)} · modal {rp(product.lastCost)} · {product.unit}</div>
      </div>
      <div>
        <label className="sr-only" htmlFor={`special-price-${product.productId}`}>Harga khusus untuk {product.productName} (Rp)</label>
        <input id={`special-price-${product.productId}`} className="input" type="number" min={0} value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} />
      </div>
      <span className={`text-sm font-semibold ${margin < 0 ? "text-[var(--bad)]" : "text-[var(--ok)]"}`}>Margin {margin}%</span>
      <button className="btn btn-ghost min-h-10 px-3 text-xs" disabled={pending} onClick={() => onSave(price)}>{product.isSpecial ? "Update harga" : "Simpan harga"}</button>
    </div>
  );
}
