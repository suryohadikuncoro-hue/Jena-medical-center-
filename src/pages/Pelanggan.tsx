import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { waNumber, rp } from "@/lib/format";
import { PageHeader, Section, Loading, LoadError, Empty } from "@/components/bits";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";

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
  const reset = () => { setEditingId(null); setName(""); setPhone(""); setAddress(""); setTermDays(30); };

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  return (
    <div>
      <PageHeader title="Pelanggan" sub={`${q.data.length} pelanggan terdaftar`} />
      <Section title={editingId ? "Edit pelanggan" : "Tambah pelanggan"}>
        <div className="border-b border-[var(--line)] px-4 py-4 md:px-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className="input" placeholder="Nama klinik / pelanggan" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="Nomor WhatsApp (08…)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="input" placeholder="Alamat" value={address} onChange={(e) => setAddress(e.target.value)} />
            <input className="input" type="number" min={0} placeholder="Termin (hari)" value={termDays} onChange={(e) => setTermDays(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <button
            className="btn mt-3"
            disabled={!name || create.isPending}
            onClick={() => editingId
              ? update.mutate({ id: editingId, name, phone: phone || undefined, address: address || undefined, termDays })
              : create.mutate({ name, phone: phone || undefined, address: address || undefined, termDays })}
          >
            {editingId ? "Simpan perubahan" : "Simpan pelanggan"}
          </button>
          {editingId && <button className="btn btn-ghost mt-3 ml-2" onClick={reset}>Batal</button>}
        </div>
      </Section>
      <Section>
        {q.data.length === 0 ? <Empty text="Belum ada pelanggan." /> : (
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {q.data.map((c) => {
              const wa = waNumber(c.phone);
              return (
                <div key={c.id} className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
                  <div>
                    <div className="text-sm font-semibold">{c.name}</div>
                    <div className="text-xs text-[var(--ink-soft)]">
                      {c.code} · termin {c.termDays} hari{c.address ? ` · ${c.address}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {wa && <a className="btn btn-ghost !min-h-[40px] px-3 text-xs" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>}
                    <button className="btn btn-ghost !min-h-[40px] px-3 text-xs" onClick={() => { setEditingId(c.id); setName(c.name); setPhone(c.phone ?? ""); setAddress(c.address ?? ""); setTermDays(c.termDays); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil size={14} /> Edit</button>
                    <button className="btn btn-ghost !min-h-[40px] px-3 text-xs text-[var(--bad)]" disabled={remove.isPending} onClick={() => { if (confirm("Hapus pelanggan ini? Data yang sudah dipakai pesanan tidak dapat dihapus.")) remove.mutate({ id: c.id }); }}><Trash2 size={14} /> Hapus</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
      <Section title="Harga khusus pelanggan" note="Atur harga jual berbeda untuk setiap pelanggan. Margin dihitung terhadap modal terakhir.">
        <div className="border-b border-[var(--line)] px-4 py-4 md:px-8">
          <select className="select max-w-md" value={selectedCustomer} onChange={(e) => setSelectedCustomer(Number(e.target.value) || "")}>
            <option value="">Pilih pelanggan…</option>
            {q.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {selectedCustomer && prices.data && (
            <div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {prices.data.map((p) => (
                <PriceRow key={p.productId} product={p} pending={setPrice.isPending} onSave={(price) => setPrice.mutate({ customerId: Number(selectedCustomer), productId: p.productId, price })} />
              ))}
            </div>
          )}
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
      <div>
        <div className="text-sm font-semibold">{product.productName}</div>
        <div className="text-xs text-[var(--ink-soft)]">Standar {rp(product.basePrice)} · modal {rp(product.lastCost)} · {product.unit}</div>
      </div>
      <input className="input" type="number" min={0} value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} />
      <span className={`text-sm font-semibold ${margin < 0 ? "text-[var(--bad)]" : "text-[var(--ok)]"}`}>Margin {margin}%</span>
      <button className="btn btn-ghost !min-h-[40px] px-3 text-xs" disabled={pending} onClick={() => onSave(price)}>{product.isSpecial ? "Update harga" : "Simpan harga"}</button>
    </div>
  );
}
