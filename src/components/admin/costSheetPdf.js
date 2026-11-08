// Production cost sheet for one inventory item, drawn as a vector PDF with jsPDF.
// Uses the same kit (jsPDF + logo) and look as the client invoices.
import { BUSINESS, clean, prettyDate, INK, GOLD, MUTED, RULE, SOFT } from "./invoice";
import { COST_TYPES, cents, money, num, lineTotal } from "./businessShared";

// Table cells drop the "KSh" so long amounts fit; the column headers say the currency
const amt = (n) => cents(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyText = (q) => String(Math.round(num(q) * 1000) / 1000);
const typeLabel = (t) => COST_TYPES.find((x) => x.value === t)?.label || "Other";

export const costSheetFileName = (sheet) =>
  `Cost-sheet ${sheet.name || "item"} ${sheet.date || ""}`.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") + ".pdf";

/**
 * sheet = { name, category, product, date, made, stock, selling_price, notes, lines, costs }
 * `lines` are saved cost lines ({ label, type, supplier, quantity, unit, unit_cost }); `costs` comes from itemCosts().
 */
export function drawCostSheet({ jsPDF, logo }, sheet) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, H = 297, M = 18, R = W - M, BOTTOM = 270;
  const ink = (c) => doc.setTextColor(...c);
  const font = (style, size) => { doc.setFont("helvetica", style); doc.setFontSize(size); };
  const { costs } = sheet;
  const made = Math.max(num(sheet.made) || 1, 1);

  doc.setProperties({ title: `Cost sheet - ${clean(sheet.name)}`, author: BUSINESS.name, subject: "Production cost sheet" });

  // Header band
  doc.setFillColor(...INK); doc.rect(0, 0, W, 5, "F");
  doc.setFillColor(...GOLD); doc.rect(0, 5, W, 1.2, "F");

  // Business block
  let y = 18;
  if (logo) doc.addImage(logo, "JPEG", M, y - 2, 22, 22);
  const bx = logo ? M + 26 : M;
  font("bold", 18); ink(INK); doc.text(BUSINESS.name, bx, y + 5);
  font("normal", 8.5); ink(GOLD); doc.text(BUSINESS.tagline.toUpperCase(), bx, y + 10, { charSpace: 0.3 });
  font("normal", 8.5); ink(MUTED);
  doc.text(`${BUSINESS.phone}   |   ${BUSINESS.email}`, bx, y + 15);
  doc.text(BUSINESS.location, bx, y + 19.5);

  // Title and sheet details
  font("bold", 22); ink(INK); doc.text("COST SHEET", R, y + 5, { align: "right" });
  const meta = [["Date made", sheet.date ? prettyDate(sheet.date) : "-"], ["Units made", String(made)]];
  if (sheet.stock != null && sheet.stock !== "") meta.push(["In stock", String(sheet.stock)]);
  meta.forEach(([k, v], i) => {
    const my = y + 12 + i * 5;
    font("normal", 8.5); ink(MUTED); doc.text(k, R - 32, my, { align: "right" });
    font("bold", 8.5); ink(INK); doc.text(clean(v), R, my, { align: "right" });
  });

  y = 50;
  doc.setDrawColor(...RULE); doc.setLineWidth(0.3); doc.line(M, y, R, y);

  // Item
  y += 9;
  font("bold", 7.5); ink(GOLD); doc.text("ITEM", M, y, { charSpace: 0.6 });
  font("bold", 13); ink(INK);
  const nameLines = doc.splitTextToSize(clean(sheet.name || "Untitled item"), R - M).slice(0, 2);
  doc.text(nameLines, M, y + 6.5);
  y += 6.5 + (nameLines.length - 1) * 5.5;
  const sub = [sheet.category, sheet.product && `Website product: ${sheet.product}`].filter(Boolean).join("   |   ");
  if (sub) { font("normal", 9); ink(MUTED); doc.text(clean(sub), M, y + 5.5); y += 5.5; }

  // Cost lines table
  y += 9;
  const col = { what: M + 3, type: 65, sup: 89, qty: 131, unit: 134, each: 168, total: R - 3 };
  const tableHead = () => {
    doc.setFillColor(...INK); doc.rect(M, y, R - M, 8.5, "F");
    font("bold", 7.5); ink([255, 255, 255]);
    const hy = y + 5.5, o = { charSpace: 0.3 };
    doc.text("WHAT", col.what, hy, o);
    doc.text("TYPE", col.type, hy, o);
    doc.text("SUPPLIER", col.sup, hy, o);
    // jsPDF mis-measures letter-spaced text when right-aligning, so these go without
    doc.text("QTY", col.qty, hy, { align: "right" });
    doc.text("UNIT", col.unit, hy, o);
    doc.text("EACH (KSh)", col.each, hy, { align: "right" });
    doc.text("TOTAL (KSh)", col.total, hy, { align: "right" });
    y += 8.5;
  };
  const newPage = () => { doc.addPage(); y = 18; };
  tableHead();

  if (!sheet.lines.length) {
    font("italic", 9); ink(MUTED); doc.text("No costs entered yet.", col.what, y + 7);
    y += 11;
  }
  sheet.lines.forEach((l, i) => {
    font("normal", 9);
    const what = doc.splitTextToSize(clean(l.label), 41);
    const sup = doc.splitTextToSize(clean(l.supplier || "-"), 39);
    const unit = doc.splitTextToSize(clean(l.unit || ""), 13);
    const h = Math.max(what.length, sup.length, unit.length) * 4.2 + 5;
    if (y + h > BOTTOM) { newPage(); tableHead(); font("normal", 9); }
    if (i % 2 === 1) { doc.setFillColor(...SOFT); doc.rect(M, y, R - M, h, "F"); }
    const ty = y + 5.8;
    ink(INK); doc.text(what, col.what, ty);
    ink(MUTED);
    doc.text(typeLabel(l.type), col.type, ty);
    doc.text(sup, col.sup, ty);
    doc.text(qtyText(l.quantity), col.qty, ty, { align: "right" });
    doc.text(unit, col.unit, ty);
    ink(INK); doc.text(amt(l.unit_cost), col.each, ty, { align: "right" });
    font("bold", 9); doc.text(amt(lineTotal(l)), col.total, ty, { align: "right" });
    y += h;
  });
  doc.setDrawColor(...RULE); doc.line(M, y, R, y);

  // Summary: breakdown by type on the left, totals card on the right
  const types = COST_TYPES.filter((t) => costs.byType[t.value] > 0);
  const notes = sheet.notes?.trim() ? doc.splitTextToSize(clean(sheet.notes.trim()), R - M) : [];
  const summaryH = Math.max(14 + types.length * 9, 52) + (notes.length ? 14 + notes.length * 4.4 : 0);
  if (y + 10 + summaryH > BOTTOM) newPage();
  y += 10;

  const top = y;
  font("bold", 7.5); ink(GOLD); doc.text("COST BREAKDOWN", M, y, { charSpace: 0.6 });
  y += 6;
  const barW = 84;
  types.forEach((t) => {
    const v = costs.byType[t.value];
    const share = costs.total ? v / costs.total : 0;
    font("normal", 9); ink(INK); doc.text(t.label, M, y);
    ink(MUTED); doc.text(`${(share * 100).toFixed(1)}%`, M + barW - 26, y, { align: "right" });
    font("bold", 9); ink(INK); doc.text(money(v), M + barW, y, { align: "right" });
    doc.setFillColor(...RULE); doc.rect(M, y + 1.8, barW, 1.6, "F");
    doc.setFillColor(...GOLD); doc.rect(M, y + 1.8, Math.max(barW * share, 0.4), 1.6, "F");
    y += 9;
  });
  if (!types.length) { font("italic", 9); ink(MUTED); doc.text("Nothing to break down yet.", M, y); y += 9; }

  // Totals card
  const cardW = 74, cardX = R - cardW;
  const rows = [[`Total for ${made} unit${made === 1 ? "" : "s"}`, money(costs.total)]];
  const price = num(sheet.selling_price);
  if (price) rows.push(["Planned selling price", money(price)]);
  const cardH = 25 + rows.length * 6.5 + (costs.profit !== null ? 7 : 0);
  doc.setFillColor(...SOFT); doc.setDrawColor(...RULE); doc.roundedRect(cardX, top - 4, cardW, cardH, 2, 2, "FD");
  font("bold", 7.5); ink(MUTED); doc.text("COST PER UNIT", cardX + 5, top + 3, { charSpace: 0.5 });
  font("bold", 16); ink(INK); doc.text(money(costs.unit), cardX + 5, top + 11.5);
  let cy = top + 19;
  rows.forEach(([k, v]) => {
    font("normal", 8.5); ink(MUTED); doc.text(k, cardX + 5, cy);
    font("bold", 8.5); ink(INK); doc.text(v, cardX + cardW - 5, cy, { align: "right" });
    cy += 6.5;
  });
  if (costs.profit !== null) {
    const loss = costs.profit < 0;
    const tone = loss ? [185, 28, 28] : [21, 128, 61];
    font("bold", 8.5); ink(tone);
    doc.text(`${loss ? "Loss" : "Profit"} per unit`, cardX + 5, cy);
    doc.text(`${money(costs.profit)} (${costs.margin.toFixed(1)}%)`, cardX + cardW - 5, cy, { align: "right" });
  }
  y = Math.max(y, top - 4 + cardH) + 6;

  if (notes.length) {
    font("bold", 7.5); ink(GOLD); doc.text("NOTES", M, y, { charSpace: 0.6 });
    font("normal", 9); ink(INK); doc.text(notes, M, y + 5.5);
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  const printed = prettyDate(new Date().toISOString().slice(0, 10));
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...RULE); doc.setLineWidth(0.3); doc.line(M, 280, R, 280);
    font("normal", 7.5); ink(MUTED);
    doc.text(`Internal production cost sheet  |  ${BUSINESS.name}  |  Printed ${printed}`, M, 285);
    doc.text(`Page ${p} of ${pages}`, R, 285, { align: "right" });
    doc.setFillColor(...GOLD); doc.rect(0, H - 3, W, 3, "F");
  }

  return doc;
}
