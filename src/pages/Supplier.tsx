import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { PageHeader, Section, Loading, LoadError, Empty } from "@/components/bits";

export default function Supplier() {
  const q = trpc.master.suppliers.useQuery();
  const create = trpc.master.createSupplier.useMutation({ onSuccess: () => { q.refetch(); setName(""); setPhone(""); } });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <LoadError message={q.error?.message} retry={() => q.refetch()} />;

  return (
    <div>
      <PageHeader title="Supplier" sub={`${q.data.length} supplier terdaftar`} />
      <Section title="Tambah supplier">
        <div className="border-b border-[var(--line)] px-4 py-4 md:px-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className="input" placeholder="Nama supplier" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="Telepon (opsional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button className="btn mt-3" disabled={!name || create.isPending} onClick={() => create.mutate({ name, phone: phone || undefined })}>
            Simpan supplier
          </button>
        </div>
      </Section>
      <Section>
        {q.data.length === 0 ? <Empty text="Belum ada supplier." /> : (
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {q.data.map((s) => (
              <div key={s.id} className="px-4 py-4 md:px-8">
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-[var(--ink-soft)]">{s.code}{s.phone ? ` · ${s.phone}` : ""}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
