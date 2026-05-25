import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const SAMPLE_GLASS = [
  { id: "mirror", name: "Mirror Glass", price_per_sqft: 700 },
  { id: "clear", name: "Clear Glass", price_per_sqft: 450 },
  { id: "toughened", name: "Toughened Glass", price_per_sqft: 850 },
  { id: "frosted", name: "Frosted Glass", price_per_sqft: 650 },
];

export default function GlassQuotePreview() {
  const [glassId, setGlassId] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [qty, setQty] = useState("1");
  const [result, setResult] = useState(null);

  const { data: glassTypes = [] } = useQuery({
    queryKey: ["glass-types-preview"],
    queryFn: () => base44.entities.GlassType.filter({ is_available: true }),
  });

  const options = glassTypes.length > 0 ? glassTypes : SAMPLE_GLASS;

  const calculate = () => {
    const selected = options.find((g) => g.id === glassId || g.name === glassId);
    if (!selected || !width || !height) return;
    const area = parseFloat(width) * parseFloat(height);
    const total = area * selected.price_per_sqft * parseInt(qty || 1);
    setResult({ area: area.toFixed(2), total: Math.round(total), glassName: selected.name, ppsf: selected.price_per_sqft });
  };

  return (
    <section className="py-16 lg:py-24 bg-primary text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute bottom-0 left-10 w-60 h-60 bg-white/3 rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-sm">
              <Calculator className="w-4 h-4 text-gold" />
              <span>Instant Quote Engine</span>
            </div>
            <h2 className="font-playfair text-3xl lg:text-4xl font-bold">
              Know Your Glass Price <span className="text-gold">Before You Call</span>
            </h2>
            <p className="text-primary-foreground/70 text-lg leading-relaxed">
              Select a glass type, enter your dimensions, and get an instant estimate based on price per square foot. No waiting, no guessing.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              {["Mirror Glass", "Toughened Glass", "Frosted Glass", "Shower Glass", "Office Partitions"].map((t) => (
                <span key={t} className="bg-white/10 px-3 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 space-y-4">
            <h3 className="font-semibold text-white text-lg">Quick Glass Estimate</h3>

            <Select value={glassId} onValueChange={setGlassId}>
              <SelectTrigger className="bg-white/15 border-white/20 text-white placeholder:text-white/50">
                <SelectValue placeholder="Select glass / mirror type" />
              </SelectTrigger>
              <SelectContent>
                {options.map((g) => (
                  <SelectItem key={g.id || g.name} value={g.id || g.name}>{g.name} — KSh {g.price_per_sqft}/sq ft</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Input value={width} onChange={(e) => setWidth(e.target.value)} placeholder="Width (ft)" className="bg-white/15 border-white/20 text-white placeholder:text-white/50" type="number" />
              </div>
              <div className="col-span-1">
                <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Height (ft)" className="bg-white/15 border-white/20 text-white placeholder:text-white/50" type="number" />
              </div>
              <div className="col-span-1">
                <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" className="bg-white/15 border-white/20 text-white placeholder:text-white/50" type="number" min="1" />
              </div>
            </div>

            <Button onClick={calculate} className="w-full bg-gold hover:bg-gold/90 text-foreground font-semibold rounded-xl gap-2" style={{ backgroundColor: "hsl(43 74% 60%)" }}>
              <Calculator className="w-4 h-4" /> Calculate Estimate
            </Button>

            {result && (
              <div className="bg-white/15 rounded-2xl p-4 space-y-2 text-sm border border-white/20">
                <div className="flex justify-between"><span className="text-white/70">Glass Type:</span><span className="font-medium">{result.glassName}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Area:</span><span className="font-medium">{result.area} sq ft</span></div>
                <div className="flex justify-between"><span className="text-white/70">Price per sq ft:</span><span className="font-medium">KSh {result.ppsf}</span></div>
                <div className="flex justify-between border-t border-white/20 pt-2 text-base"><span className="font-semibold">Estimated Total:</span><span className="font-bold text-gold">KSh {result.total.toLocaleString()}</span></div>
              </div>
            )}

            <Link to="/quote-calculator">
              <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10 rounded-xl gap-2">
                Full Quote Calculator <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}