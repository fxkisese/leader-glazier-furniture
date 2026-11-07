import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, PenLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./businessShared";
import { canvasToAsset, fileToAsset, saveAsset, saveSigner } from "./invoiceAssets";

// Light checkerboard so transparent images are visibly transparent
const CHECKER = {
  backgroundImage: "linear-gradient(45deg,#f1eee9 25%,transparent 25%),linear-gradient(-45deg,#f1eee9 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f1eee9 75%),linear-gradient(-45deg,transparent 75%,#f1eee9 75%)",
  backgroundSize: "12px 12px",
  backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
};

/** Set up the stamp and signature printed on invoices. Values live in the parent; this stores them on the device. */
export default function StampSignatureSetup({ stamp, setStamp, signature, setSignature, signer, setSigner }) {
  const [drawing, setDrawing] = useState(false);

  const store = (kind, asset, set) => {
    if (!saveAsset(kind, asset)) {
      toast.error("This browser couldn't save it (private browsing?). It will only be used for this invoice.");
    }
    set(asset);
  };

  const upload = (kind, set, maxSide) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      store(kind, await fileToAsset(file, maxSide), set);
      toast.success(kind === "stamp" ? "Stamp saved" : "Signature saved");
    } catch (err) {
      toast.error(err.message);
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
          onSave={(asset) => { store("signature", asset, setSignature); setDrawing(false); toast.success("Signature saved"); }}
        />
      )}

      <Field label="Signed by" hint="Printed under the signature, e.g. your name and title">
        <Input value={signer} onChange={(e) => { setSigner(e.target.value); saveSigner(e.target.value); }} placeholder="e.g. Jane Doe, Director" />
      </Field>
      <p className="text-xs text-muted-foreground">Saved on this device only, never uploaded. Set them up once on each phone or computer you invoice from.</p>
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

  const point = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = point(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    setEmpty(false);
  };
  const move = (e) => {
    if (!last.current) return;
    const p = point(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = () => { last.current = null; };
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
      <p className="text-sm font-medium text-obsidian">Sign below with your finger or mouse</p>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-40 rounded bg-white border border-black/15 touch-none cursor-crosshair"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
        />
        <div className="pointer-events-none absolute left-6 right-6 bottom-8 border-b border-black/20" />
      </div>
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
