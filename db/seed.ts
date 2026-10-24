import { getDb } from "../api/queries/connection";
import {
  accounts,
  customers,
  invoiceItems,
  invoices,
  payments,
  periods,
  products,
  purchaseOrderItems,
  purchaseOrders,
  salesOrderItems,
  salesOrders,
  supplierInvoiceItems,
  supplierInvoices,
  suppliers,
} from "./schema";
import { issueInvoice, postJournal, postSupplierInvoice, recordPayment } from "../api/queries/business";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // ---------- Bagan akun ----------
  await db.insert(accounts).values([
    { code: "1101", name: "Kas dan bank", type: "asset", normalBalance: "debit" },
    { code: "1201", name: "Piutang usaha", type: "asset", normalBalance: "debit" },
    { code: "1301", name: "Persediaan barang", type: "asset", normalBalance: "debit" },
    { code: "1501", name: "PPN masukan", type: "asset", normalBalance: "debit" },
    { code: "2101", name: "Hutang usaha", type: "liability", normalBalance: "credit" },
    { code: "2201", name: "PPN keluaran", type: "liability", normalBalance: "credit" },
    { code: "3101", name: "Modal pemilik", type: "equity", normalBalance: "credit" },
    { code: "4101", name: "Pendapatan penjualan", type: "revenue", normalBalance: "credit" },
    { code: "5101", name: "Harga pokok penjualan", type: "expense", normalBalance: "debit" },
  ]);

  for (const m of ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]) {
    await db.insert(periods).values({ month: m, status: m === "2026-10" ? "open" : "closed" });
  }

  // ---------- Master data ----------
  const [custA] = await db.insert(customers).values({ code: "C001", name: "Klinik Contoh A", phone: "6281234567801", address: "Jl. Cendana No. 12, Yogyakarta", termDays: 30 }).$returningId();
  const [custB] = await db.insert(customers).values({ code: "C002", name: "Klinik Contoh B", phone: "6281234567802", address: "Jl. Kenanga No. 4, Sleman", termDays: 14 }).$returningId();
  const [custC] = await db.insert(customers).values({ code: "C003", name: "Klinik Contoh C", phone: "6281234567803", address: "Jl. Merpati No. 8, Bantul", termDays: 30 }).$returningId();
  const [custD] = await db.insert(customers).values({ code: "C004", name: "RS Melati", phone: "6281234567804", address: "Jl. Anggrek No. 1, Yogyakarta", termDays: 30 }).$returningId();

  const [sup1] = await db.insert(suppliers).values({ code: "S001", name: "PT Sumber Medika", phone: "6282234567801" }).$returningId();
  const [sup2] = await db.insert(suppliers).values({ code: "S002", name: "CV Alkes Jaya", phone: "6282234567802" }).$returningId();

  const [pSarung] = await db.insert(products).values({ sku: "SKU-001", name: "Sarung tangan periksa", unit: "kotak", basePrice: 85000 }).$returningId();
  const [pMasker] = await db.insert(products).values({ sku: "SKU-002", name: "Masker bedah 3 lapis", unit: "kotak", basePrice: 41500 }).$returningId();
  const [pTensi] = await db.insert(products).values({ sku: "SKU-003", name: "Tensimeter digital", unit: "unit", basePrice: 640000 }).$returningId();
  const [pSwab] = await db.insert(products).values({ sku: "SKU-004", name: "Alkohol swab", unit: "kotak", basePrice: 27500 }).$returningId();
  const [pTermo] = await db.insert(products).values({ sku: "SKU-005", name: "Termometer infrared", unit: "unit", basePrice: 350000 }).$returningId();

  // ---------- Saldo awal 1 Mei 2026 ----------
  await postJournal("2026-05-01", "Saldo awal", "opening", null, [
    { code: "1101", debit: 3525000 },
    { code: "3101", credit: 3525000 },
  ]);

  // ---------- Riwayat Mei–Sep (sudah selesai & tertagih tunai) ----------
  const hist: [string, number, number][] = [
    ["2026-05-28", 4200000, 3570000],
    ["2026-06-28", 5100000, 4335000],
    ["2026-07-28", 4600000, 3910000],
    ["2026-08-28", 6000000, 5100000],
    ["2026-09-28", 5800000, 4930000],
  ];
  for (const [date, rev, hpp] of hist) {
    await postJournal(date, "Penjualan bulan berjalan (tertagih tunai)", "manual", null, [
      { code: "1101", debit: rev },
      { code: "4101", credit: rev },
    ]);
    await postJournal(date, "HPP bulan berjalan", "manual", null, [
      { code: "5101", debit: hpp },
      { code: "1301", credit: hpp },
    ]);
    await postJournal(date, "Pembelian persediaan tunai", "manual", null, [
      { code: "1301", debit: hpp },
      { code: "1101", credit: hpp },
    ]);
  }

  // ---------- FAK-001: faktur supplier 3 Okt, dibukukan, lunas ----------
  const [fak1] = await db.insert(supplierInvoices).values({
    number: "SM-1003",
    supplierId: sup1.id,
    poId: null,
    invoiceDate: "2026-10-03",
    dueDate: "2026-10-18",
    printedTotal: 7832000,
    status: "draft",
    taxInvoiceComplete: false,
  }).$returningId();
  await db.insert(supplierInvoiceItems).values([
    { invoiceId: fak1.id, productId: pSarung.id, qty: 56, unitCost: 74800 },
    { invoiceId: fak1.id, productId: pMasker.id, qty: 62, unitCost: 38600 },
    { invoiceId: fak1.id, productId: pTensi.id, qty: 1, unitCost: 650000 },
    { invoiceId: fak1.id, productId: pSwab.id, qty: 20, unitCost: 30000 },
  ]);
  await postSupplierInvoice(fak1.id);

  // ---------- SO-0003 → INV-0003 (lunas) ----------
  const [so3] = await db.insert(salesOrders).values({ number: "SO-0003", customerId: custC.id, orderDate: "2026-10-05", status: "closed" }).$returningId();
  const so3Items = await db.insert(salesOrderItems).values([
    { orderId: so3.id, productId: pMasker.id, qty: 40, unitPrice: 41500, priceSource: "standar" },
    { orderId: so3.id, productId: pSarung.id, qty: 20, unitPrice: 85000, priceSource: "standar" },
    { orderId: so3.id, productId: pTensi.id, qty: 1, unitPrice: 840000, priceSource: "khusus" },
  ]).$returningId();
  const [inv3] = await db.insert(invoices).values({
    number: "INV-0003", customerId: custC.id, salesOrderId: so3.id,
    issueDate: "2026-10-05", dueDate: "2026-11-04",
    subtotal: 4200000, ppnAmount: 462000, total: 4662000, status: "draft",
  }).$returningId();
  await db.insert(invoiceItems).values([
    { invoiceId: inv3.id, productId: pMasker.id, description: "Masker bedah 3 lapis", qty: 40, unitPrice: 41500, taxable: true },
    { invoiceId: inv3.id, productId: pSarung.id, description: "Sarung tangan periksa", qty: 20, unitPrice: 85000, taxable: true },
    { invoiceId: inv3.id, productId: pTensi.id, description: "Tensimeter digital", qty: 1, unitPrice: 840000, taxable: true },
  ]);
  await issueInvoice(inv3.id);
  await recordPayment({ direction: "in", invoiceId: inv3.id, date: "2026-10-06", amount: 4662000, method: "transfer", note: "Pelunasan INV-0003" });

  // ---------- FAK-002: faktur supplier 10 Okt, dibukukan, belum dibayar ----------
  const [fak2] = await db.insert(supplierInvoices).values({
    number: "SM-1010",
    supplierId: sup1.id,
    poId: null,
    invoiceDate: "2026-10-10",
    dueDate: "2026-10-25",
    printedTotal: 2130000,
    status: "draft",
    taxInvoiceComplete: false,
  }).$returningId();
  await db.insert(supplierInvoiceItems).values([
    { invoiceId: fak2.id, productId: pTensi.id, qty: 1, unitCost: 660000 },
    { invoiceId: fak2.id, productId: pTermo.id, qty: 3, unitCost: 280000 },
    { invoiceId: fak2.id, productId: pSwab.id, qty: 20, unitCost: 31500 },
  ]);
  await postSupplierInvoice(fak2.id);

  // ---------- SO-0004 → INV-0002 (sebagian terbayar) ----------
  const [so4] = await db.insert(salesOrders).values({ number: "SO-0004", customerId: custB.id, orderDate: "2026-10-12", status: "confirmed" }).$returningId();
  await db.insert(salesOrderItems).values([
    { orderId: so4.id, productId: pMasker.id, qty: 20, unitPrice: 48000, priceSource: "khusus" },
    { orderId: so4.id, productId: pSwab.id, qty: 10, unitPrice: 31000, priceSource: "manual" },
    { orderId: so4.id, productId: pSarung.id, qty: 15, unitPrice: 82000, priceSource: "khusus" },
  ]);
  const [inv2] = await db.insert(invoices).values({
    number: "INV-0002", customerId: custB.id, salesOrderId: so4.id,
    issueDate: "2026-10-12", dueDate: "2026-10-26",
    subtotal: 2500000, ppnAmount: 275000, total: 2775000, status: "draft",
  }).$returningId();
  await db.insert(invoiceItems).values([
    { invoiceId: inv2.id, productId: pMasker.id, description: "Masker bedah 3 lapis", qty: 20, unitPrice: 48000, taxable: true },
    { invoiceId: inv2.id, productId: pSwab.id, description: "Alkohol swab", qty: 10, unitPrice: 31000, taxable: true },
    { invoiceId: inv2.id, productId: pSarung.id, description: "Sarung tangan periksa", qty: 15, unitPrice: 82000, taxable: true },
  ]);
  await issueInvoice(inv2.id);
  await recordPayment({ direction: "in", invoiceId: inv2.id, date: "2026-10-14", amount: 1000000, method: "transfer", note: "Uang muka" });

  // ---------- Bayar FAK-001 ----------
  await recordPayment({ direction: "out", supplierInvoiceId: fak1.id, date: "2026-10-15", amount: 7832000, method: "transfer", note: "Pelunasan SM-1003" });

  // ---------- SO-0007: pesanan utama mockup (terkonfirmasi) ----------
  const [so7] = await db.insert(salesOrders).values({ number: "SO-0007", customerId: custA.id, orderDate: "2026-10-17", status: "confirmed" }).$returningId();
  await db.insert(salesOrderItems).values([
    { orderId: so7.id, productId: pSarung.id, qty: 20, unitPrice: 85000, priceSource: "khusus" },
    { orderId: so7.id, productId: pMasker.id, qty: 50, unitPrice: 41500, priceSource: "manual" },
    { orderId: so7.id, productId: pTensi.id, qty: 2, unitPrice: 640000, priceSource: "khusus" },
  ]);
  const [po1] = await db.insert(purchaseOrders).values({ number: "PO-0001", supplierId: sup1.id, salesOrderId: so7.id, orderDate: "2026-10-17", status: "confirmed" }).$returningId();
  await db.insert(purchaseOrderItems).values([
    { poId: po1.id, productId: pSarung.id, qty: 20, unitCost: 74800 },
    { poId: po1.id, productId: pMasker.id, qty: 50, unitCost: 38600 },
  ]);
  const [po2] = await db.insert(purchaseOrders).values({ number: "PO-0002", supplierId: sup2.id, salesOrderId: so7.id, orderDate: "2026-10-17", status: "confirmed" }).$returningId();
  await db.insert(purchaseOrderItems).values([
    { poId: po2.id, productId: pTensi.id, qty: 2, unitCost: 655000 },
  ]);

  // ---------- INV-0001 dari SO-0007 (terbit, jatuh tempo 16 Nov) ----------
  const [inv1] = await db.insert(invoices).values({
    number: "INV-0001", customerId: custA.id, salesOrderId: so7.id,
    issueDate: "2026-10-17", dueDate: "2026-11-16",
    subtotal: 1700000, ppnAmount: 187000, total: 1887000, status: "draft",
  }).$returningId();
  await db.insert(invoiceItems).values([
    { invoiceId: inv1.id, productId: pSarung.id, description: "Sarung tangan periksa", qty: 20, unitPrice: 85000, taxable: true },
  ]);
  await issueInvoice(inv1.id);

  // ---------- Pesanan draft (belum dipesan ke supplier) ----------
  const [so5] = await db.insert(salesOrders).values({ number: "SO-0005", customerId: custB.id, orderDate: "2026-10-20", status: "draft" }).$returningId();
  await db.insert(salesOrderItems).values([
    { orderId: so5.id, productId: pSwab.id, qty: 30, unitPrice: 27500, priceSource: "standar" },
  ]);
  const [so6] = await db.insert(salesOrders).values({ number: "SO-0006", customerId: custC.id, orderDate: "2026-10-21", status: "draft" }).$returningId();
  await db.insert(salesOrderItems).values([
    { orderId: so6.id, productId: pMasker.id, qty: 30, unitPrice: 41500, priceSource: "standar" },
    { orderId: so6.id, productId: pSarung.id, qty: 10, unitPrice: 85000, priceSource: "standar" },
  ]);
  const [so10] = await db.insert(salesOrders).values({ number: "SO-0010", customerId: custA.id, orderDate: "2026-10-22", status: "draft" }).$returningId();
  await db.insert(salesOrderItems).values([
    { orderId: so10.id, productId: pTensi.id, qty: 1, unitPrice: 850000, priceSource: "khusus" },
    { orderId: so10.id, productId: pSwab.id, qty: 5, unitPrice: 30000, priceSource: "manual" },
  ]);

  // ---------- Pesanan menunggu balasan supplier ----------
  const [so8] = await db.insert(salesOrders).values({ number: "SO-0008", customerId: custB.id, orderDate: "2026-10-19", status: "ordered" }).$returningId();
  await db.insert(salesOrderItems).values([
    { orderId: so8.id, productId: pSwab.id, qty: 40, unitPrice: 30000, priceSource: "manual" },
    { orderId: so8.id, productId: pTermo.id, qty: 2, unitPrice: 380000, priceSource: "khusus" },
    { orderId: so8.id, productId: pSarung.id, qty: 12, unitPrice: 85000, priceSource: "standar" },
  ]);
  const [po3] = await db.insert(purchaseOrders).values({ number: "PO-0003", supplierId: sup1.id, salesOrderId: so8.id, orderDate: "2026-10-19", status: "sent" }).$returningId();
  await db.insert(purchaseOrderItems).values([
    { poId: po3.id, productId: pSwab.id, qty: 40, unitCost: 26000 },
    { poId: po3.id, productId: pTermo.id, qty: 2, unitCost: 280000 },
  ]);

  const [so9] = await db.insert(salesOrders).values({ number: "SO-0009", customerId: custD.id, orderDate: "2026-10-20", status: "ordered" }).$returningId();
  await db.insert(salesOrderItems).values([
    { orderId: so9.id, productId: pSarung.id, qty: 10, unitPrice: 88000, priceSource: "khusus" },
    { orderId: so9.id, productId: pMasker.id, qty: 20, unitPrice: 43000, priceSource: "manual" },
    { orderId: so9.id, productId: pTensi.id, qty: 1, unitPrice: 720000, priceSource: "khusus" },
  ]);
  const [po4] = await db.insert(purchaseOrders).values({ number: "PO-0004", supplierId: sup2.id, salesOrderId: so9.id, orderDate: "2026-10-20", status: "sent" }).$returningId();
  await db.insert(purchaseOrderItems).values([
    { poId: po4.id, productId: pSarung.id, qty: 10, unitCost: 76000 },
    { poId: po4.id, productId: pMasker.id, qty: 20, unitCost: 39500 },
    { poId: po4.id, productId: pTensi.id, qty: 1, unitCost: 655000 },
  ]);

  // ---------- Draf invoice (belum diterbitkan) ----------
  const [inv4] = await db.insert(invoices).values({
    number: "INV-0004", customerId: custB.id, salesOrderId: so8.id,
    issueDate: "2026-10-21", dueDate: "2026-11-04",
    subtotal: 2980000, ppnAmount: 327800, total: 3307800, status: "draft",
  }).$returningId();
  await db.insert(invoiceItems).values([
    { invoiceId: inv4.id, productId: pSwab.id, description: "Alkohol swab", qty: 40, unitPrice: 30000, taxable: true },
    { invoiceId: inv4.id, productId: pTermo.id, description: "Termometer infrared", qty: 2, unitPrice: 380000, taxable: true },
    { invoiceId: inv4.id, productId: pSarung.id, description: "Sarung tangan periksa", qty: 12, unitPrice: 85000, taxable: true },
  ]);
  const [inv5] = await db.insert(invoices).values({
    number: "INV-0005", customerId: custD.id, salesOrderId: so9.id,
    issueDate: "2026-10-22", dueDate: "2026-11-21",
    subtotal: 2460000, ppnAmount: 270600, total: 2730600, status: "draft",
  }).$returningId();
  await db.insert(invoiceItems).values([
    { invoiceId: inv5.id, productId: pSarung.id, description: "Sarung tangan periksa", qty: 10, unitPrice: 88000, taxable: true },
    { invoiceId: inv5.id, productId: pMasker.id, description: "Masker bedah 3 lapis", qty: 20, unitPrice: 43000, taxable: true },
    { invoiceId: inv5.id, productId: pTensi.id, description: "Tensimeter digital", qty: 1, unitPrice: 720000, taxable: true },
  ]);

  // ---------- Faktur supplier 8821 (draf, selisih Rp 3) ----------
  const [fak3] = await db.insert(supplierInvoices).values({
    number: "8821",
    supplierId: sup2.id,
    poId: po4.id,
    invoiceDate: "2026-10-21",
    dueDate: "2026-11-20",
    printedTotal: 2130000,
    status: "draft",
    taxInvoiceComplete: false,
  }).$returningId();
  await db.insert(supplierInvoiceItems).values([
    { invoiceId: fak3.id, productId: pTensi.id, qty: 1, unitCost: 655000 },
    { invoiceId: fak3.id, productId: pMasker.id, qty: 20, unitCost: 38600 },
    { invoiceId: fak3.id, productId: pSarung.id, qty: 9, unitCost: 74800 },
    { invoiceId: fak3.id, productId: pSwab.id, qty: 1, unitCost: 29797 },
  ]);

  console.log("Done.");
  process.exit(0);
}

seed();
