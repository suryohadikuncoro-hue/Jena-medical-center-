import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function money(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

async function makePdf(title: string, lines: string[]) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 790;
  const draw = (text: string, size = 10, strong = false) => {
    if (y < 55) { page = pdf.addPage([595, 842]); y = 790; }
    page.drawText(text.slice(0, 105), { x: 42, y, size, font: strong ? bold : font, color: rgb(0.08, 0.1, 0.14) });
    y -= size + 8;
  };
  draw("JENA MEDICAL CENTER", 18, true);
  draw(title, 13, true);
  y -= 8;
  page.drawLine({ start: { x: 42, y }, end: { x: 553, y }, thickness: 1, color: rgb(0.2, 0.25, 0.3) });
  y -= 20;
  for (const line of lines) draw(line);
  draw("Dokumen ini dibuat dari Jena Business Suite.", 8);
  return pdf;
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

export async function shareInvoicePdf(inv: { number: string; issueDate: string; dueDate: string | null; customerName: string; subtotal: number; ppnAmount: number; total: number }, items: Array<{ description: string; qty: number; unitPrice: number; discountPercent: number; ppnPercent: number }>) {
  const lines = [`Kepada: ${inv.customerName}`, `Nomor: ${inv.number}`, `Tanggal: ${inv.issueDate}`, `Jatuh tempo: ${inv.dueDate ?? "-"}`, "", "RINCIAN"];
  for (const item of items) lines.push(`${item.description} | ${item.qty} x ${money(item.unitPrice)} | diskon ${item.discountPercent}% | PPN ${item.ppnPercent}%`);
  lines.push("", `Subtotal: ${money(inv.subtotal)}`, `PPN: ${money(inv.ppnAmount)}`, `TOTAL: ${money(inv.total)}`);
  await deliver(await makePdf(`INVOICE ${inv.number}`, lines), `${inv.number}.pdf`, `Invoice ${inv.number} dari Jena Medical Center. Total ${money(inv.total)}. PDF terlampir jika perangkat mendukung berbagi file.`);
}

export async function sharePurchaseOrderPdf(order: { number: string; orderDate: string; supplierName: string }, items: Array<{ name: string; qty: number; unitCost: number }>) {
  const lines = [`Kepada: ${order.supplierName}`, `Nomor PO: ${order.number}`, `Tanggal: ${order.orderDate}`, "", "RINCIAN BARANG"];
  let total = 0;
  for (const item of items) { total += item.qty * item.unitCost; lines.push(`${item.name} | ${item.qty} | ${money(item.unitCost)} | ${money(item.qty * item.unitCost)}`); }
  lines.push("", `Perkiraan total: ${money(total)}`, "Mohon konfirmasi ketersediaan dan harga.");
  await deliver(await makePdf(`PURCHASE ORDER ${order.number}`, lines), `${order.number}.pdf`, `PO ${order.number} dari Jena Medical Center kepada ${order.supplierName}. Perkiraan total ${money(total)}. PDF terlampir jika perangkat mendukung berbagi file.`);
}
