import { useState } from "react";
import { X, Upload, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const CATEGORIES = ["sofas","tv-stands","shoe-racks","wardrobes","beds","coffee-tables","dining-sets","office-desks","office-chairs","cabinets","chest-of-drawers","custom-furniture"];
const LABELS = [{ v: "none", l: "None" }, { v: "new-arrival", l: "New Arrival" }, { v: "best-seller", l: "Best Seller" }, { v: "limited-offer", l: "Limited Offer" }, { v: "custom-order", l: "Custom Order" }];
const STOCK = ["in-stock", "out-of-stock", "made-to-order"];

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
    is_published: product?.is_published !== false,
    delivery_note: product?.delivery_note || "",
    whatsapp_message: product?.whatsapp_message || "",
    images: product?.images || [],
  });
  const [uploading, setUploading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error } = await supabase.storage
          .from('craftsman-images')
          .upload(filePath, file);

        if (error) throw error;

        const { data } = supabase.storage
          .from('craftsman-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(data.publicUrl);
      }
      set("images", [...form.images, ...uploadedUrls]);
      toast.success(`Uploaded ${files.length} image(s)!`);
    } catch (error) {
      console.error('[Product Upload] Error:', error);
      toast.error("Upload failed: " + (error.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (i) => set("images", form.images.filter((_, idx) => idx !== i));

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = { ...form, price: parseFloat(form.price), discount_price: form.discount_price ? parseFloat(form.discount_price) : undefined };
      return isEdit ? base44.entities.Product.update(product.id, data) : base44.entities.Product.create(data);
    },
    onSuccess: () => { toast.success(isEdit ? "Product updated!" : "Product added!"); onSaved(); },
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Product.delete(product.id),
    onSuccess: () => { toast.success("Product deleted."); onSaved(); },
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-playfair font-bold text-xl text-foreground">{isEdit ? "Edit Product" : "Add New Product"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Images */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Product Photos</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {form.images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/30 hover:bg-accent/20">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-1">{uploading ? "..." : "Upload"}</span>
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Name & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Product Name *</label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Royal Purple Sofa" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category *</label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/-/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Price (KSh) *</label>
              <Input value={form.price} onChange={(e) => set("price", e.target.value)} type="number" placeholder="65000" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Discount Price (optional)</label>
              <Input value={form.discount_price} onChange={(e) => set("discount_price", e.target.value)} type="number" placeholder="58000" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Product description..." />
          </div>

          {/* Material, Dimensions, Colors */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Material</label>
              <Input value={form.material} onChange={(e) => set("material", e.target.value)} placeholder="Velvet, Leather..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Dimensions</label>
              <Input value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="200x90x80cm" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Seating</label>
              <Input value={form.seating_capacity} onChange={(e) => set("seating_capacity", e.target.value)} placeholder="5 people" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Available Colors</label>
            <Input value={form.colors} onChange={(e) => set("colors", e.target.value)} placeholder="Purple, Grey, Brown" />
          </div>

          {/* Status & Label */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Stock Status</label>
              <Select value={form.stock_status} onValueChange={(v) => set("stock_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STOCK.map((s) => <SelectItem key={s} value={s}>{s.replace(/-/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Label</label>
              <Select value={form.label || "none"} onValueChange={(v) => set("label", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>{LABELS.map((l) => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Delivery Note */}
          <div>
            <label className="text-sm font-medium mb-1 block">Delivery Note</label>
            <Input value={form.delivery_note} onChange={(e) => set("delivery_note", e.target.value)} placeholder="Delivered and assembled within 3-5 days" />
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="text-sm font-medium">Featured Product</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_published} onChange={(e) => set("is_published", e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="text-sm font-medium">Published</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex gap-3 justify-between">
          {isEdit && (
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={() => { if (confirm("Delete this product?")) deleteMutation.mutate(); }}>
              Delete
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.price} className="bg-primary hover:bg-primary/90 text-white px-8">
              {saveMutation.isPending ? "Saving..." : isEdit ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}