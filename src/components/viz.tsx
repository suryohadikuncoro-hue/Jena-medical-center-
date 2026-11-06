import { useEffect, useId, useRef, useState } from "react";

/** Lebar elemen pembungkus, supaya SVG digambar pas dan teksnya tidak ikut melar. */
function useWidth<T extends HTMLElement>(initial = 320) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(60, Math.round(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const FAINT = "#9aa5b5";

/** Grafik garis mini untuk kartu ringkasan; selebar pembungkusnya. */
export function Sparkline({ data, color, height = 38 }: { data: number[]; color: string; height?: number }) {
  const id = useId();
  const [ref, width] = useWidth<HTMLDivElement>(92);
  const pad = 3;
  const mx = Math.max(...data);
  const mn = Math.min(...data);
  const pts = data.map((v, i) => [pad + (i * (width - 2 * pad)) / Math.max(1, data.length - 1), pad + (height - 2 * pad) * (1 - (v - mn) / (mx - mn || 1))]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  const last = pts[pts.length - 1];
  return (
    <div ref={ref} className="w-full" aria-hidden="true">
      {data.length > 1 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity=".22" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line}L${width - pad} ${height}L${pad} ${height}Z`} fill={`url(#${id})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={last[0]} cy={last[1]} r="3.2" fill="#fff" stroke={color} strokeWidth="2" />
        </svg>
      )}
    </div>
  );
}

type Month = { label: string; pendapatan: number; hpp: number };

const niceMax = (v: number) => {
  const unit = v > 400e6 ? 100e6 : v > 100e6 ? 50e6 : v > 40e6 ? 20e6 : v > 10e6 ? 5e6 : 1e6;
  return Math.max(unit * 2, Math.ceil(v / unit) * unit);
};
const jt = (n: number) => (n === 0 ? "0" : `${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`);

/** Batang pendapatan dan HPP per bulan, garis margin kotor di sumbu kanan. Bulan terakhir disorot. */
export function RevenueMarginChart({ data, height = 272 }: { data: Month[]; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>(640);
  const compact = w < 480;
  const L = compact ? 38 : 46;
  const R = compact ? 34 : 44;
  const T = 24;
  const B = 28;
  const pw = w - L - R;
  const ph = height - T - B;
  const max = niceMax(Math.max(1, ...data.flatMap((d) => [d.pendapatan, d.hpp])));
  const y = (v: number) => T + ph * (1 - v / max);
  const gw = pw / Math.max(1, data.length);
  const bw = Math.min(compact ? 11 : 22, gw / 3);
  const gap = 4;
  const margin = data.map((d) => (d.pendapatan > 0 ? ((d.pendapatan - d.hpp) / d.pendapatan) * 100 : 0));
  const mMin = Math.max(0, Math.floor(Math.min(...margin) / 10) * 10);
  const mMax = mMin + Math.max(1, Math.ceil((Math.max(...margin) - mMin + 0.01) / 10)) * 10;
  const my = (v: number) => T + ph * (1 - (v - mMin) / (mMax - mMin || 1));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);
  const lastIdx = data.length - 1;
  const cx = (i: number) => L + gw * i + gw / 2;
  const pts = margin.map((m, i) => [cx(i), my(m)] as const);
  const summary = data.map((d, i) => `${d.label}: pendapatan ${jt(d.pendapatan)}, HPP ${jt(d.hpp)}, margin ${margin[i].toFixed(1)}%`).join(". ");

  return (
    <div ref={ref} className="w-full min-w-0">
      <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={`Grafik pendapatan, HPP, dan margin. ${summary}`}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={w - R} y1={y(t)} y2={y(t)} stroke="#edf0f4" strokeDasharray={i ? "3 4" : undefined} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={FAINT}>{t === 0 ? "0" : jt(t)}</text>
          </g>
        ))}
        {[mMin, (mMin + mMax) / 2, mMax].map((v, i) => (
          <text key={i} x={w - R + 8} y={my(v) + 4} fontSize="11" fill="#c9962a">{Math.round(v)}%</text>
        ))}
        {data.map((d, i) => {
          const last = i === lastIdx;
          return (
            <g key={d.label + i}>
              {last && <rect x={cx(i) - gw / 2 + 3} y={T - 18} width={gw - 6} height={ph + 22} rx="12" fill="#f1f8f7" />}
              <rect x={cx(i) - bw - gap / 2} y={y(d.pendapatan)} width={bw} height={Math.max(0, y(0) - y(d.pendapatan))} rx="5" fill={last ? "#0e8a83" : "#7cc4bd"} />
              <rect x={cx(i) + gap / 2} y={y(d.hpp)} width={bw} height={Math.max(0, y(0) - y(d.hpp))} rx="5" fill={last ? "#8d9bb2" : "#d3dae5"} />
              <text x={cx(i)} y={height - 8} textAnchor="middle" fontSize="12" fontWeight={last ? 700 : 500} fill={last ? "#18212f" : "#68758a"}>{d.label}</text>
            </g>
          );
        })}
        <path d={pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join("")} fill="none" stroke="#f2b035" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === lastIdx ? 5 : 3.4} fill="#fff" stroke="#f2b035" strokeWidth="2.2" />
        ))}
        {data[lastIdx] && (
          <>
            <text x={cx(lastIdx) - bw / 2 - gap / 2} y={y(data[lastIdx].pendapatan) - 7} textAnchor="middle" fontSize={compact ? 10 : 11.5} fontWeight="700" fill="#0a6b66">
              {(data[lastIdx].pendapatan / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })}
            </text>
            {!compact && (
              <text x={cx(lastIdx) + bw / 2 + gap / 2} y={y(data[lastIdx].hpp) - 7} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#68758a">
                {(data[lastIdx].hpp / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })}
              </text>
            )}
            <g transform={`translate(${pts[lastIdx][0] - (compact ? 46 : 54)},${pts[lastIdx][1] + 10})`}>
              <rect width={compact ? 42 : 48} height="20" rx="10" fill="#fef4dd" />
              <text x={compact ? 21 : 24} y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill="#946300">{margin[lastIdx].toFixed(1).replace(".", ",")}%</text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
}

export type Part = { name: string; value: number; color: string };

/** Donat dengan teks di tengah. */
export function Donut({ parts, size = 138, title, caption }: { parts: Part[]; size?: number; title: string; caption: string }) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const total = parts.reduce((a, p) => a + p.value, 0);
  let off = 0;
  const label = parts.map((p) => `${p.name} ${jt(p.value)}`).join(", ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${caption} ${title}. ${label}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef1f5" strokeWidth="16" />
      {total > 0 &&
        parts.map((p) => {
          const len = (c * p.value) / total;
          const el = (
            <circle
              key={p.name}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="16"
              strokeDasharray={`${Math.max(len - 3, p.value > 0 ? 1 : 0)} ${c - len + 3}`}
              strokeDashoffset={-off}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          off += len;
          return p.value > 0 ? el : null;
        })}
      <text x="50%" y={size / 2 - 1} textAnchor="middle" fontSize={size > 130 ? 21 : 18} fontWeight="650" fill="#18212f">{title}</text>
      <text x="50%" y={size / 2 + 16} textAnchor="middle" fontSize="11.5" fill="#68758a">{caption}</text>
    </svg>
  );
}
