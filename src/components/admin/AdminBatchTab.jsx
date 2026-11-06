import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2, CheckCircle2, XCircle, Trash2, Edit, ImagePlus, RotateCcw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { uploadImage } from "@/api/imageUpload";
import { toast } from "sonner";
import AddProductModal from "./AddProductModal";
import { PageHeader, Panel, EmptyState, PRODUCT_CATEGORIES, humanize } from "./adminShared";

const CONCURRENCY = 3;
const CAMERA_NAME = /^(img|dsc|dcim|pxl|photo|image|whatsapp|screenshot|signal|mvimg)|^[\d_\-\s]+$/i;

// "luxury-blue_velvet-sofa.jpg" -> "Luxury Blue Velvet Sofa"; camera names like IMG_2034 give ""
function nameFromFile(fileName) {
  const base = fileName.replace(/\.[^.]+$/, "");
  if (CAMERA_NAME.test(base)) return "";
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUS = {
  queued:    { label: "Ready",        className: "bg-gray-100 text-gray-600" },
  uploading: { label: "Uploading…",   className: "bg-sky-50 text-sky-700" },
  saving:    { label: "Saving…",      className: "bg-amber-50 text-amber-700" },
  completed: { label: "Saved",        className: "bg-emerald-50 text-emerald-700" },
  failed:    { label: "Failed",       className: "bg-red-50 text-red-700" },
};

export default function AdminBatchTab({ onNavigate }) {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [editProd, setEditProd] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [settings, setSettings] = useState({ category: "sofas", price: "", publish: false });
  const queueRef = useRef(queue);
  queueRef.current = queue;

  // Free preview blobs when leaving the tab
  useEffect(() => () => queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)), []);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    const images = files.filter((f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name));
    if (images.length < files.length) {
      toast.error(`${files.length - images.length} file(s) skipped — only images can be uploaded.`);
    }
    if (!images.length) return;

    setQueue((prev) => [
      ...prev,
      ...images.map((file, i) => ({
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        fileName: file.name,
        name: nameFromFile(file.name),
        previewUrl: URL.createObjectURL(file),
        status: "queued",
        error: null,
        product: null,
      })),
    ]);
  };

  const updateItem = (id, updates) =>
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));

  const removeItem = (id) =>
    setQueue((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });

  const clearCompleted = () =>
    setQueue((prev) => {
      prev.filter((i) => i.status === "completed").forEach((i) => URL.revokeObjectURL(i.previewUrl));
      return prev.filter((i) => i.status !== "completed");
    });

  const price = parseFloat(settings.price) || 0;
  const canPublish = price > 0;

  const processItem = async (item, autoName) => {
    updateItem(item.id, { status: "uploading", error: null });
    try {
      const url = await uploadImage(item.file, "products", { allowFallback: false });
      updateItem(item.id, { status: "saving" });

      const name = item.name.trim() || autoName;
      const newProduct = await base44.entities.Product.create({
        name,
        category: settings.category,
        price,
        stock_status: "in-stock",
        is_featured: false,
        is_published: settings.publish && canPublish,
        images: [url],
      });

      updateItem(item.id, { status: "completed", product: newProduct, name });
      return true;
    } catch (err) {
      updateItem(item.id, { status: "failed", error: err.message || "Unknown error" });
      return false;
    }
  };

  const startUpload = async () => {
    const pending = queue.filter((i) => i.status === "queued" || i.status === "failed");
    if (!pending.length) return;
    setProcessing(true);

    // Unnamed photos become "Sofas 1", "Sofas 2", ...
    let unnamed = 0;
    const jobs = pending.map((item) => [item, `${humanize(settings.category)} ${item.name.trim() ? "" : ++unnamed}`.trim()]);

    let ok = 0;
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const [item, autoName] = jobs[next++];
        if (await processItem(item, autoName)) ok++;
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

    setProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["products"] });

    const failed = jobs.length - ok;
    if (failed === 0) toast.success(`${ok} product${ok === 1 ? "" : "s"} created`);
    else if (ok === 0) toast.error(`All ${failed} uploads failed. See the error under each photo.`);
    else toast.warning(`${ok} created, ${failed} failed. Fix and retry the failed ones.`);
  };

  const counts = queue.reduce((acc, i) => ({ ...acc, [i.status]: (acc[i.status] || 0) + 1 }), {});
  const pendingCount = (counts.queued || 0) + (counts.failed || 0);
  const doneCount = (counts.completed || 0) + (counts.failed || 0);
  const progress = queue.length ? Math.round(((counts.completed || 0) / queue.length) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Bulk Upload"
        description="Add many products at once. Each photo becomes its own product. Name them now or later, then fill in details from the Products page."
      />

      <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Settings + drop zone */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <Panel className="p-5 space-y-4">
            <p className="text-sm font-semibold text-obsidian">1. Batch settings</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category for all photos</label>
              <select
                value={settings.category}
                onChange={(e) => setSettings((s) => ({ ...s, category: e.target.value }))}
                disabled={processing}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Price (KSh) — optional</label>
              <Input
                type="number"
                min="0"
                placeholder="Set later"
                value={settings.price}
                onChange={(e) => setSettings((s) => ({ ...s, price: e.target.value }))}
                disabled={processing}
              />
            </div>
            <label className={`flex items-start gap-2.5 text-sm select-none ${canPublish ? "cursor-pointer" : "opacity-50"}`}>
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 accent-obsidian"
                checked={settings.publish && canPublish}
                disabled={!canPublish || processing}
                onChange={(e) => setSettings((s) => ({ ...s, publish: e.target.checked }))}
              />
              <span>
                Publish immediately
                <span className="block text-xs text-muted-foreground">
                  {canPublish ? "Products go live on the website right away." : "Set a price to enable. Otherwise products are saved as hidden drafts."}
                </span>
              </span>
            </label>
          </Panel>

          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); if (!processing) addFiles(e.dataTransfer.files); }}
            className={`flex flex-col items-center justify-center text-center rounded-lg border-2 border-dashed p-8 min-h-[180px] transition-colors
              ${processing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              ${dragging ? "border-gold bg-gold/5" : "border-black/15 bg-white hover:border-obsidian/40"}`}
          >
            <ImagePlus className="w-9 h-9 text-muted-foreground mb-3" />
            <span className="text-sm font-semibold text-obsidian">2. Drop photos here</span>
            <span className="text-xs text-muted-foreground mt-1">or click to choose · JPG, PNG, WebP</span>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              disabled={processing}
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
          </label>

          <Button
            onClick={startUpload}
            disabled={processing || pendingCount === 0}
            className="w-full h-11 bg-obsidian hover:bg-obsidian/90 text-white gap-2"
          >
            {processing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading {doneCount} of {queue.length}…</>
            ) : counts.failed && !counts.queued ? (
              <><RotateCcw className="w-4 h-4" /> Retry {counts.failed} failed</>
            ) : (
              <><Upload className="w-4 h-4" /> 3. Upload {pendingCount || ""} photo{pendingCount === 1 ? "" : "s"}</>
            )}
          </Button>
        </div>

        {/* Queue */}
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-black/10">
            <div>
              <p className="font-semibold text-obsidian text-sm">Photos ({queue.length})</p>
              {queue.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {counts.completed || 0} saved{counts.failed ? ` · ${counts.failed} failed` : ""}{counts.queued ? ` · ${counts.queued} ready` : ""}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {counts.completed > 0 && !processing && (
                <>
                  <Button variant="outline" size="sm" onClick={clearCompleted}>Clear saved</Button>
                  {onNavigate && (
                    <Button size="sm" className="bg-obsidian text-white gap-1.5" onClick={() => onNavigate("products")}>
                      Review products <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {queue.length > 0 && (
            <div className="h-1 bg-muted">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          )}

          {queue.length === 0 ? (
            <EmptyState
              icon={ImagePlus}
              title="No photos yet"
              description="Choose a category, then drop your product photos on the left. Tip: name files like “grey-l-shaped-sofa.jpg” and the product names fill in automatically."
            />
          ) : (
            <ul className="divide-y divide-black/5 max-h-[640px] overflow-y-auto">
              {queue.map((item) => {
                const st = STATUS[item.status];
                const editable = !processing && (item.status === "queued" || item.status === "failed");
                return (
                  <li key={item.id} className="flex items-center gap-4 px-5 py-3">
                    <img src={item.previewUrl} alt="" className="w-14 h-14 rounded-md object-cover border border-black/10 shrink-0" />
                    <div className="flex-1 min-w-0">
                      {editable ? (
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(item.id, { name: e.target.value })}
                          placeholder={`Product name (default: ${humanize(settings.category)} …)`}
                          className="h-8 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium text-obsidian truncate">{item.name || item.fileName}</p>
                      )}
                      <p className={`text-xs mt-1 truncate ${item.status === "failed" ? "text-red-600" : "text-muted-foreground"}`}>
                        {item.status === "failed" ? item.error : item.fileName}
                      </p>
                    </div>
                    <span className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${st.className}`}>
                      {(item.status === "uploading" || item.status === "saving") && <Loader2 className="w-3 h-3 animate-spin" />}
                      {item.status === "completed" && <CheckCircle2 className="w-3 h-3" />}
                      {item.status === "failed" && <XCircle className="w-3 h-3" />}
                      {st.label}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      {item.status === "completed" && item.product && (
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setEditProd(item.product)}>
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </Button>
                      )}
                      {!processing && item.status !== "uploading" && item.status !== "saving" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Remove from list"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {editProd && (
        <AddProductModal
          product={editProd}
          onClose={() => setEditProd(null)}
          onSaved={async () => {
            const editedId = editProd._id ?? editProd.id;
            setEditProd(null);
            queryClient.invalidateQueries({ queryKey: ["products"] });
            // Fetch fresh list and find the updated product
            const all = await base44.entities.Product.list();
            const updated = all.find((p) => (p._id ?? p.id) === editedId);
            setQueue((prev) =>
              updated
                ? prev.map((i) => ((i.product?._id ?? i.product?.id) === editedId ? { ...i, product: updated, name: updated.name } : i))
                : prev.filter((i) => (i.product?._id ?? i.product?.id) !== editedId)
            );
          }}
        />
      )}
    </div>
  );
}
