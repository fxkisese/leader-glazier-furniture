import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator, MessageCircle, Phone, Save, MapPin } from "lucide-react";
import { toast } from "sonner";

const WHATSAPP = "254722914819";

const UNITS = [
  { value: "feet", label: "Feet (ft)", factor: 1 },
  { value: "inches", label: "Inches (in)", factor: 1 / 144 },
  { value: "cm", label: "Centimeters (cm)", factor: 1 / 929.03 },
  { value: "meters", label: "Meters (m)", factor: 10.7639 },
];

export default function QuoteCalculator() {
  const [glassId, setGlassId] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [unit, setUnit] = useState("feet");
  const [qty, setQty] = useState("1");
  const [includeInstall, setIncludeInstall] = useState(false);
  const [includeFrame, setIncludeFrame] = useState(false);
  const [includeDelivery, setIncludeDelivery] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedAccessories, setSelectedAccessories] = useState([]);
  const [quote, setQuote] = useState(null);

  // Fetch data from database
  const { data: glassTypes = [] } = useQuery({
    queryKey: ["glass-types"],
    queryFn: () => base44.entities.GlassType.filter({ is_available: true }),
  });

  const { data: accessories = [] } = useQuery({
    queryKey: ["accessories"],
    queryFn: () => base44.entities.Accessory.list(),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => base44.entities.SiteSetting.list(),
  });

  // Get setting value
  const getSetting = (key, defaultValue = null) => {
    const setting = settings.find(s => s.setting_key === key);
    if (!setting) return defaultValue;
    if (setting.setting_type === 'boolean') return setting.setting_value === 'true';
    return setting.setting_value;
  };

  const showPricing = getSetting('show_pricing', true);
  const enableInstantQuotes = getSetting('enable_instant_quotes', true);
  const enableWhatsApp = getSetting('enable_whatsapp', true);
  const companyPhone = getSetting('company_phone', WHATSAPP);

  // Pre-select from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get("glass");
    if (g && glassTypes.length > 0) {
      const found = glassTypes.find((o) => o.name === g);
      if (found) setGlassId(found.id);
    }
  }, [glassTypes]);

  const toggleAccessory = (accessory) => {
    setSelectedAccessories(prev => {
      const existing = prev.find(a => a.id === accessory.id);
      if (existing) {
        return prev.filter(a => a.id !== accessory.id);
      } else {
        return [...prev, { ...accessory, quantity: 1 }];
      }
    });
  };

  const updateAccessoryQuantity = (accessoryId, qty) => {
    setSelectedAccessories(prev =>
      prev.map(a => a.id === accessoryId ? { ...a, quantity: Math.max(1, qty) } : a)
    );
  };

  const calculate = () => {
    if (!enableInstantQuotes) {
      toast.error("Quote calculator is currently disabled. Please contact us.");
      return;
    }

    const selected = glassTypes.find((g) => g.id === glassId);
    if (!selected || !width || !height) {
      toast.error("Please fill in glass type, width, and height.");
      return;
    }

    const unitFactor = UNITS.find((u) => u.value === unit)?.factor || 1;
    const areaSqft = parseFloat(width) * parseFloat(height) * unitFactor;
    const quantity = parseInt(qty) || 1;

    const glassCost = areaSqft * selected.price_per_sqft * quantity;
    const installCost = includeInstall ? (selected.installation_price || 2000) : 0;
    const frameCost = includeFrame ? (selected.frame_price_per_sqft || 150) * areaSqft * quantity : 0;
    const deliveryCost = includeDelivery ? 1000 : 0;

    // Calculate accessories cost
    const accessoriesList = selectedAccessories.map(acc => ({
      ...acc,
      subtotal: acc.price * acc.quantity,
    }));
    const accessoriesCost = accessoriesList.reduce((sum, acc) => sum + acc.subtotal, 0);

    const total = glassCost + installCost + frameCost + deliveryCost + accessoriesCost;

    setQuote({
      glassName: selected.name,
      width: parseFloat(width),
      height: parseFloat(height),
      unit,
      areaSqft: areaSqft.toFixed(2),
      ppsf: selected.price_per_sqft,
      quantity,
      glassCost: Math.round(glassCost),
      installCost: Math.round(installCost),
      frameCost: Math.round(frameCost),
      deliveryCost,
      accessoriesCost: Math.round(accessoriesCost),
      accessoriesList,
      total: Math.round(total),
      includeInstall,
      includeFrame,
      includeDelivery,
      deliveryLocation,
    });
  };

  const saveQuoteMutation = useMutation({
    mutationFn: async () => {
      // Save quote request
      const quoteData = await base44.entities.QuoteRequest.create({
        customer_name: customerName,
        phone,
        glass_type_name: quote.glassName,
        width: quote.width,
        height: quote.height,
        unit: quote.unit,
        area_sqft: parseFloat(quote.areaSqft),
        quantity: quote.quantity,
        include_installation: quote.includeInstall,
        include_frame: quote.includeFrame,
        include_delivery: quote.includeDelivery,
        estimated_total: quote.total,
      });

      // Save selected accessories for this quote
      for (const acc of quote.accessoriesList) {
        await base44.entities.QuoteAccessory.create({
          quote_id: quoteData.id,
          accessory_id: acc.id,
          quantity: acc.quantity,
        });
      }

      return quoteData;
    },
    onSuccess: () => toast.success("Quote saved! We'll be in touch."),
  });

  const waText = quote
    ? `Hello Leader Glazier and Furniture, I would like a quote for:\n\n` +
      `Glass Type: ${quote.glassName}\n` +
      `Size: ${quote.width}${quote.unit} × ${quote.height}${quote.unit}\n` +
      `Area: ${quote.areaSqft} sq ft\n` +
      `Quantity: ${quote.quantity}\n` +
      `Installation: ${quote.includeInstall ? "Yes" : "No"}\n` +
      `Frame: ${quote.includeFrame ? "Yes" : "No"}\n` +
      `Delivery: ${quote.includeDelivery ? "Yes" : "No"}${deliveryLocation ? ` — ${deliveryLocation}` : ""}\n` +
      (quote.accessoriesList.length > 0 ? `Accessories:\n${quote.accessoriesList.map(a => `  • ${a.name} × ${a.quantity}`).join('\n')}\n` : "") +
      `${showPricing ? `Estimated Total: KSh ${quote.total?.toLocaleString()}\n` : ""}` +
      `\nMy name is: ${customerName || "[name]"}\n` +
      `Phone: ${phone || "[phone]"}`
    : "";

  if (!enableInstantQuotes && !glassTypes.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calculator className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-playfair text-2xl font-bold mb-2">Quote Calculator Unavailable</h2>
          <p className="text-muted-foreground mb-6">Please contact us directly for a quote.</p>
          <a href={`https://wa.me/${companyPhone}?text=Hello, I would like a quote.`} target="_blank" rel="noopener noreferrer">
            <Button className="bg-green-600 hover:bg-green-700 gap-2">
              <MessageCircle className="w-4 h-4" /> Contact on WhatsApp
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#f8f5ff] to-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 text-center">
          <p className="text-gold text-sm font-medium uppercase tracking-widest mb-2">Instant Pricing Tool</p>
          <h1 className="font-playfair text-3xl lg:text-4xl font-bold text-foreground">Glass & Mirror Quote Calculator</h1>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Select your glass type, enter measurements, choose accessories, and get an estimated price in seconds.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calculator */}
          <div className="lg:col-span-2 space-y-5">
            {/* Glass Details */}
            <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" /> Your Glass Details
              </h2>

              <div>
                <label className="text-sm font-medium mb-1 block">Glass / Mirror Type *</label>
                <Select value={glassId} onValueChange={setGlassId}>
                  <SelectTrigger><SelectValue placeholder="Select glass type" /></SelectTrigger>
                  <SelectContent>
                    {glassTypes.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} {showPricing ? `— KSh ${g.price_per_sqft?.toLocaleString()}/sq ft` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Unit of Measurement</label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Width *</label>
                  <Input value={width} onChange={(e) => setWidth(e.target.value)} type="number" placeholder="4" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Height *</label>
                  <Input value={height} onChange={(e) => setHeight(e.target.value)} type="number" placeholder="6" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Quantity</label>
                  <Input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="1" placeholder="1" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">Add-ons</label>
                {[
                  { key: "includeInstall", label: "Professional Installation", state: includeInstall, set: setIncludeInstall },
                  { key: "includeFrame", label: "Include Frame", state: includeFrame, set: setIncludeFrame },
                  { key: "includeDelivery", label: "Delivery to My Location", state: includeDelivery, set: setIncludeDelivery },
                ].map((opt) => (
                  <label key={opt.key} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/20 transition-colors">
                    <input type="checkbox" checked={opt.state} onChange={(e) => opt.set(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
                {includeDelivery && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} placeholder="Your delivery location" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Your Name</label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Phone Number</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" />
                </div>
              </div>

              <Button onClick={calculate} disabled={!enableInstantQuotes} className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 gap-2 text-base font-semibold">
                <Calculator className="w-5 h-5" /> Calculate My Quote
              </Button>
            </div>

            {/* Accessories */}
            {accessories.length > 0 && (
              <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
                <h2 className="font-semibold text-foreground">Add Accessories (Optional)</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {accessories.filter(a => a.is_visible).map((acc) => (
                    <div key={acc.id} className="flex items-start gap-3 p-3 border border-border rounded-xl hover:border-primary/30 hover:bg-accent/10 transition-colors">
                      <Checkbox
                        checked={selectedAccessories.some(a => a.id === acc.id)}
                        onCheckedChange={() => toggleAccessory(acc)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <label className="font-medium text-sm cursor-pointer">{acc.name}</label>
                          {showPricing && <span className="text-sm font-semibold text-primary">KSh {acc.price?.toLocaleString()}</span>}
                        </div>
                        {acc.description && <p className="text-xs text-muted-foreground mt-0.5">{acc.description}</p>}
                        {selectedAccessories.some(a => a.id === acc.id) && (
                          <div className="mt-2 flex items-center gap-2">
                            <label className="text-xs font-medium">Qty:</label>
                            <Input
                              type="number"
                              min="1"
                              value={selectedAccessories.find(a => a.id === acc.id)?.quantity || 1}
                              onChange={(e) => updateAccessoryQuantity(acc.id, parseInt(e.target.value))}
                              className="w-16 h-8 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quote Result Sidebar */}
          <div>
            {quote ? (
              <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 space-y-4 shadow-xl shadow-primary/5 sticky top-20">
                <div className="text-center pb-4 border-b border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Glass Quote</p>
                  <h3 className="font-playfair text-2xl font-bold text-foreground mt-1">{quote.glassName}</h3>
                </div>

                {showPricing && (
                  <div className="space-y-2 text-sm">
                    {[
                      ["Size", `${quote.width} × ${quote.height} ${quote.unit}`],
                      ["Area", `${quote.areaSqft} sq ft`],
                      ["Price per sq ft", `KSh ${quote.ppsf?.toLocaleString()}`],
                      ["Quantity", quote.quantity],
                      ["Glass Cost", `KSh ${quote.glassCost?.toLocaleString()}`],
                      ...(quote.installCost > 0 ? [["Installation", `+ KSh ${quote.installCost?.toLocaleString()}`]] : []),
                      ...(quote.frameCost > 0 ? [["Frame", `+ KSh ${quote.frameCost?.toLocaleString()}`]] : []),
                      ...(quote.deliveryCost > 0 ? [["Delivery", `+ KSh ${quote.deliveryCost?.toLocaleString()}`]] : []),
                      ...(quote.accessoriesCost > 0 ? [["Accessories", `+ KSh ${quote.accessoriesCost?.toLocaleString()}`]] : []),
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 text-lg font-bold">
                      <span className="text-foreground">Estimated Total</span>
                      <span className="text-primary">KSh {quote.total?.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {quote.accessoriesList.length > 0 && (
                  <div className="bg-accent/30 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selected Accessories:</p>
                    {quote.accessoriesList.map((acc) => (
                      <div key={acc.id} className="flex justify-between text-xs">
                        <span>{acc.name} × {acc.quantity}</span>
                        {showPricing && <span className="font-medium">KSh {acc.subtotal?.toLocaleString()}</span>}
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">
                  ⚠️ This is an estimated quote. Final pricing may vary depending on confirmed measurements, installation complexity, and delivery location.
                </p>

                <div className="space-y-2 pt-2">
                  {enableWhatsApp && (
                    <a href={`https://wa.me/${companyPhone}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl gap-2">
                        <MessageCircle className="w-4 h-4" /> Send Quote to WhatsApp
                      </Button>
                    </a>
                  )}
                  <a href={`tel:+${companyPhone}`}>
                    <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-white rounded-xl gap-1 text-sm">
                      <Phone className="w-4 h-4" /> Call Now
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-accent rounded-xl gap-1 text-sm"
                    onClick={() => saveQuoteMutation.mutate()}
                    disabled={saveQuoteMutation.isPending}
                  >
                    <Save className="w-4 h-4" /> {saveQuoteMutation.isPending ? "Saving..." : "Save Quote"}
                  </Button>
                  <a href={`https://wa.me/${companyPhone}?text=${encodeURIComponent("Hello Leader Glazier and Furniture, I would like to request a site visit for glass measurement and installation.")}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full border-border text-foreground hover:border-primary hover:text-primary rounded-xl text-sm">
                      Request Site Visit
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#f8f5ff] to-accent/20 rounded-2xl border border-border p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Calculator className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-playfair text-xl font-bold text-foreground">How it works</h3>
                <ol className="text-sm text-muted-foreground space-y-2 text-left max-w-xs mx-auto">
                  {[
                    "Select your glass or mirror type",
                    "Enter width and height",
                    "Choose your unit (feet, cm, etc.)",
                    "Add accessories if needed",
                    "Choose installation or delivery",
                    "Click Calculate for instant estimate",
                    "Send the quote directly to WhatsApp"
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
