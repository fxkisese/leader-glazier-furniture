// Client invoices for a single sale or online order, drawn as a vector PDF with jsPDF.
import { cents, money, num } from "./businessShared";

export const BUSINESS = {
  name: "Craftsman Galore",
  tagline: "Handcrafted Kenyan Furniture & Glass",
  phone: "+254 110 767 199",
  email: "furniture@craftsmangalore.homes",
  location: "Nairobi & Machakos, Kenya",
  instagram: "@craftsman_galore",
};

const PAYMENT_LABELS = { mpesa: "M-Pesa", cash: "Cash", bank: "Bank transfer", card: "Card", stripe: "Card", other: "Other" };

const STATUS = {
  paid: { label: "PAID", color: [21, 128, 61], soft: [220, 252, 231] },
  partial: { label: "PART PAID", color: [180, 83, 9], soft: [254, 243, 199] },
  unpaid: { label: "UNPAID", color: [185, 28, 28], soft: [254, 226, 226] },
  refunded: { label: "REFUNDED", color: [75, 85, 99], soft: [229, 231, 235] },
};

const statusFor = (total, paid, refunded) =>
  refunded ? "refunded" : paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";

// Same record always gets the same number, e.g. INV-261107-A3F9
const invoiceNumber = (date, id = "") =>
  `INV-${date.replace(/-/g, "").slice(2, 8)}-${String(id).slice(-4).toUpperCase()}`;

const isoDay = (r) => r.date || (r.created_at ? String(r.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10));

/** Invoice data for a sale recorded in the Sales tab. */
export function saleInvoice(sale, customer) {
  const qty = num(sale.quantity) || 1;
  const total = cents(sale.amount);
  // Older sales without amount_paid count as paid unless their status says otherwise
  const paid = sale.amount_paid != null ? cents(sale.amount_paid) : (sale.status || "paid") === "paid" ? total : 0;
  const date = isoDay(sale);
  return {
    number: invoiceNumber(date, sale.id),
    date,
    client: {
      name: sale.customer_name || customer?.name || "Walk-in customer",
      phone: sale.customer_phone || customer?.phone || "",
      email: customer?.email || "",
      address: customer?.location || "",
    },
    lines: [{ description: sale.product_name || "Furniture", quantity: qty, unit_price: cents(sale.unit_price ?? total / qty), amount: total }],
    total,
    paid,
    balance: Math.max(cents(total - paid), 0),
    status: statusFor(total, paid),
    payment_method: PAYMENT_LABELS[sale.payment_method] || "",
    reference: "",
  };
}

/** Invoice data for an online order from the Orders tab. */
export function orderInvoice(order) {
  const total = cents(order.total_amount);
  const paid = cents(order.amount_paid);
  const date = isoDay(order);
  const itemPrice = num(order.product_price) > 0 ? cents(order.product_price) : total;
  const lines = [{ description: order.product_name || "Furniture", quantity: 1, unit_price: itemPrice, amount: itemPrice }];
  const extra = cents(total - itemPrice);
  if (extra > 0) lines.push({ description: "Delivery & other charges", quantity: 1, unit_price: extra, amount: extra });
  return {
    number: invoiceNumber(date, order.id),
    date,
    client: {
      name: order.customer_name || "Customer",
      phone: order.customer_phone || "",
      email: order.customer_email || "",
      address: order.delivery_address || "",
    },
    lines,
    total,
    paid,
    balance: order.balance_due != null ? Math.max(cents(order.balance_due), 0) : Math.max(cents(total - paid), 0),
    status: statusFor(total, paid, order.payment_status === "refunded"),
    payment_method: PAYMENT_LABELS[order.payment_method] || "",
    reference: order.mpesa_receipt_number ? `M-Pesa ${order.mpesa_receipt_number}` : "",
  };
}

/** 0712 345 678 / +254712345678 / 712345678 -> 254712345678 for wa.me links. */
export function waPhone(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0")) d = "254" + d.slice(1);
  else if (d.length === 9) d = "254" + d;
  return d;
}

export const invoiceFileName = (inv) =>
  `${inv.number} ${inv.client.name}`.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") + ".pdf";

export function invoiceMessage(inv) {
  const first = inv.client.name.split(" ")[0];
  const greet = inv.client.name === "Walk-in customer" ? "Hello" : `Hello ${first}`;
  const parts = [
    `${greet}, please find attached invoice ${inv.number} from ${BUSINESS.name}.`,
    `Total: ${money(inv.total)}`,
    inv.balance > 0 ? `Paid: ${money(inv.paid)}\nBalance due: ${money(inv.balance)}` : "Fully paid - thank you!",
    `Thank you for choosing ${BUSINESS.name}.`,
  ];
  return parts.join("\n");
}

const prettyDate = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

// Standard PDF fonts only cover Latin-1, so swap smart punctuation and drop anything else
const clean = (s) => String(s ?? "")
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...")
  .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "");

async function loadLogo() {
  try {
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}favicon.png`;
    await img.decode();
    // The source has wide white margins; crop to the chair and shrink so the PDF stays small
    const s = img.naturalWidth, crop = s * 0.62, off = s * 0.19, out = 240;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = out;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, out, out);
    ctx.drawImage(img, off, off, crop, crop, 0, 0, out, out);
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return null;
  }
}

/** Loads jsPDF and the logo once, so the PDF can then be built synchronously inside a click (needed for sharing). */
let kitPromise;
export function loadInvoiceKit() {
  kitPromise ??= Promise.all([import("jspdf"), loadLogo()]).then(([mod, logo]) => ({ jsPDF: mod.jsPDF, logo }));
  kitPromise.catch(() => { kitPromise = undefined; });
  return kitPromise;
}

const INK = [43, 33, 27];
const GOLD = [176, 122, 69];
const MUTED = [112, 102, 95];
const RULE = [228, 222, 215];
const SOFT = [249, 246, 242];

/** Draws the invoice. `extra` = { note, payment } typed in the invoice dialog. Returns a jsPDF document. */
export function drawInvoice({ jsPDF, logo }, inv, extra = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 18, R = W - M;
  const ink = (c) => doc.setTextColor(...c);
  const font = (style, size) => { doc.setFont("helvetica", style); doc.setFontSize(size); };
  const status = STATUS[inv.status] || STATUS.unpaid;

  doc.setProperties({ title: `Invoice ${inv.number}`, author: BUSINESS.name, subject: `Invoice for ${clean(inv.client.name)}` });

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

  // Title and invoice details
  font("bold", 26); ink(INK); doc.text("INVOICE", R, y + 6, { align: "right" });
  const meta = [["Invoice no.", inv.number], ["Date", prettyDate(inv.date)]];
  if (inv.reference) meta.push(["Payment ref.", inv.reference]);
  meta.forEach(([k, v], i) => {
    const my = y + 13 + i * 5;
    font("normal", 8.5); ink(MUTED); doc.text(k, R - 40, my, { align: "right" });
    font("bold", 8.5); ink(INK); doc.text(clean(v), R, my, { align: "right" });
  });

  y = 50;
  doc.setDrawColor(...RULE); doc.setLineWidth(0.3); doc.line(M, y, R, y);

  // Bill to
  y += 9;
  font("bold", 7.5); ink(GOLD); doc.text("BILL TO", M, y, { charSpace: 0.6 });
  font("bold", 12.5); ink(INK); doc.text(clean(inv.client.name), M, y + 6.5);
  font("normal", 9); ink(MUTED);
  let cy = y + 12;
  [inv.client.phone, inv.client.email].filter(Boolean).forEach((t) => { doc.text(clean(t), M, cy); cy += 4.6; });
  if (inv.client.address) {
    const lines = doc.splitTextToSize(clean(inv.client.address), 95).slice(0, 3);
    doc.text(lines, M, cy); cy += lines.length * 4.6;
  }

  // Amount due card
  const cardW = 62, cardX = R - cardW, cardY = y - 4, cardH = 26;
  doc.setFillColor(...SOFT); doc.setDrawColor(...RULE); doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, "FD");
  font("bold", 7.5); ink(MUTED); doc.text(inv.balance > 0 ? "BALANCE DUE" : "AMOUNT PAID", cardX + 5, cardY + 7, { charSpace: 0.5 });
  font("bold", 15); ink(INK); doc.text(money(inv.balance > 0 ? inv.balance : inv.paid), cardX + 5, cardY + 15);
  font("bold", 7.5);
  const badgeW = doc.getTextWidth(status.label) + status.label.length * 0.3 + 7;
  doc.setFillColor(...status.soft); doc.roundedRect(cardX + 5, cardY + 18.5, badgeW, 5, 2.5, 2.5, "F");
  ink(status.color); doc.text(status.label, cardX + 5 + badgeW / 2, cardY + 22, { align: "center", charSpace: 0.3 });

  // Items table
  y = Math.max(cy, cardY + cardH) + 10;
  const col = { desc: M + 4, qty: 122, unit: 156, amt: R - 4 };
  doc.setFillColor(...INK); doc.rect(M, y, R - M, 9, "F");
  font("bold", 8); ink([255, 255, 255]);
  doc.text("DESCRIPTION", col.desc, y + 5.8, { charSpace: 0.4 });
  doc.text("QTY", col.qty, y + 5.8, { align: "right", charSpace: 0.4 });
  doc.text("UNIT PRICE", col.unit, y + 5.8, { align: "right", charSpace: 0.4 });
  doc.text("AMOUNT", col.amt, y + 5.8, { align: "right", charSpace: 0.4 });
  y += 9;

  inv.lines.forEach((l, i) => {
    font("normal", 9.5);
    const desc = doc.splitTextToSize(clean(l.description), 88);
    const h = Math.max(11, desc.length * 4.6 + 6.4);
    if (i % 2 === 1) { doc.setFillColor(...SOFT); doc.rect(M, y, R - M, h, "F"); }
    ink(INK); doc.text(desc, col.desc, y + 7);
    ink(MUTED);
    doc.text(String(l.quantity), col.qty, y + 7, { align: "right" });
    doc.text(money(l.unit_price), col.unit, y + 7, { align: "right" });
    font("bold", 9.5); ink(INK); doc.text(money(l.amount), col.amt, y + 7, { align: "right" });
    y += h;
  });
  doc.setDrawColor(...RULE); doc.line(M, y, R, y);

  // Totals
  let ty = y + 8;
  const tl = 128;
  const totalRow = (label, value) => {
    font("normal", 9.5); ink(MUTED); doc.text(label, tl, ty);
    ink(INK); doc.text(value, col.amt, ty, { align: "right" });
    ty += 6.5;
  };
  totalRow("Subtotal", money(inv.total));
  totalRow(inv.payment_method ? `Paid (${inv.payment_method})` : "Paid", inv.paid > 0 ? `- ${money(inv.paid)}` : money(0));
  doc.setFillColor(...INK); doc.rect(tl - 4, ty - 4.5, R - tl + 4, 10, "F");
  font("bold", 10.5); ink([255, 255, 255]);
  doc.text("Balance due", tl, ty + 2);
  doc.text(money(inv.balance), col.amt, ty + 2, { align: "right" });
  ty += 10;

  // Payment details and note, left of the totals
  let ly = y + 8;
  const block = (title, text) => {
    if (!text?.trim()) return;
    font("bold", 7.5); ink(GOLD); doc.text(title, M, ly, { charSpace: 0.6 });
    font("normal", 9); ink(INK);
    const lines = doc.splitTextToSize(clean(text.trim()), 92);
    doc.text(lines, M, ly + 5.5);
    ly += 5.5 + lines.length * 4.4 + 5;
  };
  block("PAYMENT DETAILS", extra.payment);
  block("NOTE", extra.note);

  // Footer
  const fy = 280;
  doc.setDrawColor(...RULE); doc.line(M, fy - 7, R, fy - 7);
  font("bold", 10); ink(INK); doc.text(`Thank you for choosing ${BUSINESS.name}!`, W / 2, fy - 1, { align: "center" });
  font("normal", 8); ink(MUTED);
  doc.text(`${BUSINESS.phone}   |   ${BUSINESS.email}   |   Instagram ${BUSINESS.instagram}`, W / 2, fy + 4, { align: "center" });
  doc.setFillColor(...GOLD); doc.rect(0, 297 - 3, W, 3, "F");

  return doc;
}
