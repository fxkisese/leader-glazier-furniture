import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, PenLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./businessShared";
import { invoiceMarksApi } from "@/api/base44Client";
import { canvasToAsset, fileToAsset, saveAsset, saveSigner } from "./invoiceAssets";

// Light checkerboard so transparent images are visibly transparent
const CHECKER = {
  backgroundImage: "linear-gradient(45deg,#f1eee9 25%,transparent 25%),linear-gradient(-45deg,#f1eee9 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f1eee9 75%),linear-gradient(-45deg,transparent 75%,#f1eee9 75%)",
  backgroundSize: "12px 12px",
  backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
};

/**
 * Set up the stamp and signature printed on invoices. Values live in the parent; this saves them
 * to the database (so every device gets them) and caches them in this browser.
 */
export default function StampSignatureSetup({ stamp, setStamp, signature, setSignature, signer, setSigner }) {
  const [drawing, setDrawing] = useState(false);
  const [savedSigner, setSavedSigner] = useState(signer);

  // Returns true once the database has it
  const store = async (kind, asset, set) => {
    set(asset);
    saveAsset(kind, asset);
    try {
      await invoiceMarksApi.set(kind, asset);
      return true;
    } catch (err) {
      toast.error(`Couldn't save to your account (${err.message}). It's kept on this device only for now.`);
      return false;
    }
  };

  const upload = (kind, set, maxSide) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const asset = await fileToAsset(file, maxSide);
      if (await store(kind, asset, set)) toast.success(kind === "stamp" ? "Stamp saved" : "Signature saved");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveSignerName = async () => {
    const v = signer.trim();
    if (v === savedSigner) return;
    try {
      await invoiceMarksApi.set("signer", v);
      setSavedSigner(v);
    } catch (err) {
      toast.error(`Couldn't save the name (${err.message})`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Slot
          title="Company stamp"
          hint="A clear photo or scan of your stamp. The paper background is removed."
          asset={stamp}
          onRemove={() => store("stamp", null, setStamp)}
          actions={<UploadButton label={stamp ? "Replace" : "Upload stamp"} onChange={upload("stamp", setStamp, 500)} />}
        />
        <Slot
          title="Signature"
          hint="Sign on white paper and take a photo, or draw it here."
          asset={signature}
          onRemove={() => store("signature", null, setSignature)}
          actions={
            <>
              <UploadButton label={signature ? "Replace" : "Upload"} onChange={upload("signature", setSignature, 700)} />
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setDrawing(true)}>
                <PenLine className="w-3.5 h-3.5" /> Draw
              </Button>
            </>
          }
        />
      </div>

      {drawing && (
        <SignaturePad
          onCancel={() => setDrawing(false)}
          onSave={async (asset) => {
            setDrawing(false);
            if (await store("signature", asset, setSignature)) toast.success("Signature saved");
          }}
        />
      )}

      <Field label="Signed by" hint="Printed under the signature, e.g. your name and title">
        <Input
          value={signer}
          onChange={(e) => { setSigner(e.target.value); saveSigner(e.target.value); }}
          onBlur={saveSignerName}
          placeholder="e.g. Jane Doe, Director"
        />
      </Field>
      <p className="text-xs text-muted-foreground">Saved to your business account, so they appear on every phone or computer you sign in on. Only signed-in staff can see them.</p>
    </div>
  );
}

function Slot({ title, hint, asset, actions, onRemove }) {
  return (
    <div className="rounded-md border border-black/10 p-3 space-y-2">
      <p className="text-sm font-medium text-obsidian">{title}</p>
      <div className="h-24 rounded border border-dashed border-black/15 flex items-center justify-center overflow-hidden" style={asset ? CHECKER : undefined}>
        {asset ? <img src={asset.data} alt={title} className="max-h-full max-w-full object-contain p-1" /> : <span className="text-xs text-muted-foreground">Not added yet</span>}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {actions}
        {asset && (
          <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={onRemove}>
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}

function UploadButton({ label, onChange }) {
  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
      <label className="cursor-pointer">
        <Upload className="w-3.5 h-3.5" /> {label}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onChange} />
      </label>
    </Button>
  );
}

function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const last = useRef(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = "#1c2a5e"; // pen blue
  }, []);

  // last.current holds the stroke in progress: { rect, pts: [last two points], mid: where the drawn curve ends }
  const point = (e) => {
    const r = last.current.rect;
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  // Curve through the midpoints, using each sampled point as the control point, so the line has no corners
  const addPoint = (p) => {
    const s = last.current;
    const prev = s.pts[s.pts.length - 1];
    if (Math.hypot(p.x - prev.x, p.y - prev.y) < 1) return; // skip tiny jitter
    const mid = midpoint(prev, p);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(s.mid.x, s.mid.y);
    ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
    ctx.stroke();
    s.pts = [prev, p];
    s.mid = mid;
  };

  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = { rect: canvasRef.current.getBoundingClientRect() };
    const p = point(e);
    last.current.pts = [p];
    last.current.mid = p;
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    setEmpty(false);
  };
  const move = (e) => {
    if (!last.current) return;
    // Browsers merge fast movements into one event per frame; the merged samples give a much finer path
    const samples = e.nativeEvent.getCoalescedEvents?.() || [];
    for (const ev of samples.length ? samples : [e.nativeEvent]) addPoint(point(ev));
  };
  const up = () => {
    const s = last.current;
    if (!s) return;
    // Finish the line from the last midpoint to where the pen actually lifted
    const end = s.pts[s.pts.length - 1];
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(s.mid.x, s.mid.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    last.current = null;
  };
  const clear = () => {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };
  const save = () => {
    try { onSave(canvasToAsset(canvasRef.current)); } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="rounded-md border border-black/10 p-3 space-y-2">
      <p className="text-sm font-medium text-obsidian">Sign anywhere in the box with your finger or mouse</p>
      <canvas
        ref={canvasRef}
        className="block w-full h-64 sm:h-80 rounded bg-white border border-black/15 touch-none cursor-crosshair"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      />
      <div className="flex justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={clear}>Clear</Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button type="button" size="sm" className="bg-obsidian hover:bg-obsidian/90 text-white" disabled={empty} onClick={save}>Use this signature</Button>
        </div>
      </div>
    </div>
  );
}
