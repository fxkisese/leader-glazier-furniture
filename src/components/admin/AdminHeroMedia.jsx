import { useState, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { uploadImage } from "@/api/imageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, ArrowUp, ArrowDown, Trash2, Film, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Panel, ErrorState, Pill } from "./adminShared";

const MAX_VIDEO_MB = 100;

// Pixel size of a photo or video, read in the browser before uploading (null if unreadable)
function readSize(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (w, h) => { URL.revokeObjectURL(url); resolve(w && h ? { width: w, height: h } : null); };
    if (file.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => done(v.videoWidth, v.videoHeight);
      v.onerror = () => done();
      v.src = url;
    } else {
      const img = new Image();
      img.onload = () => done(img.naturalWidth, img.naturalHeight);
      img.onerror = () => done();
      img.src = url;
    }
  });
}

export default function AdminHeroMedia() {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ["hero-media"],
    queryFn: () => base44.entities.HeroMedia.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["hero-media"] });

  const handleFiles = async (fileList) => {
    const files = [...fileList].filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!files.length) return toast.error("Choose photos or videos");

    let order = items.reduce((max, x) => Math.max(max, x.order ?? 0), 0);
    let added = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith("video/");
        if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
          toast.error(`${file.name} is over ${MAX_VIDEO_MB} MB — compress it and try again`);
          continue;
        }
        setUploading(`Uploading ${i + 1} of ${files.length}…`);
        const size = await readSize(file); // iPhone HEIC photos can't be read here; the hero measures those itself
        const url = isVideo
          ? (await base44.integrations.Core.UploadFile({ file })).file_url
          : await uploadImage(file, "hero", { allowFallback: false, maxWidth: 2400 });
        await base44.entities.HeroMedia.create({ type: isVideo ? "video" : "image", url, order: ++order, ...size });
        added++;
      }
      if (added) toast.success(`${added} added to the hero`);
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(null);
      refresh();
    }
  };

  // Swap with a neighbour, then renumber so every slide has a distinct order
  const move = useMutation({
    mutationFn: async ({ from, to }) => {
      const next = [...items];
      [next[from], next[to]] = [next[to], next[from]];
      await Promise.all(
        next.map((x, i) => (x.order === i + 1 ? null : base44.entities.HeroMedia.update(x.id, { order: i + 1 })))
      );
    },
    onSuccess: refresh,
    onError: (err) => toast.error(`Couldn't reorder: ${err.message}`),
  });

  return (
    <Panel className="p-4 sm:p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-obsidian">Hero media</h2>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-xl">
            Photos and videos that play full-screen at the top of the homepage, in this order. Videos play to the end
            (up to 30s) before moving on. When this is empty, the hero shows your featured products instead.
          </p>
        </div>
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={!!uploading}
          className="bg-obsidian hover:bg-obsidian/90 text-white gap-2 shrink-0"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading || "Add photos or videos"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="aspect-video bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!uploading) handleFiles(e.dataTransfer.files); }}
          className={`rounded-lg transition-colors ${dragOver ? "bg-gold/10 ring-2 ring-gold ring-dashed" : ""}`}
        >
          {items.length === 0 ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg py-12 text-center hover:border-gold/60 transition-colors"
            >
              <div className="flex justify-center gap-2 text-muted-foreground mb-2">
                <ImageIcon className="w-6 h-6" /><Film className="w-6 h-6" />
              </div>
              <p className="font-medium text-obsidian">Drop photos or videos here</p>
              <p className="text-sm text-muted-foreground mt-1">
                Landscape works best. Videos: MP4, under 20 MB loads fastest (max {MAX_VIDEO_MB} MB).
              </p>
            </button>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((item, i) => (
                <HeroMediaCard
                  key={item.id}
                  item={item}
                  position={i + 1}
                  onUp={i > 0 ? () => move.mutate({ from: i, to: i - 1 }) : null}
                  onDown={i < items.length - 1 ? () => move.mutate({ from: i, to: i + 1 }) : null}
                  moving={move.isPending}
                  onChanged={refresh}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function HeroMediaCard({ item, position, onUp, onDown, moving, onChanged }) {
  const [form, setForm] = useState({
    eyebrow: item.eyebrow || "",
    title: item.title || "",
    subtitle: item.subtitle || "",
  });
  const dirty = ["eyebrow", "title", "subtitle"].some((k) => form[k] !== (item[k] || ""));
  const videoRef = useRef(null);

  const save = useMutation({
    mutationFn: (data) => base44.entities.HeroMedia.update(item.id, data),
    onSuccess: () => { onChanged(); toast.success("Saved"); },
    onError: (err) => toast.error(`Couldn't save: ${err.message}`),
  });

  const remove = useMutation({
    mutationFn: () => base44.entities.HeroMedia.delete(item.id),
    onSuccess: () => { onChanged(); toast.success("Removed from the hero"); },
    onError: (err) => toast.error(`Couldn't remove: ${err.message}`),
  });

  const active = item.is_active !== false;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className={`border border-black/10 rounded-lg overflow-hidden bg-white ${active ? "" : "opacity-60"}`}>
      <div
        className="relative aspect-video bg-obsidian"
        onMouseEnter={() => videoRef.current?.play().catch(() => {})}
        onMouseLeave={() => videoRef.current?.pause()}
      >
        {item.type === "video" ? (
          <video ref={videoRef} src={`${item.url}#t=0.5`} poster={item.poster} muted loop playsInline preload="metadata" className="w-full h-full object-cover" />
        ) : (
          <img src={item.url} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="bg-obsidian/80 text-white text-xs font-semibold px-2 py-0.5 rounded">#{position}</span>
          <Pill tone={item.type === "video" ? "amber" : "gray"}>{item.type === "video" ? "Video" : "Photo"}</Pill>
        </div>
        <div className="absolute top-2 right-2 flex gap-1">
          <IconBtn label="Move earlier" onClick={onUp} disabled={!onUp || moving}><ArrowUp className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn label="Move later" onClick={onDown} disabled={!onDown || moving}><ArrowDown className="w-3.5 h-3.5" /></IconBtn>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <Input value={form.eyebrow} onChange={set("eyebrow")} placeholder="Small label, e.g. New Collection" className="h-8 text-sm" />
        <Textarea
          value={form.title}
          onChange={set("title")}
          rows={3}
          placeholder={"Headline, one line per row\ne.g. Your Space,\nYour Vision,\nRealised."}
          className="text-sm resize-none"
        />
        <Input value={form.subtitle} onChange={set("subtitle")} placeholder="Short sentence under the headline" className="h-8 text-sm" />
        <p className="text-[11px] text-muted-foreground">Leave text blank to use the default wording. The 2nd headline row shows in italics.</p>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch
              checked={active}
              onCheckedChange={(v) => save.mutate({ is_active: v })}
              disabled={save.isPending}
            />
            {active ? "Showing" : "Hidden"}
          </label>
          <div className="flex gap-2">
            {dirty && (
              <Button size="sm" onClick={() => save.mutate(form)} disabled={save.isPending} className="bg-obsidian hover:bg-obsidian/90 text-white h-8">
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={remove.isPending}
              onClick={() => { if (confirm("Remove this from the hero?")) remove.mutate(); }}
              aria-label="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick ?? undefined}
      disabled={disabled}
      className="w-7 h-7 rounded bg-white/90 text-obsidian flex items-center justify-center hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
