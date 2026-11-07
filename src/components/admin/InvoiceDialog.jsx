import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Eye, Mail, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, Modal, money } from "./businessShared";
import { Pill, formatDate } from "./adminShared";
import { loadInvoiceKit, drawInvoice, invoiceFileName, invoiceMessage, waPhone, BUSINESS } from "./invoice";

const PAYMENT_PREF = "invoice-payment-details";
const readPref = () => { try { return localStorage.getItem(PAYMENT_PREF) || ""; } catch { return ""; } };
const savePref = (v) => { try { localStorage.setItem(PAYMENT_PREF, v); } catch { /* private mode */ } };

const STATUS_TONE = { paid: "green", partial: "amber", unpaid: "red", refunded: "gray" };
const STATUS_TEXT = { paid: "Paid", partial: "Part paid", unpaid: "Unpaid", refunded: "Refunded" };

/** Preview, download and send a PDF invoice for one sale or order. `invoice` comes from saleInvoice()/orderInvoice(). */
export default function InvoiceDialog({ invoice, onClose }) {
  const [kit, setKit] = useState(null);
  const [email, setEmail] = useState(invoice.client.email);
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState(readPref);

  useEffect(() => {
    let live = true;
    loadInvoiceKit()
      .then((k) => live && setKit(k))
      .catch((e) => toast.error("Couldn't load the PDF tools: " + (e.message || "check your connection")));
    return () => { live = false; };
  }, []);

  const inv = { ...invoice, client: { ...invoice.client, email: email.trim() } };
  const fileName = invoiceFileName(inv);
  const message = invoiceMessage(inv);

  const build = () => {
    savePref(payment);
    return drawInvoice(kit, inv, { note, payment });
  };

  // Phones (and some desktops) can hand the PDF straight to WhatsApp, Gmail, etc.
  const shareFile = async (doc) => {
    const file = new File([doc.output("blob")], fileName, { type: "application/pdf" });
    if (!navigator.canShare?.({ files: [file] })) return false;
    try {
      await navigator.share({ files: [file], title: `Invoice ${inv.number}`, text: message });
    } catch (e) {
      if (e.name !== "AbortError") throw e;
    }
    return true;
  };

  const run = (fn) => async () => {
    try { await fn(); } catch (e) { toast.error("Something went wrong: " + (e.message || "unknown error")); }
  };

  const preview = run(() => {
    const url = build().output("bloburl");
    if (!window.open(url, "_blank")) toast.error("Allow pop-ups to preview the invoice");
  });

  const download = run(() => {
    build().save(fileName);
    toast.success("Invoice downloaded");
  });

  const whatsapp = run(async () => {
    const doc = build();
    if (await shareFile(doc)) return;
    doc.save(fileName);
    const phone = waPhone(inv.client.phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    toast.success("PDF downloaded - attach it in the WhatsApp chat", { duration: 6000 });
  });

  const sendEmail = run(async () => {
    const doc = build();
    if (inv.client.email) navigator.clipboard?.writeText(inv.client.email).catch(() => {});
    if (await shareFile(doc)) {
      if (inv.client.email) toast.success("Client's email copied - paste it into the To field");
      return;
    }
    doc.save(fileName);
    const subject = `Invoice ${inv.number} from ${BUSINESS.name}`;
    window.location.href = `mailto:${encodeURIComponent(inv.client.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    toast.success("PDF downloaded - attach it to the email", { duration: 6000 });
  });

  const ready = !!kit;

  return (
    <Modal
      title={`Invoice ${inv.number}`}
      onClose={onClose}
      footer={
        <>
          <div className="flex gap-2">
            <Button variant="outline" onClick={preview} disabled={!ready} className="gap-2"><Eye className="w-4 h-4" /> Preview</Button>
            <Button variant="outline" onClick={download} disabled={!ready} className="gap-2"><Download className="w-4 h-4" /> PDF</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={sendEmail} disabled={!ready} className="gap-2"><Mail className="w-4 h-4" /> Email</Button>
            <Button onClick={whatsapp} disabled={!ready} className="gap-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white">
              {ready ? <MessageCircle className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />} WhatsApp
            </Button>
          </div>
        </>
      }
    >
      <div className="rounded-md border border-black/10 p-4 text-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Bill to</p>
            <p className="font-semibold text-obsidian">{inv.client.name}</p>
            {inv.client.phone && <p className="text-muted-foreground">{inv.client.phone}</p>}
            {inv.client.address && <p className="text-muted-foreground">{inv.client.address}</p>}
          </div>
          <div className="text-right">
            <Pill tone={STATUS_TONE[inv.status]}>{STATUS_TEXT[inv.status]}</Pill>
            <p className="text-xs text-muted-foreground mt-1">{formatDate(inv.date)}</p>
          </div>
        </div>
        <div className="border-t border-black/5 pt-3 space-y-1">
          {inv.lines.map((l, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span>{l.description} <span className="text-muted-foreground">× {l.quantity}</span></span>
              <span>{money(l.amount)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-black/5 pt-3 space-y-1">
          <div className="flex justify-between text-muted-foreground"><span>Paid</span><span>{money(inv.paid)}</span></div>
          <div className="flex justify-between font-semibold text-obsidian"><span>Balance due</span><span>{money(inv.balance)}</span></div>
        </div>
      </div>

      <Field label="Client email" hint="Optional - used by the Email button">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
      </Field>
      <Field label="Payment details" hint="Shown on every invoice. Remembered on this device.">
        <Textarea rows={2} value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="e.g. M-Pesa Till No. 123456 - Craftsman Galore" />
      </Field>
      <Field label="Note to client" hint="Optional - delivery date, warranty, etc.">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Delivery on Saturday. 1-year warranty on frame." />
      </Field>
      <p className="text-xs text-muted-foreground">
        On a phone, WhatsApp and Email open your share menu with the PDF attached. On a computer the PDF downloads and the chat or email opens, so you can attach it.
      </p>
    </Modal>
  );
}
