import { useEffect, useState } from "react";
import { X, Upload, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { uploadImage } from "@/api/imageUpload";
import { toast } from "sonner";
import { PRODUCT_CATEGORIES as CATEGORIES } from "./adminShared";

const LABELS = [{ v: "", l: "None" }, { v: "new-arrival", l: "New Arrival" }, { v: "best-seller", l: "Best Seller" }, { v: "limited-offer", l: "Limited Offer" }, { v: "custom-order", l: "Custom Order" }];
const STOCK = ["in-stock", "out-of-stock", "made-to-order"];

function NativeSelect({ value, onChange, children, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`flex h-9 w-full items-center rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring capitalize ${className}`}
    >
      {children}
    </select>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export default function AddProductModal({ product, onClose, onSaved }) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name || "",
    category: product?.category || "sofas",
    price: product?.price || "",
    discount_price: product?.discount_price || "",
    description: product?.description || "",
    material: product?.material || "",
    dimensions: product?.dimensions || "",
    colors: product?.colors || "",
    seating_capacity: product?.seating_capacity || "",
    stock_status: product?.stock_status || "in-stock",
    label: product?.label || "",
    is_featured: product?.is_featured || false,
    // Drafts without a price open unpublished; publishing happens once a price is set
    is_published: product ? product.is_published !== false : true,
    delivery_note: product?.delivery_note || "",
    whatsapp_message: product?.whatsapp_message || "",
    images: product?.images || [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = saving || uploading;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        uploadedUrls.push(await uploadImage(file, "products"));
      }
      setForm((f) => ({ ...f, images: [...f.images, ...uploadedUrls] }));
      toast.success(`Uploaded ${files.length} photo${files.length === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error("Upload failed: " + (error.message || "Unknown error"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (i) => set("images", form.images.filter((_, idx) => idx !== i));
  const makeCover = (i) => set("images", [form.images[i], ...form.images.filter((_, idx) => idx !== i)]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter a product name");
      return;
    }
    const price = parseFloat(form.price) || 0;
    if (form.is_published && price <= 0) {
      toast.error("Add a price before publishing, or untick “Published” to save as a draft");
      return;
    }

    setSaving(true);
    try {
      // Empty strings become null for optional fields
      const data = {
        name: form.name.trim(),
        category: form.category || "sofas",
        price,
        discount_price: form.discount_price ? parseFloat(form.discount_price) : null,
        description: form.description || null,
        material: form.material || null,
        dimensions: form.dimensions || null,
        colors: form.colors || null,
        seating_capacity: form.seating_capacity || null,
        stock_status: form.stock_status || "in-stock",
        label: form.label || null,
        is_featured: form.is_featured || false,
        is_published: form.is_published,
        delivery_note: form.delivery_note || null,
        whatsapp_message: form.whatsapp_message || null,
        images: form.images || [],
      };

      // Strip nulls for optional fields — Convex uses undefined, not null
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== null)
      );
      if (isEdit) await base44.entities.Product.update(product._id ?? product.id, cleanData);
      else await base44.entities.Product.create(cleanData);

      toast.success(isEdit ? "Product updated" : "Product added");
      onSaved();
    } catch (err) {
      toast.error(/fetch/i.test(err.message || "")
        ? "Save failed: can't reach the database. Check your internet connection and VITE_CONVEX_URL in your .env settings."
        : "Save failed: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete “${product.name}” permanently? This cannot be undone.`)) return;
    try {
      await base44.entities.Product.delete(product._id ?? product.id);
      toast.success("Product deleted");
      onSaved();
    } catch (err) {
      toast.error("Delete failed: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div role="dialog" aria-modal="true" className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
          <h2 className="font-semibold text-lg text-obsidian">{isEdit ? "Edit product" : "Add product"}</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-md hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Images */}
          <div>
            <label className="text-sm font-medium mb-1 block">Photos</label>
            <p className="text-xs text-muted-foreground mb-2">The first photo is the cover. Click another photo's star to make it the cover.</p>
            <div className="flex flex-wrap gap-3">
              {form.images.map((img, i) => (
                <div key={img + i} className={`relative w-20 h-20 rounded-md overflow-hidden border group ${i === 0 ? "border-obsidian ring-1 ring-obsidian" : "border-black/10"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                    {i > 0 && (
                      <button type="button" onClick={() => makeCover(i)} aria-label="Make cover photo" className="p-1.5 text-white hover:text-gold text-xs">★</button>
                    )}
                    <button type="button" onClick={() => removeImage(i)} aria-label="Remove photo" className="p-1.5 text-white hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-obsidian/80 text-white text-[9px] text-center py-0.5">Cover</span>}
                </div>
              ))}
              <label className={`w-20 h-20 rounded-md border-2 border-dashed border-black/15 hover:border-obsidian/40 flex flex-col items-center justify-center transition-colors bg-muted/30 ${uploading ? "cursor-wait" : "cursor-pointer"}`}>
                {uploading ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                <span className="text-[10px] text-muted-foreground mt-1">{uploading ? "Uploading" : "Add"}</span>
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Product name *">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Grey L-Shaped Sofa" />
            </Field>
            <Field label="Category *">
              <NativeSelect value={form.category} onChange={(v) => set("category", v)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/-/g, " ")}</option>)}
              </NativeSelect>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Price (KSh) *">
              <Input value={form.price} onChange={(e) => set("price", e.target.value)} type="number" min="0" placeholder="65000" />
            </Field>
            <Field label="Sale price (optional)" hint="Shown instead of the price, with the price crossed out.">
              <Input value={form.discount_price} onChange={(e) => set("discount_price", e.target.value)} type="number" min="0" placeholder="58000" />
            </Field>
          </div>

          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="What makes this piece special…" />
          </Field>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Material">
              <Input value={form.material} onChange={(e) => set("material", e.target.value)} placeholder="Velvet, Mahogany…" />
            </Field>
            <Field label="Dimensions">
              <Input value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="200 × 90 × 80 cm" />
            </Field>
            <Field label="Seating">
              <Input value={form.seating_capacity} onChange={(e) => set("seating_capacity", e.target.value)} placeholder="5 people" />
            </Field>
          </div>

          <Field label="Available colours">
            <Input value={form.colors} onChange={(e) => set("colors", e.target.value)} placeholder="Grey, Brown, Navy" />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Stock status">
              <NativeSelect value={form.stock_status} onChange={(v) => set("stock_status", v)}>
                {STOCK.map((s) => <option key={s} value={s}>{s.replace(/-/g, " ")}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Badge">
              <NativeSelect value={form.label} onChange={(v) => set("label", v)}>
                {LABELS.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
              </NativeSelect>
            </Field>
          </div>

          <Field label="Delivery note">
            <Input value={form.delivery_note} onChange={(e) => set("delivery_note", e.target.value)} placeholder="Delivered and assembled within 3–5 days" />
          </Field>

          <div className="grid sm:grid-cols-2 gap-3 rounded-md bg-muted/50 p-4">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_published} onChange={(e) => set("is_published", e.target.checked)} className="mt-0.5 w-4 h-4 accent-obsidian" />
              <span className="text-sm">
                <span className="font-medium">Published</span>
                <span className="block text-xs text-muted-foreground">Visible to customers on the website</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="mt-0.5 w-4 h-4 accent-obsidian" />
              <span className="text-sm">
                <span className="font-medium">Feature on homepage</span>
                <span className="block text-xs text-muted-foreground">Order it from the Homepage section</span>
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/10 flex gap-3 justify-between">
          {isEdit && (
            <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleDelete} disabled={busy}>
              Delete
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button onClick={handleSave} disabled={busy} className="bg-obsidian hover:bg-obsidian/90 text-white px-6 gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add product"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
