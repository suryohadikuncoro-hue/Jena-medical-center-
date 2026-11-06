import { z } from "zod";
import { createRouter, protectedProcedure } from "../middleware";
import { getDb } from "../queries/connection";
import {
  accounts,
  customers,
  invoices,
  journalEntries,
  journalLines,
  payments,
  periods,
  purchaseOrders,
  salesOrderItems,
  salesOrders,
  supplierInvoiceItems,
  supplierInvoices,
  suppliers,
} from "@db/schema";
import { eq, desc, asc, and, gte, lte } from "drizzle-orm";
import { countSalesOrdersWithPendingSupplier, pendingSupplierCountsBySalesOrder } from "../queries/order-status";

// ---------- ledger helpers ----------

type Line = { date: string; accountId: number; code: string; name: string; type: string; debit: number; credit: number; entryId: number; memo: string };

async function allLines(): Promise<Line[]> {
  const db = getDb();
  return db
    .select({
      date: journalEntries.date,
      entryId: journalEntries.id,
      memo: journalEntries.memo,
      accountId: journalLines.accountId,
      code: accounts.code,
      name: accounts.name,
      type: accounts.type,
      debit: journalLines.debit,
      credit: journalLines.credit,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.entryId, journalEntries.id))
    .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
    .orderBy(asc(journalEntries.date), asc(journalEntries.id), asc(journalLines.id));
}

function balanceOf(lines: Line[], code: string, until?: string) {
  return lines
    .filter((l) => l.code === code && (!until || l.date <= until))
    .reduce((s, l) => s + l.debit - l.credit, 0);
}

function movement(lines: Line[], code: string, from: string, to: string) {
  return lines
    .filter((l) => l.code === code && l.date >= from && l.date <= to)
    .reduce((s, l) => s + l.debit - l.credit, 0);
}

const MONTH_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const reportsRouter = createRouter({
  // ---------- Beranda ----------
  dashboard: protectedProcedure.query(async () => {
    const db = getDb();
    const lines = await allLines();

    const orders = await db
      .select({
        id: salesOrders.id,
        number: salesOrders.number,
        orderDate: salesOrders.orderDate,
        status: salesOrders.status,
        customerName: customers.name,
      })
      .from(salesOrders)
      .innerJoin(customers, eq(salesOrders.customerId, customers.id))
      .orderBy(desc(salesOrders.id));
    const soItems = await db.select().from(salesOrderItems);
    const invs = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        total: invoices.total,
        subtotal: invoices.subtotal,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        salesOrderId: invoices.salesOrderId,
        customerName: customers.name,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id));
    const faks = await db
      .select({
        id: supplierInvoices.id,
        number: supplierInvoices.number,
        status: supplierInvoices.status,
        dueDate: supplierInvoices.dueDate,
        taxInvoiceComplete: supplierInvoices.taxInvoiceComplete,
        supplierName: suppliers.name,
      })
      .from(supplierInvoices)
      .innerJoin(suppliers, eq(supplierInvoices.supplierId, suppliers.id));
    const fakItems = await db.select().from(supplierInvoiceItems);
    const pays = await db.select().from(payments);
    const pos = await db.select({ salesOrderId: purchaseOrders.salesOrderId, status: purchaseOrders.status }).from(purchaseOrders);
    const pendingSupplierCounts = pendingSupplierCountsBySalesOrder(pos);

    const orderTotal = (id: number) => soItems.filter((i) => i.orderId === id).reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const fakComputed = (id: number) => fakItems.filter((i) => i.invoiceId === id).reduce((s, i) => {
      const gross = i.qty * i.unitCost;
      const net = gross - Math.round(gross * i.discountPercent / 100);
      return s + net + Math.round(net * i.ppnPercent / 100);
    }, 0);
    const paidInv = (id: number) => pays.filter((p) => p.invoiceId === id).reduce((s, p) => s + p.amount, 0);

    // --- dokumen yang perlu diproses ---
    const baru = orders.filter((o) => o.status === "draft");
    const menungguCount = countSalesOrdersWithPendingSupplier(orders.map((o) => o.id), pendingSupplierCounts);

    // --- perlu tindakan ---
    const ditagih = invs.filter((i) => i.status !== "draft").reduce((s, i) => s + i.subtotal, 0);
    const openOrderValue = orders
      .filter((o) => o.status !== "closed")
      .reduce((s, o) => s + Math.max(0, orderTotal(o.id) - invs.filter((v) => v.salesOrderId === o.id && v.status !== "draft").reduce((x, v) => x + v.subtotal, 0)), 0);
    const siapDitagih = orders.filter((o) => {
      if (o.status !== "confirmed") return false;
      const billed = invs.filter((v) => v.salesOrderId === o.id && v.status !== "draft").reduce((x, v) => x + v.subtotal, 0);
      return orderTotal(o.id) - billed > 0;
    });

    // --- perlu dipantau (maks 4) ---
    const pantau: { kind: string; title: string; lines: { label: string; value: string }[]; date?: string }[] = [];
    const openInv = invs.filter((i) => (i.status === "issued" || i.status === "partial") && i.total - paidInv(i.id) > 0);
    for (const i of openInv.slice(0, 3)) {
      pantau.push({
        kind: "invoice",
        title: `Invoice ${i.number}`,
        date: i.dueDate ?? undefined,
        lines: [
          { label: "Sudah dibayar", value: `Rp ${paidInv(i.id).toLocaleString("id-ID")}` },
          { label: "Sisa", value: `Rp ${(i.total - paidInv(i.id)).toLocaleString("id-ID")}` },
        ],
      });
    }

    // --- aktivitas 7 hari terakhir ---
    const now = new Date();
    const days: { date: string; label: string; pesanan: number; ditagih: number }[] = [];
    for (let k = 6; k >= 0; k--) {
      const d = new Date(now);
      d.setDate(d.getDate() - k);
      const key = dayKey(d);
      days.push({
        date: key,
        label: `${d.getDate()} ${MONTH_ID[d.getMonth()]}`,
        pesanan: orders.filter((o) => o.orderDate === key).reduce((s, o) => s + orderTotal(o.id), 0),
        ditagih: invs.filter((i) => i.issueDate === key && i.status !== "draft").reduce((s, i) => s + i.subtotal, 0),
      });
    }

    // --- pembukuan bulan berjalan ---
    const mk = monthKey(now);
    const from = `${mk}-01`;
    const pendapatan = -movement(lines, "4101", from, "9999");
    const hpp = movement(lines, "5101", from, "9999");
    const piutang = balanceOf(lines, "1201");
    const hutang = -balanceOf(lines, "2101");
    const kas = balanceOf(lines, "1101");

    // tren 6 bulan
    const tren: { label: string; pendapatan: number; hpp: number }[] = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const m = monthKey(d);
      const f = `${m}-01`;
      const t = `${m}-31`;
      tren.push({ label: MONTH_ID[d.getMonth()], pendapatan: -movement(lines, "4101", f, t), hpp: movement(lines, "5101", f, t) });
    }

    // --- seri 14 hari untuk grafik mini kartu ringkasan ---
    const seri: { date: string; pendapatan: number; labaKotor: number; piutang: number; hutang: number }[] = [];
    for (let k = 13; k >= 0; k--) {
      const d = new Date(now);
      d.setDate(d.getDate() - k);
      const key = dayKey(d);
      const rev = -movement(lines, "4101", key, key);
      seri.push({
        date: key,
        pendapatan: rev,
        labaKotor: rev - movement(lines, "5101", key, key),
        piutang: balanceOf(lines, "1201", key),
        hutang: -balanceOf(lines, "2101", key),
      });
    }

    // --- umur piutang: sisa tagihan per keterlambatan dari jatuh tempo ---
    const todayKey = dayKey(now);
    const dayDiff = (a: string, b: string) => Math.round((new Date(`${a}T00:00:00`).getTime() - new Date(`${b}T00:00:00`).getTime()) / 86_400_000);
    const umurPiutang = { belumTempo: 0, telat1_30: 0, telat31_60: 0, telatLebih60: 0 };
    for (const i of openInv) {
      const sisa = i.total - paidInv(i.id);
      const late = i.dueDate ? dayDiff(todayKey, i.dueDate) : 0;
      if (late <= 0) umurPiutang.belumTempo += sisa;
      else if (late <= 30) umurPiutang.telat1_30 += sisa;
      else if (late <= 60) umurPiutang.telat31_60 += sisa;
      else umurPiutang.telatLebih60 += sisa;
    }

    // --- pelanggan teratas bulan berjalan (nilai pesanan) ---
    const perPelanggan = new Map<string, number>();
    for (const o of orders.filter((x) => x.orderDate.startsWith(mk))) {
      perPelanggan.set(o.customerName, (perPelanggan.get(o.customerName) ?? 0) + orderTotal(o.id));
    }
    const pelangganTeratas = [...perPelanggan.entries()]
      .map(([nama, nilai]) => ({ nama, nilai }))
      .sort((a, b) => b.nilai - a.nilai)
      .slice(0, 5);

    // --- hutang supplier yang jatuh tempo dalam 7 hari (termasuk yang sudah lewat) ---
    const in7 = new Date(now);
    in7.setDate(in7.getDate() + 7);
    const paidFak = (id: number) => pays.filter((p) => p.supplierInvoiceId === id).reduce((s, p) => s + p.amount, 0);
    const hutangTempo = faks
      .filter((f) => (f.status === "posted" || f.status === "partial") && f.dueDate && f.dueDate <= dayKey(in7))
      .map((f) => Math.max(0, fakComputed(f.id) - paidFak(f.id)));

    return {
      baruCount: baru.length,
      menungguCount,
      ditagih,
      belumDitagih: openOrderValue,
      invoiceStatus: {
        draf: invs.filter((i) => i.status === "draft").length,
        terbit: invs.filter((i) => i.status === "issued" || i.status === "partial").length,
        lunas: invs.filter((i) => i.status === "paid").length,
      },
      siapDitagihCount: siapDitagih.length,
      pantau,
      days,
      pembukuan: {
        pendapatan,
        labaKotor: pendapatan - hpp,
        piutang,
        hutang,
        kas,
        invoiceBelumLunas: openInv.length,
        jatuhTempoMingguIni: faks.filter((f) => {
          if (f.status === "paid" || !f.dueDate) return false;
          const in7 = new Date(now);
          in7.setDate(in7.getDate() + 7);
          return f.dueDate <= dayKey(in7);
        }).length,
      },
      tren,
      seri,
      umurPiutang,
      pelangganTeratas,
      hutangTempo7: { count: hutangTempo.length, nilai: hutangTempo.reduce((a, b) => a + b, 0) },
      terkonfirmasiCount: orders.filter((o) => o.status === "confirmed").length,
      dokumenBelumDibukukan: {
        drafInvoice: invs.filter((i) => i.status === "draft").length,
        nilaiDrafInvoice: invs.filter((i) => i.status === "draft").reduce((s, i) => s + i.subtotal, 0),
        drafFaktur: faks.filter((f) => f.status === "draft").length,
        totalDrafFaktur: faks.filter((f) => f.status === "draft").reduce((s, f) => s + fakComputed(f.id), 0),
      },
      perluDiselesaikan: {
        pajakMasukBelumLengkap: faks.filter((f) => f.status !== "draft" && !f.taxInvoiceComplete).length,
        drafInvoice: invs.filter((i) => i.status === "draft").length,
      },
    };
  }),

  // ---------- Ikhtisar / Laba Rugi / Neraca ----------
  summary: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const lines = await allLines();
      const [y, m] = input.month.split("-").map(Number);
      const from = `${input.month}-01`;
      const to = `${input.month}-31`;
      const prev = new Date(y, m - 2, 1);
      const prevFrom = `${monthKey(prev)}-01`;
      const prevTo = `${monthKey(prev)}-31`;

      const pendapatan = -movement(lines, "4101", from, to);
      const hpp = movement(lines, "5101", from, to);
      const pendapatanPrev = -movement(lines, "4101", prevFrom, prevTo);

      const db = getDb();
      const invs = await db.select().from(invoices);
      const faks = await db.select().from(supplierInvoices);
      const fakItems = await db.select().from(supplierInvoiceItems);
      const openInv = invs.filter((i) => i.status === "issued" || i.status === "partial");
      const totalDrafFaktur = faks.filter((f) => f.status === "draft").reduce((sum, faktur) => {
        return sum + fakItems.filter((item) => item.invoiceId === faktur.id).reduce((itemSum, item) => {
          const gross = item.qty * item.unitCost;
          const net = gross - Math.round(gross * item.discountPercent / 100);
          return itemSum + net + Math.round(net * item.ppnPercent / 100);
        }, 0);
      }, 0);

      return {
        pendapatan,
        hpp,
        labaKotor: pendapatan - hpp,
        marginPct: pendapatan > 0 ? (100 * (pendapatan - hpp)) / pendapatan : 0,
        pendapatanNaikPct: pendapatanPrev > 0 ? (100 * (pendapatan - pendapatanPrev)) / pendapatanPrev : null,
        piutang: balanceOf(lines, "1201", to),
        hutang: -balanceOf(lines, "2101", to),
        kas: balanceOf(lines, "1101", to),
        kasMovement: movement(lines, "1101", from, to),
        invoiceBelumLunas: openInv.length,
        fakturJatuhTempo: faks.filter((f) => f.status === "posted" || f.status === "partial").length,
        tren: await (async () => {
          const t: { label: string; pendapatan: number; hpp: number }[] = [];
          for (let k = 5; k >= 0; k--) {
            const d = new Date(y, m - 1 - k, 1);
            const key = monthKey(d);
            t.push({
              label: MONTH_ID[d.getMonth()],
              pendapatan: -movement(lines, "4101", `${key}-01`, `${key}-31`),
              hpp: movement(lines, "5101", `${key}-01`, `${key}-31`),
            });
          }
          return t;
        })(),
        dokumenBelumDibukukan: {
          drafInvoice: invs.filter((i) => i.status === "draft").length,
          nilaiDrafInvoice: invs.filter((i) => i.status === "draft").reduce((s, i) => s + i.subtotal, 0),
          drafFaktur: faks.filter((f) => f.status === "draft").length,
          totalDrafFaktur,
        },
        perluDiselesaikan: {
          pajakMasukBelumLengkap: faks.filter((f) => f.status !== "draft" && !f.taxInvoiceComplete).length,
          drafInvoice: invs.filter((i) => i.status === "draft").length,
        },
      };
    }),

  labaRugi: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const lines = await allLines();
      const from = `${input.month}-01`;
      const to = `${input.month}-31`;
      const rev = lines.filter((l) => l.type === "revenue" && l.date >= from && l.date <= to);
      const exp = lines.filter((l) => l.type === "expense" && l.date >= from && l.date <= to);
      const group = (ls: Line[], sign: number) => {
        const map = new Map<string, { code: string; name: string; amount: number }>();
        for (const l of ls) {
          const cur = map.get(l.code) ?? { code: l.code, name: l.name, amount: 0 };
          cur.amount += sign * (l.debit - l.credit);
          map.set(l.code, cur);
        }
        return [...map.values()];
      };
      const pendapatan = group(rev, -1);
      const beban = group(exp, 1);
      const totalPendapatan = pendapatan.reduce((s, r) => s + r.amount, 0);
      const totalBeban = beban.reduce((s, r) => s + r.amount, 0);
      return { pendapatan, beban, totalPendapatan, totalBeban, labaBersih: totalPendapatan - totalBeban };
    }),

  neraca: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const lines = await allLines();
      const to = `${input.month}-31`;
      const inScope = lines.filter((l) => l.date <= to);
      const group = (type: string) => {
        const map = new Map<string, { code: string; name: string; amount: number; nb: string }>();
        for (const l of inScope.filter((x) => x.type === type)) {
          const cur = map.get(l.code) ?? { code: l.code, name: l.name, amount: 0, nb: "" };
          cur.amount += l.debit - l.credit;
          map.set(l.code, cur);
        }
        return [...map.values()];
      };
      // laba berjalan = pendapatan - beban (belum ditutup ke ekuitas)
      const labaBerjalan =
        -inScope.filter((l) => l.type === "revenue").reduce((s, l) => s + l.debit - l.credit, 0) -
        inScope.filter((l) => l.type === "expense").reduce((s, l) => s + l.debit - l.credit, 0);
      const aset = group("asset").map((a) => ({ ...a, amount: a.amount }));
      const liabilitas = group("liability").map((a) => ({ ...a, amount: -a.amount }));
      const ekuitas = group("equity").map((a) => ({ ...a, amount: -a.amount }));
      const totalAset = aset.reduce((s, a) => s + a.amount, 0);
      const totalLiabilitas = liabilitas.reduce((s, a) => s + a.amount, 0);
      const totalEkuitas = ekuitas.reduce((s, a) => s + a.amount, 0) + labaBerjalan;
      return { aset, liabilitas, ekuitas, labaBerjalan, totalAset, totalLiabilitas, totalEkuitas };
    }),

  jurnal: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = getDb();
      const entries = await db
        .select()
        .from(journalEntries)
        .where(and(gte(journalEntries.date, `${input.month}-01`), lte(journalEntries.date, `${input.month}-31`)))
        .orderBy(desc(journalEntries.date), desc(journalEntries.id));
      const result = [];
      for (const e of entries) {
        const ls = await db
          .select({
            id: journalLines.id,
            debit: journalLines.debit,
            credit: journalLines.credit,
            code: accounts.code,
            name: accounts.name,
          })
          .from(journalLines)
          .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
          .where(eq(journalLines.entryId, e.id))
          .orderBy(asc(journalLines.id));
        result.push({ ...e, lines: ls });
      }
      return result;
    }),

  bukuBesar: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), code: z.string() }))
    .query(async ({ input }) => {
      const lines = await allLines();
      const mine = lines.filter((l) => l.code === input.code);
      const opening = mine.filter((l) => l.date < `${input.month}-01`).reduce((s, l) => s + l.debit - l.credit, 0);
      let running = opening;
      const rows = mine
        .filter((l) => l.date >= `${input.month}-01` && l.date <= `${input.month}-31`)
        .map((l) => {
          running += l.debit - l.credit;
          return { date: l.date, memo: l.memo, debit: l.debit, credit: l.credit, balance: running };
        });
      return { opening, rows, closing: running };
    }),

  accountList: protectedProcedure.query(async () => {
    return getDb().select().from(accounts).orderBy(asc(accounts.code));
  }),

  ppn: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      const lines = await allLines();
      const from = `${input.month}-01`;
      const to = `${input.month}-31`;
      const keluaran = -movement(lines, "2201", from, to);
      const masukan = movement(lines, "1501", from, to);
      const db = getDb();
      const faks = await db.select().from(supplierInvoices);
      return {
        keluaran,
        masukan,
        kurangBayar: keluaran - masukan,
        fakturMasukBelumLengkap: faks.filter((f) => f.status !== "draft" && !f.taxInvoiceComplete).length,
      };
    }),

  periodStatus: protectedProcedure.query(async () => {
    return getDb().select().from(periods).orderBy(desc(periods.month));
  }),
});
