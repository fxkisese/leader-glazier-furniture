import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, MessageCircle, MapPin, Mail, Send, CheckCircle2 } from "lucide-react";

const WHATSAPP = "254722914819";

export default function Contact() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const waMsg = `Hello Craftsman Galore,\n\nMy name is ${form.name}.\nPhone: ${form.phone}\nEmail: ${form.email}\n\nMessage: ${form.message}`;

  const handleSend = () => {
    if (!form.name || !form.message) return;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waMsg)}`, "_blank");
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-[#f8f5ff] to-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <p className="text-gold text-sm font-medium uppercase tracking-widest mb-2">Get In Touch</p>
          <h1 className="font-playfair text-3xl lg:text-4xl font-bold text-foreground">Contact Us</h1>
          <p className="text-muted-foreground mt-2 max-w-lg">Have a question, want a quote, or need advice on furniture or glass? Reach out and we'll respond quickly.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="font-playfair text-2xl font-bold text-foreground mb-6">How to Reach Us</h2>
              <div className="space-y-5">
                {[
                  { icon: MessageCircle, title: "WhatsApp (Fastest)", value: "+254 722 914 819", href: `https://wa.me/${WHATSAPP}`, color: "text-green-600", bg: "bg-green-50" },
                  { icon: Phone, title: "Phone Call", value: "+254 722 914 819", href: `tel:+${WHATSAPP}`, color: "text-primary", bg: "bg-primary/5" },
                  { icon: Mail, title: "Email", value: "info@craftsmansgalore.co.ke", href: "mailto:info@craftsmansgalore.co.ke", color: "text-primary", bg: "bg-primary/5" },
                  { icon: MapPin, title: "Location", value: "Nairobi, Kenya — Delivery across Nairobi", href: null, color: "text-primary", bg: "bg-primary/5" },
                ].map(({ icon: Icon, title, value, href, color, bg }) => (
                  <div key={title} className="flex items-start gap-4 p-4 rounded-2xl border border-border hover:border-primary/20 transition-colors">
                    <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{title}</p>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className={`font-medium text-sm hover:underline ${color}`}>{value}</a>
                      ) : (
                        <p className="font-medium text-sm text-foreground">{value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary rounded-3xl p-6 text-primary-foreground space-y-3">
              <h3 className="font-playfair font-bold text-xl">Quick WhatsApp Message</h3>
              <p className="text-primary-foreground/70 text-sm">The fastest way to reach us is on WhatsApp. We typically respond within minutes during business hours.</p>
              <a href={`https://wa.me/${WHATSAPP}?text=Hello%20Craftsman%20Galore,%20I%20need%20help%20with%20a%20quote.`} target="_blank" rel="noopener noreferrer">
                <Button className="bg-green-500 hover:bg-green-400 text-white gap-2">
                  <MessageCircle className="w-4 h-4" /> Open WhatsApp Chat
                </Button>
              </a>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-3xl border border-border p-6 lg:p-8 space-y-5">
            {sent ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="font-playfair text-xl font-bold">Message Sent on WhatsApp</h3>
                <p className="text-muted-foreground text-sm">Your message was opened in WhatsApp. We'll reply shortly.</p>
                <Button variant="outline" className="border-primary text-primary" onClick={() => setSent(false)}>Send Another</Button>
              </div>
            ) : (
              <>
                <h2 className="font-playfair text-xl font-bold text-foreground">Send Us a Message</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium mb-1 block">Your Name *</label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" /></div>
                  <div><label className="text-sm font-medium mb-1 block">Phone</label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="07XX XXX XXX" /></div>
                </div>
                <div><label className="text-sm font-medium mb-1 block">Email</label><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" type="email" /></div>
                <div><label className="text-sm font-medium mb-1 block">Message *</label><Textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} rows={5} placeholder="Tell us what you need — furniture, glass quote, custom order..." /></div>
                <Button onClick={handleSend} disabled={!form.name || !form.message} className="w-full bg-green-600 hover:bg-green-700 text-white h-12 gap-2 text-base">
                  <Send className="w-4 h-4" /> Send via WhatsApp
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}