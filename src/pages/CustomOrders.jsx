import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Send, MessageCircle, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { uploadImage } from "@/api/imageUpload";
import { toast } from "sonner";

const WHATSAPP = "254110767199";

const PRODUCT_TYPES = ["Custom Sofa", "Wardrobe", "TV Stand", "Bed Frame", "Office Desk", "Dining Table", "Glass Partition", "Mirror", "Shower Glass", "Cabinet", "Shoe Rack", "Other Custom Item"];
const MATERIALS = ["Wood", "Metal", "Glass", "Fabric", "Leather", "Velvet", "Mixed Materials", "Not Sure Yet"];

export default function CustomOrders() {
  const [form, setForm] = useState({ customer_name: "", phone: "", product_type: "", measurements: "", preferred_material: "", budget: "", location: "", description: "" });
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setUploading(true);
      toast.info(`Uploading ${file.name}...`);
      const url = await uploadImage(file, 'custom-orders');
      setImage(url);
      toast.success("Image uploaded!");
    } catch (error) {
      console.error('[CustomOrder Upload] Error:', error);
      toast.error("Upload failed: " + (error.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: () => base44.entities.CustomOrderRequest.create({ ...form, reference_image: image }),
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error("Could not submit. Please try WhatsApp instead."),
  });

  if (submitted) {
    const waMsg = `Hello Craftsman Galore, I have a custom order request:\n\nProduct: ${form.product_type}\nMeasurements: ${form.measurements}\nMaterial: ${form.preferred_material}\nBudget: ${form.budget}\nLocation: ${form.location}\nDescription: ${form.description}\n\nMy name: ${form.customer_name}\nPhone: ${form.phone}`;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-white rounded-3xl border border-border p-10 shadow-xl">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="font-playfair text-2xl font-bold text-foreground">Request Received!</h2>
          <p className="text-muted-foreground">We've received your custom order request. Our team will contact you shortly to discuss your design.</p>
          <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
              <MessageCircle className="w-4 h-4" /> Also Send on WhatsApp
            </Button>
          </a>
          <Button variant="outline" className="w-full border-primary text-primary" onClick={() => setSubmitted(false)}>
            Submit Another Request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-[#f8f5ff] to-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
          <p className="text-gold text-sm font-medium uppercase tracking-widest mb-2">Bespoke Creations</p>
          <h1 className="font-playfair text-3xl lg:text-4xl font-bold text-foreground">Custom Order Request</h1>
          <p className="text-muted-foreground mt-2 max-w-lg">Have a specific design in mind? Share your vision and our master Kenyan woodcarvers and artisans will bring it to life. Sofas, beds, dining sets, wardrobes, or custom glass works — built to order and delivered nationwide.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-3xl border border-border p-6 lg:p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Your Name *</label>
              <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone Number *</label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XX XXX XXX" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Product Type *</label>
              <Select value={form.product_type} onValueChange={(v) => set("product_type", v)}>
                <SelectTrigger><SelectValue placeholder="What do you need?" /></SelectTrigger>
                <SelectContent>{PRODUCT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Preferred Material</label>
              <Select value={form.preferred_material} onValueChange={(v) => set("preferred_material", v)}>
                <SelectTrigger><SelectValue placeholder="Material" /></SelectTrigger>
                <SelectContent>{MATERIALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Measurements / Dimensions</label>
            <Input value={form.measurements} onChange={(e) => set("measurements", e.target.value)} placeholder="e.g. 2m wide × 1m deep × 90cm high" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Description & Requirements</label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} placeholder="Describe the colour, style, design features, special requests..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Your Budget (KSh)</label>
              <Input value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="e.g. KSh 50,000 - 70,000" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Your Location</label>
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="City or Town (e.g. Nairobi, Mombasa, Nakuru, Kisumu)" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Reference Image (optional)</label>
            {image ? (
              <div className="relative h-40 rounded-xl overflow-hidden border border-border">
                <img src={image} alt="Reference" className="w-full h-full object-cover" />
                <button onClick={() => setImage("")} className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white">
                  <span className="text-xs">✕</span>
                </button>
              </div>
            ) : (
              <label className="h-32 border-2 border-dashed border-border hover:border-primary/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/20 hover:bg-accent/10">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mt-2">{uploading ? "Uploading..." : "Upload reference photo"}</span>
                <span className="text-xs text-muted-foreground">PNG, JPG up to 10MB</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !form.customer_name || !form.phone || !form.product_type}
              className="flex-1 bg-primary hover:bg-primary/90 text-white h-12 gap-2 text-base"
            >
              <Send className="w-4 h-4" /> {submitMutation.isPending ? "Sending..." : "Submit Request"}
            </Button>
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hello, I want a custom ${form.product_type || "furniture"} order. My name is ${form.customer_name || "[name]"}. Can we discuss?`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-4 h-12 gap-2">
                <MessageCircle className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}