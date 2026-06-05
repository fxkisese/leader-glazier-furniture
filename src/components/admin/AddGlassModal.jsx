import { useState } from "react";
import { X, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { uploadImage } from "@/api/imageUpload";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const GLASS_CATS = ["clear","tinted","frosted","toughened","laminated","mirror","one-way","shower","table-top","office-partition","window","decorative"];

export default function AddGlassModal({ glass, onClose, onSaved }) {
  const isEdit = !!glass;
  const [form, setForm] = useState({
    name: glass?.name || "",
    category: glass?.category || "mirror",
    description: glass?.description || "",
    image: glass?.image || "",
    thickness: glass?.thickness || "",
    price_per_sqft: glass?.price_per_sqft || "",
    min_order_sqft: glass?.min_order_sqft || "",
    installation_price: glass?.installation_price || "",
    frame_price_per_sqft: glass?.frame_price_per_sqft || "",
    is_available: glass?.is_available !== false,
    notes: glass?.notes || "",
  });
  const [uploading, setUploading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setUploading(true);
      toast.info(`Uploading ${file.name}...`);
      const url = await uploadImage(file, 'glass');
      set("image", url);
      toast.success("Image uploaded!");
    } catch (error) {
      console.error('[Glass Upload] Error:', error);
      toast.error("Upload failed: " + (error.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = {
        ...form,
        price_per_sqft: parseFloat(form.price_per_sqft),
        min_order_sqft: form.min_order_sqft ? parseFloat(form.min_order_sqft) : undefined,
        installation_price: form.installation_price ? parseFloat(form.installation_price) : undefined,
        frame_price_per_sqft: form.frame_price_per_sqft ? parseFloat(form.frame_price_per_sqft) : undefined,
      };
      return isEdit ? base44.entities.GlassType.update(glass.id, data) : base44.entities.GlassType.create(data);
    },
    onSuccess: () => { toast.success(isEdit ? "Glass type updated!" : "Glass type added!"); onSaved(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.GlassType.delete(glass.id),
    onSuccess: () => { toast.success("Deleted."); onSaved(); },
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-playfair font-bold text-xl">{isEdit ? "Edit Glass Type" : "Add Glass Type"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Image */}
          <div>
            <label className="text-sm font-medium mb-2 block">Glass Image</label>
            {form.image ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-border group">
                <img src={form.image} alt="" className="w-full h-full object-cover" />
                <button onClick={() => set("image", "")} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Trash2 className="w-5 h-5 text-white" />
                </button>
              </div>
            ) : (
              <label className="w-full h-36 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/30">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mt-2">{uploading ? "Uploading..." : "Upload image"}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Glass Name *</label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Mirror Glass" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category *</label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GLASS_CATS.map((c) => <SelectItem key={c} value={c}>{c.replace(/-/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Use cases and details..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Thickness</label>
              <Input value={form.thickness} onChange={(e) => set("thickness", e.target.value)} placeholder="4mm, 6mm, 8mm" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Price per Sq Ft (KSh) *</label>
              <Input value={form.price_per_sqft} onChange={(e) => set("price_per_sqft", e.target.value)} type="number" placeholder="700" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Min Order (sq ft)</label>
              <Input value={form.min_order_sqft} onChange={(e) => set("min_order_sqft", e.target.value)} type="number" placeholder="2" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Installation (KSh)</label>
              <Input value={form.installation_price} onChange={(e) => set("installation_price", e.target.value)} type="number" placeholder="2000" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Frame/sq ft (KSh)</label>
              <Input value={form.frame_price_per_sqft} onChange={(e) => set("frame_price_per_sqft", e.target.value)} type="number" placeholder="150" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any extra information..." />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_available} onChange={(e) => set("is_available", e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-sm font-medium">Available / In Stock</span>
          </label>
        </div>

        <div className="p-6 border-t border-border flex gap-3 justify-between">
          {isEdit && (
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={() => { if (confirm("Delete this glass type?")) deleteMutation.mutate(); }}>
              Delete
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.price_per_sqft} className="bg-primary hover:bg-primary/90 text-white px-8">
              {saveMutation.isPending ? "Saving..." : isEdit ? "Update" : "Add Glass Type"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}