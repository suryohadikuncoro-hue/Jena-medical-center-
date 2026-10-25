import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from "pdf-lib";

const COLORS = {
  ink: rgb(0.08, 0.1, 0.14),
  muted: rgb(0.35, 0.39, 0.45),
  line: rgb(0.82, 0.84, 0.87),
  soft: rgb(0.95, 0.96, 0.97),
  accent: rgb(0.19, 0.29, 0.38),
  white: rgb(1, 1, 1),
};

function money(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) current = next;
    else if (current) { lines.push(current); current = word; }
    else { lines.push(word); current = ""; }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function text(page: PDFPage, value: string, x: number, y: number, font: PDFFont, size = 9, color = COLORS.ink) {
  page.drawText(value, { x, y, size, font, color });
}

function rightText(page: PDFPage, value: string, right: number, y: number, font: PDFFont, size = 9, color = COLORS.ink) {
  text(page, value, right - font.widthOfTextAtSize(value, size), y, font, size, color);
}

function line(page: PDFPage, y: number, x1 = 42, x2 = 553, thickness = 1, color = COLORS.line) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
}

function footer(page: PDFPage, font: PDFFont, pageNo: number) {
  line(page, 38, 42, 553, 0.7);
  text(page, "Jena Business Suite · Jena Medical Center", 42, 24, font, 7, COLORS.muted);
  rightText(page, `Halaman ${pageNo}`, 553, 24, font, 7, COLORS.muted);
}

function header(page: PDFPage, title: string, number: string, date: string, bold: PDFFont, regular: PDFFont) {
  page.drawRectangle({ x: 0, y: 770, width: 595, height: 72, color: COLORS.accent });
  text(page, "JENA MEDICAL CENTER", 42, 810, bold, 16, COLORS.white);
  text(page, title, 42, 789, regular, 9, rgb(0.86, 0.9, 0.93));
  rightText(page, number, 553, 808, bold, 15, COLORS.white);
  rightText(page, date, 553, 788, regular, 9, rgb(0.86, 0.9, 0.93));
}

function infoBox(page: PDFPage, label: string, value: string, x: number, y: number, width: number, bold: PDFFont, regular: PDFFont) {
  page.drawRectangle({ x, y, width, height: 48, color: COLORS.soft, borderColor: COLORS.line, borderWidth: 0.7 });
  text(page, label.toUpperCase(), x + 12, y + 31, bold, 7, COLORS.muted);
  const lines = wrap(value || "-", regular, 9, width - 24);
  lines.slice(0, 2).forEach((v, i) => text(page, v, x + 12, y + 15 - i * 11, regular, 9));
}

function tableHeader(page: PDFPage, columns: Array<{ label: string; x: number; width: number; align?: "right" }>, y: number, bold: PDFFont) {
  page.drawRectangle({ x: 42, y: y - 8, width: 511, height: 25, color: COLORS.accent });
  for (const col of columns) {
    const x = col.align === "right" ? col.x + col.width - bold.widthOfTextAtSize(col.label, 8) : col.x;
    text(page, col.label, x, y, bold, 8, COLORS.white);
  }
}

function detailRow(page: PDFPage, values: Array<{ value: string; x: number; width: number; align?: "right" }>, y: number, regular: PDFFont, shaded: boolean) {
  if (shaded) page.drawRectangle({ x: 42, y: y - 8, width: 511, height: 24, color: COLORS.soft });
  for (const item of values) {
    const value = item.value.slice(0, 70);
    const x = item.align === "right" ? item.x + item.width - regular.widthOfTextAtSize(value, 8) : item.x;
    text(page, value, x, y, regular, 8, COLORS.ink);
  }
  line(page, y - 9, 42, 553, 0.5);
}

async function deliver(pdf: PDFDocument, filename: string, shareText: string) {
  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" });
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    try { await navigator.share({ text: shareText, files: [file] }); return; } catch (error) { if ((error as DOMException).name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
}

export async function shareInvoicePdf(inv: { number: string; issueDate: string; dueDate: string | null; customerName: string; customerAddress?: string | null; subtotal: number; ppnAmount: number; total: number }, items: Array<{ description: string; qty: number; unitPrice: number; discountPercent: number; ppnPercent: number }>) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  header(page, "INVOICE PELANGGAN", inv.number, inv.issueDate, bold, regular);
  infoBox(page, "Kepada", `${inv.customerName}${inv.customerAddress ? `\n${inv.customerAddress}` : ""}`, 42, 690, 310, bold, regular);
  infoBox(page, "Jatuh tempo", inv.dueDate || "-", 365, 690, 188, bold, regular);
  let y = 655;
  const cols = [{ label: "DESKRIPSI", x: 54, width: 225 }, { label: "QTY", x: 300, width: 42, align: "right" as const }, { label: "HARGA", x: 350, width: 90, align: "right" as const }, { label: "JUMLAH", x: 450, width: 91, align: "right" as const }];
  tableHeader(page, cols, y, bold); y -= 25;
  items.forEach((item, index) => { const net = item.qty * item.unitPrice - Math.round(item.qty * item.unitPrice * item.discountPercent / 100); detailRow(page, [{ value: item.description, x: 54, width: 225 }, { value: String(item.qty), x: 300, width: 42, align: "right" }, { value: money(item.unitPrice), x: 350, width: 90, align: "right" }, { value: money(net), x: 450, width: 91, align: "right" }], y, regular, index % 2 === 1); y -= 24; });
  y -= 18;
  const totalX = 390;
  line(page, y + 11, totalX, 553, 0.8, COLORS.accent);
  rightText(page, "Subtotal", 470, y - 5, regular, 9, COLORS.muted); rightText(page, money(inv.subtotal), 553, y - 5, regular, 9); y -= 21;
  rightText(page, "PPN", 470, y - 5, regular, 9, COLORS.muted); rightText(page, money(inv.ppnAmount), 553, y - 5, regular, 9); y -= 25;
  page.drawRectangle({ x: totalX, y: y - 9, width: 163, height: 34, color: COLORS.accent });
  text(page, "TOTAL", totalX + 12, y + 4, bold, 10, COLORS.white); rightText(page, money(inv.total), 541, y + 4, bold, 10, COLORS.white);
  footer(page, regular, 1);
  await deliver(pdf, `${inv.number}.pdf`, `Invoice ${inv.number} dari Jena Medical Center. Total ${money(inv.total)}. PDF terlampir jika perangkat mendukung berbagi file.`);
}

export async function sharePurchaseOrderPdf(order: { number: string; orderDate: string; supplierName: string }, items: Array<{ name: string; qty: number; unitCost: number }>) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  header(page, "PURCHASE ORDER SUPPLIER", order.number, order.orderDate, bold, regular);
  infoBox(page, "Supplier", order.supplierName, 42, 690, 310, bold, regular);
  infoBox(page, "Status", "Menunggu konfirmasi supplier", 365, 690, 188, bold, regular);
  let y = 655;
  const cols = [{ label: "BARANG", x: 54, width: 250 }, { label: "QTY", x: 320, width: 42, align: "right" as const }, { label: "HARGA MODAL", x: 370, width: 90, align: "right" as const }, { label: "JUMLAH", x: 465, width: 76, align: "right" as const }];
  tableHeader(page, cols, y, bold); y -= 25;
  let total = 0;
  items.forEach((item, index) => { const amount = item.qty * item.unitCost; total += amount; detailRow(page, [{ value: item.name, x: 54, width: 250 }, { value: String(item.qty), x: 320, width: 42, align: "right" }, { value: money(item.unitCost), x: 370, width: 90, align: "right" }, { value: money(amount), x: 465, width: 76, align: "right" }], y, regular, index % 2 === 1); y -= 24; });
  y -= 20;
  page.drawRectangle({ x: 350, y: y - 9, width: 203, height: 34, color: COLORS.accent });
  text(page, "TOTAL PERKIRAAN", 362, y + 4, bold, 9, COLORS.white); rightText(page, money(total), 541, y + 4, bold, 10, COLORS.white);
  y -= 55;
  text(page, "Mohon konfirmasi ketersediaan barang dan harga akhir.", 42, y, regular, 9, COLORS.muted);
  footer(page, regular, 1);
  await deliver(pdf, `${order.number}.pdf`, `PO ${order.number} dari Jena Medical Center kepada ${order.supplierName}. Perkiraan total ${money(total)}. PDF terlampir jika perangkat mendukung berbagi file.`);
}
