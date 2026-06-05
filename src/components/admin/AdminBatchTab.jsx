import { useState } from "react";
import { Upload, Loader2, CheckCircle2, XCircle, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/api/supabaseClient";
import { uploadImage } from "@/api/imageUpload";
import { toast } from "sonner";
import AddProductModal from "./AddProductModal";

const CATEGORIES = [
  "sofas",
  "tv-stands",
  "shoe-racks",
  "wardrobes",
  "beds",
  "coffee-tables",
  "dining-sets",
  "office-desks",
  "office-chairs",
  "cabinets",
  "chest-of-drawers",
  "custom-furniture"
];

export default function AdminBatchTab() {
  const [queue, setQueue] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [editProd, setEditProd] = useState(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = files.map((file, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
      fileName: file.name,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "queued", // 'queued' | 'uploading' | 'analyzing' | 'saving' | 'completed' | 'failed'
      error: null,
      productUrl: null,
      productData: null,
      createdProduct: null,
    }));

    setQueue((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const updateQueueItem = (id, updates) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeItem = (id) => {
    setQueue((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearCompleted = () => {
    setQueue((prev) => {
      const itemsToKeep = prev.filter((item) => item.status !== "completed");
      prev.forEach((item) => {
        if (item.status === "completed" && item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      return itemsToKeep;
    });
  };

  const startProcessing = async () => {
    setProcessing(true);
    // Process items in queue that are 'queued' or 'failed'
    const itemsToProcess = queue.filter(
      (item) => item.status === "queued" || item.status === "failed"
    );

    for (const item of itemsToProcess) {
      updateQueueItem(item.id, { status: "uploading", error: null });

      let uploadedUrl = "";
      try {
        // 1. Upload to Supabase Storage
        uploadedUrl = await uploadImage(item.file, "products");
        updateQueueItem(item.id, { status: "saving", productUrl: uploadedUrl });

        // Create a user-friendly product name from file name
        // E.g. "luxury-blue-velvet-sofa.jpg" -> "Luxury Blue Velvet Sofa"
        let baseName = item.fileName;
        const lastDot = baseName.lastIndexOf('.');
        if (lastDot !== -1) {
          baseName = baseName.substring(0, lastDot);
        }
        const formattedName = baseName
          .replace(/[_-]+/g, ' ')
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        const displayName = formattedName || "Draft Product";

        // 2. Save to Database as Draft (is_published: false)
        const productInsertData = {
          name: displayName,
          category: "sofas",
          price: 0,
          description: null,
          material: null,
          dimensions: null,
          colors: null,
          seating_capacity: null,
          stock_status: "in-stock",
          is_featured: false,
          is_published: false, // draft state
          images: [uploadedUrl],
          whatsapp_message: `Hello, I'm interested in the ${displayName} advertised on your site.`,
        };

        const { data: insertResult, error: insertError } = await supabase
          .from("products")
          .insert(productInsertData)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        updateQueueItem(item.id, { status: "completed", createdProduct: insertResult });
        toast.success(`Uploaded & Created Draft: ${displayName}`);
      } catch (err) {
        console.error(`Error processing ${item.fileName}:`, err);
        updateQueueItem(item.id, { status: "failed", error: err.message || "Unknown error" });
        toast.error(`Error on ${item.fileName}: ${err.message || "Unknown error"}`);
      }
    }

    setProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="bg-white rounded-3xl border border-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-playfair font-bold text-2xl text-foreground flex items-center gap-2">
            <Upload className="text-primary w-6 h-6" /> Bulk Product Uploader
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            Upload multiple photos of furniture. The system uploads them sequentially and saves them as editable draft products in the database.
          </p>
        </div>
      </div>

      {/* File Dropzone */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <label className="border-2 border-dashed border-border rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 transition-colors bg-white hover:bg-accent/5 min-h-[200px]">
            <Upload className="w-10 h-10 text-muted-foreground mb-3" />
            <span className="text-sm font-semibold text-foreground">Upload Photos</span>
            <span className="text-xs text-muted-foreground mt-1">Select one or more furniture pictures</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={processing}
            />
          </label>

          {queue.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={startProcessing}
                disabled={processing || !queue.some(q => q.status === "queued" || q.status === "failed")}
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl text-xs gap-1.5 h-10 shadow-sm"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing Batch...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Start Batch Upload
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                disabled={processing}
                onClick={clearCompleted}
                className="border-border rounded-xl text-xs h-10 text-muted-foreground hover:text-foreground"
              >
                Clear Done
              </Button>
            </div>
          )}
        </div>
 
        {/* Queue Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Queue Items ({queue.length})</h3>
              {processing && (
                <Badge className="bg-primary/10 text-primary hover:bg-primary/10 rounded-full text-[10px] py-1 border border-primary/20 animate-pulse">
                  Background Upload Active
                </Badge>
              )}
            </div>
 
            <div className="divide-y divide-border max-h-[550px] overflow-y-auto min-h-[200px]">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
                  <span className="text-4xl block mb-2">🛋️</span>
                  <p className="font-medium text-sm">No items in the queue</p>
                  <p className="text-xs mt-0.5">Upload photos on the left to start batching.</p>
                </div>
              ) : (
                queue.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/5 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.previewUrl && (
                        <img
                          src={item.previewUrl}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover border border-border"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate max-w-[200px] sm:max-w-[350px]">
                          {item.fileName}
                        </p>
                        {item.status === "completed" && item.createdProduct && (
                          <p className="text-xs text-primary font-medium truncate max-w-[200px] sm:max-w-[350px]">
                            Created: {item.createdProduct.name}
                          </p>
                        )}
                        {item.status === "failed" && (
                          <p className="text-xs text-destructive truncate max-w-[200px] sm:max-w-[350px]">
                            Error: {item.error}
                          </p>
                        )}
                      </div>
                    </div>
 
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Status Badges */}
                      {item.status === "queued" && (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground font-normal rounded-xl">Queued</Badge>
                      )}
                      {item.status === "uploading" && (
                        <Badge className="bg-blue-50 text-blue-600 border border-blue-200 font-normal rounded-xl gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                        </Badge>
                      )}
                      {item.status === "saving" && (
                        <Badge className="bg-amber-50 text-amber-600 border border-amber-200 font-normal rounded-xl gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                        </Badge>
                      )}
                      {item.status === "completed" && (
                        <Badge className="bg-green-50 text-green-700 border border-green-200 font-normal rounded-xl gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Done
                        </Badge>
                      )}
                      {item.status === "failed" && (
                        <Badge className="bg-red-50 text-red-600 border border-red-200 font-normal rounded-xl gap-1">
                          <XCircle className="w-3.5 h-3.5 text-red-500" /> Failed
                        </Badge>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-1">
                        {item.status === "completed" && item.createdProduct && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditProd(item.createdProduct)}
                            className="border-primary/20 text-primary hover:bg-primary hover:text-white rounded-xl h-8 text-xs gap-1"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit Draft
                          </Button>
                        )}
                        {!processing && (item.status === "queued" || item.status === "failed" || item.status === "completed") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeItem(item.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal Popup */}
      {editProd && (
        <AddProductModal
          product={editProd}
          onClose={() => setEditProd(null)}
          onSaved={() => {
            toast.success("Draft updated successfully!");
            // Update queue item createdProduct state if it matches the edited product
            setQueue((prev) =>
              prev.map((item) => {
                if (item.createdProduct && item.createdProduct.id === editProd.id) {
                  // We query supabase to get the fresh product state, or just let it reload.
                  // For simplicity, we can fetch from database later or just update its reference.
                  return {
                    ...item,
                    createdProduct: { ...item.createdProduct, ...editProd } // mock update
                  };
                }
                return item;
              })
            );
            setEditProd(null);
          }}
        />
      )}
    </div>
  );
}
