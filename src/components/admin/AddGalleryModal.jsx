import { useState } from "react";
import { X, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { uploadImage } from "@/api/imageUpload";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

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

export default function AddGalleryModal({ project, onClose, onSaved }) {
  const isEdit = !!project;
  const [form, setForm] = useState({
    title: project?.title || "",
    category: project?.category || "furniture",
    description: project?.description || "",
    is_featured: project?.is_featured || false,
    images: project?.images || [],
  });
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        toast.info(`Uploading ${file.name}...`);
        const url = await uploadImage(file, 'gallery');
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      }
      toast.success(`Uploaded ${files.length} image(s)!`);
    } catch (error) {
      console.error('[Gallery Upload] Error:', error);
      toast.error("Upload failed: " + (error.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () => isEdit ? base44.entities.GalleryProject.update(project.id, form) : base44.entities.GalleryProject.create(form),
    onSuccess: () => { toast.success(isEdit ? "Updated!" : "Added!"); onSaved(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.GalleryProject.delete(project.id),
    onSuccess: () => { toast.success("Deleted."); onSaved(); },
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-playfair font-bold text-xl">{isEdit ? "Edit Project" : "Add Gallery Project"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="text-sm font-medium mb-1 block">Title *</label><Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Project title" /></div>
          <div>
            <label className="text-sm font-medium mb-1 block">Category</label>
            <NativeSelect value={form.category} onChange={(v) => set("category", v)}>
              {["furniture","glass","custom","interior"].map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </div>
          <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} /></div>
          <div>
            <label className="text-sm font-medium mb-2 block">Project Photos</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.images.map((img, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border group">
                  <img src={img} className="w-full h-full object-cover" />
                  <button onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, x) => x !== i) }))}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer bg-muted/20">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
              </label>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-sm font-medium">Featured on Homepage</span>
          </label>
        </div>
        <div className="p-6 border-t border-border flex gap-3 justify-between">
          {isEdit && <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(); }}>Delete</Button>}
          <div className="flex gap-3 ml-auto">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending} className="bg-primary text-white px-6">
              {saveMutation.isPending ? "Saving..." : isEdit ? "Update" : "Add"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}