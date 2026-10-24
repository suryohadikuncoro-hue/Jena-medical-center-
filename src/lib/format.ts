export const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export const rpShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (abs >= 1_000) return `Rp ${(n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return rp(n);
};

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const tanggal = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
};

export const tanggalPanjang = (d: Date) =>
  `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;

export const bulanIni = () => new Date().toISOString().slice(0, 7);

export const namaBulan = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${BULAN[m - 1]} ${y}`;
};

/** Normalisasi nomor HP Indonesia untuk wa.me (08xx → 628xx) */
export const waNumber = (phone: string | null | undefined) => {
  if (!phone) return null;
  let p = phone.replace(/[^\d]/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  return p.length >= 9 ? p : null;
};

/** Tanggal hari ini dalam zona waktu lokal (YYYY-MM-DD) */
export const todayLocal = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};
