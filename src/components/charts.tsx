import { rpShort } from "@/lib/format";

/** Grafik batang ganda (pesanan vs ditagih) per hari — SVG murni */
export function DualBars({ data, height = 160 }: { data: { label: string; pesanan: number; ditagih: number }[]; height?: number }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.pesanan, d.ditagih]));
  return (
    <div className="px-4 pb-4 md:px-8">
      <div className="flex items-center gap-4 pb-3 text-xs text-[var(--ink-soft)]">
        <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 bg-[var(--ink)]" /> Nilai pesanan</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 bg-[var(--slate)]" /> Ditagih</span>
      </div>
      <div className="flex items-end gap-[6px]" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end justify-center gap-[3px]" style={{ height: height - 28 }}>
              <div
                className="w-1/2 max-w-[22px] bg-[var(--ink)] transition-all duration-300"
                style={{ height: `${(d.pesanan / max) * 100}%`, minHeight: d.pesanan > 0 ? 3 : 0 }}
                title={`Pesanan ${rpShort(d.pesanan)}`}
              />
              <div
                className="w-1/2 max-w-[22px] bg-[var(--slate)] transition-all duration-300"
                style={{ height: `${(d.ditagih / max) * 100}%`, minHeight: d.ditagih > 0 ? 3 : 0 }}
                title={`Ditagih ${rpShort(d.ditagih)}`}
              />
            </div>
            <span className="w-full truncate text-center text-[0.625rem] text-[var(--ink-soft)]">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Grafik batang ganda 6 bulan: pendapatan vs HPP */
export function TrendBars({ data, height = 180 }: { data: { label: string; pendapatan: number; hpp: number }[]; height?: number }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.pendapatan, d.hpp]));
  return (
    <div className="px-4 pb-4 md:px-8">
      <div className="flex items-center gap-4 pb-3 text-xs text-[var(--ink-soft)]">
        <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 bg-[var(--ink)]" /> Pendapatan</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 bg-[var(--slate)]" /> HPP</span>
      </div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[0.625rem] font-medium text-[var(--ink-soft)]">{d.pendapatan > 0 ? rpShort(d.pendapatan).replace("Rp ", "") : ""}</span>
            <div className="flex w-full items-end justify-center gap-[4px]" style={{ height: height - 46 }}>
              <div className="w-2/5 max-w-[28px] bg-[var(--ink)]" style={{ height: `${(d.pendapatan / max) * 100}%`, minHeight: d.pendapatan > 0 ? 3 : 0 }} />
              <div className="w-2/5 max-w-[28px] bg-[var(--slate)]" style={{ height: `${(d.hpp / max) * 100}%`, minHeight: d.hpp > 0 ? 3 : 0 }} />
            </div>
            <span className="text-[0.625rem] text-[var(--ink-soft)]">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
