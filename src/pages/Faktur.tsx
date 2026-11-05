import { useState } from "react";
import { AlertTriangle, ChevronRight, Pencil, Trash2, X, Plus, Save } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { rp, tanggal } from "@/lib/format";
import { PageHeader, Section, StatusBadge, Loading, LoadError, Empty } from "@/components/bits";

type ItemDraft = { productId: number; qty: number; unitCost: number; discountPercent: number; ppnPercent: number };
type Detail = {
  id:number; number:string; supplierId:number; supplierName:string; poId:number|null; invoiceDate:string; dueDate:string|null;
  printedTotal:number; taxInvoiceComplete:boolean; status:string; computedTotal:number; selisih:number;
  items:{id:number;productId:number;productName:string;sku:string;unit:string;qty:number;unitCost:number;discountPercent:number;ppnPercent:number}[];
};
const today = () => new Date().toISOString().slice(0,10);

export default function Faktur() {
  const q = trpc.orders.supplierInvoices.useQuery(undefined, { refetchOnMount: "always" });
  const post = trpc.orders.postSupplierInvoice.useMutation({ onSuccess: () => q.refetch() });
  const [selected, setSelected] = useState<number|null>(null);
  const detail = trpc.orders.supplierInvoiceDetail.useQuery({id:selected ?? 0},{enabled:selected !== null});
  const products = trpc.master.products.useQuery();
  const [editing,setEditing]=useState(false);
  const [number,setNumber]=useState("");
  const [invoiceDate,setInvoiceDate]=useState(today());
  const [dueDate,setDueDate]=useState("");
  const [printedTotal,setPrintedTotal]=useState("0");
  const [taxInvoiceComplete,setTaxInvoiceComplete]=useState(false);
  const [items,setItems]=useState<ItemDraft[]>([]);
  const save=trpc.orders.updateSupplierInvoiceDraft.useMutation({onSuccess:async()=>{await q.refetch();await detail.refetch();setEditing(false)}});
  const remove=trpc.orders.deleteSupplierInvoiceDraft.useMutation({onSuccess:async()=>{setSelected(null);await q.refetch()}});
  const d=detail.data as Detail|undefined;
  const startEdit=()=>{if(!d)return;setNumber(d.number);setInvoiceDate(d.invoiceDate);setDueDate(d.dueDate??"");setPrintedTotal(String(d.printedTotal));setTaxInvoiceComplete(d.taxInvoiceComplete);setItems(d.items.map(i=>({productId:i.productId,qty:i.qty,unitCost:i.unitCost,discountPercent:i.discountPercent,ppnPercent:i.ppnPercent})));setEditing(true)};
  const total=items.reduce((s,i)=>{const net=i.qty*i.unitCost-Math.round(i.qty*i.unitCost*i.discountPercent/100);return s+net+Math.round(net*i.ppnPercent/100)},0);
  const addItem=()=>setItems(v=>[...v,{productId:products.data?.[0]?.id??0,qty:1,unitCost:0,discountPercent:0,ppnPercent:0}]);
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  return <div>
    <PageHeader title="Faktur supplier" sub="Draf belum menjadi hutang; bukukan setelah isi faktur dicek" />
    <Section>
      {q.data.length===0?<Empty text="Belum ada faktur supplier tercatat."/>:
      <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
      {q.data.map(f=><button type="button" key={f.id} onClick={()=>{setSelected(f.id);setEditing(false)}} className="block w-full px-4 py-4 text-left transition hover:bg-[var(--surface-soft)] md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><div>
          <div className="flex flex-wrap items-center gap-2"><span className="font-display text-base font-semibold">Faktur {f.number}</span><StatusBadge status={f.status}/>{!f.taxInvoiceComplete&&f.status!=="draft"&&<span className="badge bg-[#fff3d6] text-[var(--warn)]">Pajak belum lengkap</span>}</div>
          <div className="mt-1 text-sm text-[var(--ink-soft)]">{f.supplierName} · {tanggal(f.invoiceDate)}{f.dueDate? ` · tempo ${tanggal(f.dueDate)}`:""}</div>
        </div><div className="flex items-center gap-3"><div className="text-right"><div className="font-display text-base font-semibold">{rp(f.printedTotal)}</div><div className="text-xs text-[var(--ink-soft)]">nilai tercetak</div></div><ChevronRight size={18}/></div></div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"><span className="text-[var(--ink-soft)]">Hitungan sistem: {rp(f.computedTotal)}</span>{f.selisih!==0&&<span className="inline-flex items-center gap-1 font-semibold text-[var(--bad)]"><AlertTriangle size={12}/>Tercetak {f.selisih>0?"lebih tinggi":"lebih rendah"} {rp(Math.abs(f.selisih))}</span>}{f.status!=="draft"&&f.remaining>0&&<span className="text-[var(--ink-soft)]">Sisa hutang {rp(f.remaining)}</span>}</div>
      </button>)}</div>}
    </Section>
    <p className="px-4 py-4 text-xs text-[var(--ink-soft)] md:px-8">Faktur dengan selisih tidak bisa dibukukan — perbaiki jumlah barang atau total tercetak agar hutang sesuai dokumen.</p>

    {selected!==null&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4" onClick={()=>setSelected(null)}>
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xl md:rounded-2xl md:p-6" onClick={e=>e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Detail faktur {d?.number??""}</h2><button className="btn btn-ghost !min-h-10" onClick={()=>setSelected(null)} aria-label="Tutup"><X/></button></div>
      {detail.isLoading?<Loading/>:detail.error?<LoadError message={detail.error.message} retry={()=>detail.refetch()}/>:d&&<>
      {!editing?<><div className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-soft)] p-3 text-sm md:grid-cols-3"><div><span className="text-[var(--ink-soft)]">Supplier</span><p className="font-semibold">{d.supplierName}</p></div><div><span className="text-[var(--ink-soft)]">Tanggal faktur</span><p className="font-semibold">{tanggal(d.invoiceDate)}</p></div><div><span className="text-[var(--ink-soft)]">Jatuh tempo</span><p className="font-semibold">{d.dueDate?tanggal(d.dueDate):"—"}</p></div><div><span className="text-[var(--ink-soft)]">Status</span><p><StatusBadge status={d.status}/></p></div><div><span className="text-[var(--ink-soft)]">Pajak lengkap</span><p className="font-semibold">{d.taxInvoiceComplete?"Ya":"Tidak"}</p></div></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead><tr className="border-b text-left text-[var(--ink-soft)]"><th className="py-2">Barang</th><th>Qty</th><th>Harga</th><th>Diskon</th><th>PPN</th><th className="text-right">Total</th></tr></thead><tbody>{d.items.map(i=>{const net=i.qty*i.unitCost-Math.round(i.qty*i.unitCost*i.discountPercent/100);return <tr key={i.id} className="border-b border-[var(--line)]"><td className="py-3">{i.productName}<div className="text-xs text-[var(--ink-soft)]">{i.sku}</div></td><td>{i.qty} {i.unit}</td><td>{rp(i.unitCost)}</td><td>{i.discountPercent}%</td><td>{i.ppnPercent}%</td><td className="text-right">{rp(net+Math.round(net*i.ppnPercent/100))}</td></tr>})}</tbody></table></div>
      <div className="mt-4 ml-auto max-w-sm space-y-2 text-sm"><div className="flex justify-between"><span>Nilai tercetak</span><b>{rp(d.printedTotal)}</b></div><div className="flex justify-between"><span>Hitungan sistem</span><b>{rp(d.computedTotal)}</b></div><div className="flex justify-between border-t pt-2"><span>Selisih</span><b className={d.selisih?"text-[var(--bad)]":""}>{rp(d.selisih)}</b></div></div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">{d.status==="draft"&&<><button className="btn btn-ghost text-[var(--bad)]" disabled={remove.isPending} onClick={()=>{if(confirm("Hapus faktur Draf ini beserta rincian barangnya?"))remove.mutate({id:d.id})}}><Trash2 size={16}/> Hapus</button><button className="btn btn-accent" onClick={startEdit}><Pencil size={16}/> Edit faktur</button><button className="btn btn-primary" disabled={post.isPending||d.selisih!==0} onClick={()=>post.mutate({id:d.id})}>{d.selisih!==0?"Periksa selisih":"Bukukan faktur"}</button></>}</div>
      </>:<><div className="grid gap-3 md:grid-cols-2"><label className="text-sm">Nomor faktur<input className="input mt-1 w-full" value={number} onChange={e=>setNumber(e.target.value)}/></label><label className="text-sm">Tanggal faktur<input type="date" className="input mt-1 w-full" value={invoiceDate} onChange={e=>setInvoiceDate(e.target.value)}/></label><label className="text-sm">Jatuh tempo<input type="date" className="input mt-1 w-full" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><label className="text-sm">Nilai tercetak<input type="number" className="input mt-1 w-full" value={printedTotal} onChange={e=>setPrintedTotal(e.target.value)}/></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={taxInvoiceComplete} onChange={e=>setTaxInvoiceComplete(e.target.checked)}/> Faktur pajak lengkap</label></div>
      <div className="mt-4 flex items-center justify-between"><h3 className="font-semibold">Rincian barang</h3><button className="btn btn-ghost" onClick={addItem}><Plus size={16}/> Tambah barang</button></div>
      <div className="space-y-3">{items.map((it,index)=><div key={index} className="rounded-xl border border-[var(--line)] p-3"><div className="flex gap-2"><select className="input min-w-0 flex-1" value={it.productId} onChange={e=>setItems(v=>v.map((x,j)=>j===index?{...x,productId:Number(e.target.value)}:x))}>{products.data?.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</select><button className="btn btn-ghost text-[var(--bad)]" onClick={()=>setItems(v=>v.filter((_,j)=>j!==index))}><Trash2 size={16}/></button></div><div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">{([["qty","Qty"],["unitCost","Harga"],["discountPercent","Diskon %"],["ppnPercent","PPN %"]] as const).map(([key,label])=><label className="text-xs" key={key}>{label}<input type="number" className="input mt-1 w-full" value={it[key]} min={0} onChange={e=>setItems(v=>v.map((x,j)=>j===index?{...x,[key]:Number(e.target.value)}:x))}/></label>)}</div></div>)}</div>
      <div className="mt-4 rounded-lg bg-[var(--surface-soft)] p-3 text-sm"><div className="flex justify-between"><span>Total sistem (preview)</span><b>{rp(total)}</b></div><div className="flex justify-between"><span>Selisih dari tercetak</span><b className={Number(printedTotal)-total?"text-[var(--bad)]":""}>{rp(Number(printedTotal)-total)}</b></div></div>
      <div className="mt-5 flex justify-end gap-2"><button className="btn btn-ghost" onClick={()=>setEditing(false)}>Batal</button><button className="btn btn-primary" disabled={save.isPending||!items.length||items.some(i=>!i.productId||i.qty<1)} onClick={()=>save.mutate({id:d.id,number,invoiceDate,dueDate:dueDate||null,printedTotal:Number(printedTotal),taxInvoiceComplete,items})}><Save size={16}/> Simpan perubahan</button></div>
      {save.error&&<p className="mt-2 text-sm text-[var(--bad)]">{save.error.message}</p>}</>}
      </>}
      </div></div>}
  </div>;
}
