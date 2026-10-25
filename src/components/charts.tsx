import { rpShort } from "@/lib/format";

function PlotGrid({ height }: { height: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height }}>
      {Array.from({ length: 4 }, (_, i) => <span key={i} className="border-t border-dashed border-[#edf0f5]" />)}
    </div>
  );
}

/** Grafik batang ganda (pesanan vs ditagih) per hari — SVG murni */
export function DualBars({ data, height = 160 }: { data: { label: string; pesanan: number; ditagih: number }[]; height?: number }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.pesanan, d.ditagih]));
  const plotHeight = height - 30;
  return (
    <div className="pb-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-4 text-xs text-[#667085]" aria-hidden="true">
        <span className="flex items-center gap-2"><i className="inline-block size-2.5 rounded-full bg-[#6876c8]" /> Nilai pesanan</span>
        <span className="flex items-center gap-2"><i className="inline-block size-2.5 rounded-full bg-[#4b8d80]" /> Ditagih</span>
      </div>
      <div className="relative flex items-end gap-2" style={{ height }} role="img" aria-label="Grafik nilai pesanan dan penagihan harian selama tujuh hari terakhir">
        <PlotGrid height={plotHeight} />
        {data.map((d, i) => (
          <div key={`${d.label}-${i}`} className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-end justify-center gap-1" style={{ height: plotHeight }}>
              <div
                className="w-2/5 max-w-[24px] rounded-t-md bg-[#6876c8] transition-all duration-300"
                style={{ height: `${(d.pesanan / max) * 100}%`, minHeight: d.pesanan > 0 ? 3 : 0 }}
                title={`Pesanan ${rpShort(d.pesanan)}`}
              />
              <div
                className="w-2/5 max-w-[24px] rounded-t-md bg-[#4b8d80] transition-all duration-300"
                style={{ height: `${(d.ditagih / max) * 100}%`, minHeight: d.ditagih > 0 ? 3 : 0 }}
                title={`Ditagih ${rpShort(d.ditagih)}`}
              />
            </div>
            <span className="w-full truncate text-center text-[0.625rem] font-medium text-[#667085]">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Grafik batang ganda 6 bulan: pendapatan vs HPP */
export function TrendBars({ data, height = 180 }: { data: { label: string; pendapatan: number; hpp: number }[]; height?: number }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.pendapatan, d.hpp]));
  const plotHeight = height - 42;
  return (
    <div className="pb-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-4 text-xs text-[#667085]" aria-hidden="true">
        <span className="flex items-center gap-2"><i className="inline-block size-2.5 rounded-full bg-[#6876c8]" /> Pendapatan</span>
        <span className="flex items-center gap-2"><i className="inline-block size-2.5 rounded-full bg-[#4b8d80]" /> HPP</span>
      </div>
      <div className="relative flex items-end gap-2 sm:gap-3" style={{ height }} role="img" aria-label="Grafik tren pendapatan dibanding harga pokok selama enam bulan">
        <PlotGrid height={plotHeight} />
        {data.map((d, i) => (
          <div key={`${d.label}-${i}`} className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="h-3 text-[0.58rem] font-medium text-[#667085]">{d.pendapatan > 0 ? rpShort(d.pendapatan).replace("Rp ", "") : ""}</span>
            <div className="flex w-full items-end justify-center gap-1" style={{ height: plotHeight }}>
              <div className="w-2/5 max-w-[26px] rounded-t-md bg-[#6876c8] transition-all duration-300" style={{ height: `${(d.pendapatan / max) * 100}%`, minHeight: d.pendapatan > 0 ? 3 : 0 }} title={`Pendapatan ${rpShort(d.pendapatan)}`} />
              <div className="w-2/5 max-w-[26px] rounded-t-md bg-[#4b8d80] transition-all duration-300" style={{ height: `${(d.hpp / max) * 100}%`, minHeight: d.hpp > 0 ? 3 : 0 }} title={`HPP ${rpShort(d.hpp)}`} />
            </div>
            <span className="text-[0.625rem] font-medium text-[#667085]">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
