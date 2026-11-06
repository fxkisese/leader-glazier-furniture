// Helpers shared by the Inventory, Sales and Expenses screens.
// All money is rounded to the cent so totals add up exactly.
import { useId, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useStaff } from "@/lib/staffSession";
import { Input } from "@/components/ui/input";

export const COST_TYPES = [
  { value: "materials", label: "Materials" },
  { value: "labour", label: "Labour" },
  { value: "transport", label: "Transport" },
  { value: "finishing", label: "Finishing" },
  { value: "other", label: "Other" },
];

export const EXPENSE_CATEGORIES = ["rent", "electricity", "water", "wages", "tools", "transport", "marketing", "repairs", "other"];

export const PAYMENT_METHODS = ["mpesa", "cash", "bank", "card", "other"];

export const cents = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const money = (n) =>
  `KSh ${cents(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const today = () => new Date().toISOString().slice(0, 10);

export const lineTotal = (l) => cents(num(l.quantity) * num(l.unit_cost));

// Batch total, per-unit cost, a per-type breakdown, and margin at the planned selling price
export function itemCosts(item) {
  const lines = item.cost_lines || [];
  const total = cents(lines.reduce((s, l) => s + lineTotal(l), 0));
  const made = Math.max(num(item.quantity_made) || 1, 1);
  const unit = cents(total / made);
  const byType = Object.fromEntries(COST_TYPES.map((t) => [t.value, 0]));
  lines.forEach((l) => { byType[l.type] = cents((byType[l.type] || 0) + lineTotal(l)); });
  const price = num(item.selling_price);
  const profit = price ? cents(price - unit) : null;
  const margin = price ? (profit / price) * 100 : null;
  return { total, unit, byType, profit, margin };
}

export const costTypeLabel = (type) => COST_TYPES.find((t) => t.value === type)?.label || "Other";

// ── Cost sheet editing, shared by inventory cost sheets and sales ──
// Lines are held as strings while editing; a line needs a description and a cost to count.
export const blankLine = (type = "materials", label = "") => ({ key: crypto.randomUUID(), label, type, quantity: "1", unit: "", unit_cost: "", supplier: "" });

// The workshop's usual production items; new cost sheets start with these, ready for prices
export const MAIN_COST_ITEMS = [
  { label: "Boards", type: "materials" },
  { label: "Labour", type: "labour" },
  { label: "Transport", type: "transport" },
  { label: "Finishing", type: "finishing" },
  { label: "Paint", type: "finishing" },
  { label: "Ply", type: "materials" },
  { label: "Accessories", type: "materials" },
  { label: "Stands", type: "materials" },
];
export const mainCostLines = () => MAIN_COST_ITEMS.map((m) => blankLine(m.type, m.label));
export const editableLines = (lines) =>
  lines.map((l) => ({ ...l, key: crypto.randomUUID(), unit: l.unit || "", supplier: l.supplier || "", quantity: String(l.quantity), unit_cost: String(l.unit_cost) }));
export const validCostLines = (lines) => lines.filter((l) => l.label.trim() && num(l.unit_cost) > 0);
export const toCostLines = (lines) => validCostLines(lines).map((l) => ({
  label: l.label.trim(),
  type: l.type,
  quantity: num(l.quantity) || 1,
  ...(l.unit?.trim() ? { unit: l.unit.trim() } : {}),
  unit_cost: cents(l.unit_cost),
  ...(l.supplier?.trim() ? { supplier: l.supplier.trim() } : {}),
}));

// ── Suggestions: drop-down lists built from what's already been entered ──

// Non-empty values without repeats (ignoring case); the first spelling seen wins
export function uniqueValues(values) {
  const seen = new Map();
  values.forEach((v) => {
    const t = typeof v === "string" ? v.trim() : "";
    if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
  });
  return [...seen.values()];
}

// Attach to an input with list={id}. Values are strings, or { value, label } to show extra detail.
export function Suggestions({ id, values }) {
  return (
    <datalist id={id}>
      {values.map((v, i) => (typeof v === "string"
        ? <option key={v} value={v} />
        : <option key={`${v.value}-${i}`} value={v.value} label={v.label} />))}
    </datalist>
  );
}

// An <Input> with a drop-down of earlier entries; it still accepts anything typed
export function SuggestInput({ values, ...props }) {
  const id = useId();
  return (
    <>
      <Input list={id} autoComplete="off" {...props} />
      <Suggestions id={id} values={values} />
    </>
  );
}

export const COMMON_UNITS = ["pcs", "sheet", "ft", "m", "litre", "kg", "hrs", "day", "trip", "set"];

// What the cost sheet editor offers: item names, units, suppliers and their prices.
// Uses the same query keys as the Suppliers, Inventory and Sales tabs so it shares their data.
export function useCostSuggestions() {
  const { can } = useStaff();
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: () => base44.entities.Supplier.list(), enabled: can("suppliers") });
  const inventory = useQuery({ queryKey: ["inventory-items"], queryFn: () => base44.entities.InventoryItem.list(), enabled: can("inventory") });
  const sales = useQuery({ queryKey: ["sales"], queryFn: () => base44.entities.Sale.list(), enabled: can("costs") });

  return useMemo(() => {
    const offers = (suppliers.data || []).flatMap((s) => (s.price_list || []).map((p) => ({ ...p, supplier: s.name })));
    const past = [...(inventory.data || []).flatMap((i) => i.cost_lines || []), ...(sales.data || []).flatMap((s) => s.cost_lines || [])];
    // An item's usual type: main items first, then however it was last entered
    const types = {};
    [...MAIN_COST_ITEMS, ...past].forEach((l) => { types[l.label.trim().toLowerCase()] = l.type; });
    return {
      labels: uniqueValues([...MAIN_COST_ITEMS.map((m) => m.label), ...offers.map((o) => o.item), ...past.map((l) => l.label)]),
      units: uniqueValues([...offers.map((o) => o.unit), ...past.map((l) => l.unit), ...COMMON_UNITS]),
      typeOf: (label) => types[label.trim().toLowerCase()],
      // Suppliers selling this item, cheapest first (unpriced last)
      offersFor: (label) => offers
        .filter((o) => o.item.trim().toLowerCase() === label.trim().toLowerCase())
        .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)),
    };
  }, [suppliers.data, inventory.data, sales.data]);
}

export function CostLinesEditor({ lines, setLines, title = "Production costs" }) {
  const setLine = (key, k, v) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, [k]: v } : l)));
  const suggest = useCostSuggestions();
  const labelsId = useId(), unitsId = useId();
  // Picking a known item also sets its usual type
  const setLabel = (l, label) => {
    const type = suggest.typeOf(label);
    setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, label, ...(type ? { type } : {}) } : x)));
  };
  // Picking a supplier fills in their unit and price
  const pickSupplier = (l, name) => {
    const offer = suggest.offersFor(l.label).find((o) => o.supplier === name);
    setLines((ls) => ls.map((x) => (x.key !== l.key ? x : {
      ...x,
      supplier: name,
      ...(offer?.price != null ? { unit_cost: String(offer.price) } : {}),
      ...(offer?.unit ? { unit: offer.unit } : {}),
    })));
  };
  const has = new Set(lines.map((l) => l.label.trim().toLowerCase()));
  const missingMain = MAIN_COST_ITEMS.filter((m) => !has.has(m.label.toLowerCase()));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-sm font-medium">{title}</p>
        <div className="flex flex-wrap gap-1.5">
          {missingMain.length > 0 && (
            <button type="button" title={missingMain.map((m) => m.label).join(", ")}
              onClick={() => setLines((ls) => [...ls.filter((l) => l.label.trim() || num(l.unit_cost)), ...missingMain.map((m) => blankLine(m.type, m.label))])}
              className="text-xs px-2 py-1 rounded border border-black/10 bg-muted/60 hover:bg-muted font-medium">
              + Main items
            </button>
          )}
          {COST_TYPES.map((t) => (
            <button key={t.value} type="button" onClick={() => setLines((ls) => [...ls, blankLine(t.value)])}
              className="text-xs px-2 py-1 rounded border border-black/10 hover:bg-muted">
              + {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="border border-black/10 rounded-md overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="text-xs text-muted-foreground bg-muted/40">
            <tr>
              <th className="text-left font-medium px-2 py-2 w-[22%]">What</th>
              <th className="text-left font-medium px-2 py-2">Type</th>
              <th className="text-left font-medium px-2 py-2 w-[20%]">Supplier</th>
              <th className="text-left font-medium px-2 py-2 w-20">Qty</th>
              <th className="text-left font-medium px-2 py-2 w-20">Unit</th>
              <th className="text-left font-medium px-2 py-2 w-28">Cost each</th>
              <th className="text-right font-medium px-2 py-2 w-28">Total</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {lines.map((l) => {
              const offers = suggest.offersFor(l.label);
              const unlisted = l.supplier && !offers.some((o) => o.supplier === l.supplier);
              return (
              <tr key={l.key}>
                <td className="p-1.5"><Input list={labelsId} autoComplete="off" value={l.label} onChange={(e) => setLabel(l, e.target.value)} placeholder="e.g. Boards" className="h-8" /></td>
                <td className="p-1.5">
                  <NativeSelect value={l.type} onChange={(v) => setLine(l.key, "type", v)} className="h-8 py-1">
                    {COST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </NativeSelect>
                </td>
                <td className="p-1.5">
                  {offers.length || l.supplier ? (
                    <NativeSelect value={l.supplier || ""} onChange={(v) => pickSupplier(l, v)} className="h-8 py-1">
                      <option value="">— Choose —</option>
                      {offers.map((o) => (
                        <option key={o.supplier} value={o.supplier}>
                          {o.supplier}{o.price != null ? ` · ${money(o.price)}${o.unit ? `/${o.unit}` : ""}` : ""}
                        </option>
                      ))}
                      {unlisted && <option value={l.supplier}>{l.supplier}</option>}
                    </NativeSelect>
                  ) : <span className="text-xs text-muted-foreground px-1">No supplier lists this</span>}
                </td>
                <td className="p-1.5"><Input type="number" step="any" value={l.quantity} onChange={(e) => setLine(l.key, "quantity", e.target.value)} className="h-8" /></td>
                <td className="p-1.5"><Input list={unitsId} autoComplete="off" value={l.unit || ""} onChange={(e) => setLine(l.key, "unit", e.target.value)} placeholder="ft, m, hrs" className="h-8" /></td>
                <td className="p-1.5"><Input type="number" step="0.01" value={l.unit_cost} onChange={(e) => setLine(l.key, "unit_cost", e.target.value)} placeholder="0.00" className="h-8" /></td>
                <td className="p-1.5 text-right font-medium whitespace-nowrap">{money(lineTotal(l))}</td>
                <td className="p-1.5">
                  <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove line"
                    className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Suggestions id={labelsId} values={suggest.labels} />
      <Suggestions id={unitsId} values={suggest.units} />
      {lines.length > validCostLines(lines).length && (
        <p className="text-xs text-muted-foreground mt-1.5">Lines left without a cost aren't saved, so skip any item this piece didn't use.</p>
      )}
    </div>
  );
}

// Per-type totals of a cost sheet (from itemCosts), with each type's share of the total
export function CostTypeRows({ costs }) {
  return COST_TYPES.filter((t) => costs.byType[t.value] > 0).map((t) => (
    <div key={t.value} className="flex justify-between">
      <span className="text-muted-foreground">{t.label}</span>
      <span>{money(costs.byType[t.value])} <span className="text-xs text-muted-foreground">({((costs.byType[t.value] / costs.total) * 100).toFixed(1)}%)</span></span>
    </div>
  ));
}

// What a sale's pieces cost to make, split by cost type. Uses the cost sheet saved with the sale,
// or the linked item's current sheet if it still gives the same unit cost (sales recorded before
// sheets were saved with them). A cost typed in by hand stays one unsplit figure.
export function saleCosts(sale, items = []) {
  const qty = num(sale.quantity) || 1;
  const unit = cents(sale.unit_cost);
  const total = cents(unit * qty);
  const byType = Object.fromEntries(COST_TYPES.map((t) => [t.value, 0]));
  const sheetOf = (lines, made) =>
    lines?.length && itemCosts({ cost_lines: lines, quantity_made: made }).unit === unit
      ? { lines, made: Math.max(num(made) || 1, 1) } : null;
  const item = sale.inventory_item_id && items.find((i) => i.id === sale.inventory_item_id);
  const sheet = unit ? sheetOf(sale.cost_lines, sale.cost_batch) || (item ? sheetOf(item.cost_lines, item.quantity_made) : null) : null;
  if (!sheet) return { qty, total, byType, unsplit: total, sheet: null };

  const batch = itemCosts({ cost_lines: sheet.lines, quantity_made: sheet.made });
  Object.entries(batch.byType).forEach(([t, v]) => { byType[t] = cents((v / sheet.made) * qty); });
  // Per-type rounding can drift a cent from the unit cost; the biggest type absorbs it
  const drift = cents(total - Object.values(byType).reduce((s, v) => s + v, 0));
  if (drift) {
    const top = Object.keys(byType).reduce((a, b) => (byType[b] > byType[a] ? b : a));
    byType[top] = cents(byType[top] + drift);
  }
  return { qty, total, byType, unsplit: 0, sheet };
}

// Period filter shared by sales and expenses: "this-month" | "last-month" | "this-year" | "all"
export const PERIODS = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
  { value: "all", label: "All time" },
];

export function inPeriod(dateStr, period) {
  if (period === "all") return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  if (period === "this-year") return d.getFullYear() === now.getFullYear();
  const ref = period === "last-month" ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : now;
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

// Sales and expenses saved without a date fall back to when they were created
export const recordDate = (r) => r.date || (r.created_at ? r.created_at.slice(0, 10) : "");

export function Field({ label, children, hint }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export function NativeSelect({ value, onChange, children, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`flex h-9 w-full items-center rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
    >
      {children}
    </select>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" className={`bg-white rounded-lg shadow-2xl w-full ${wide ? "max-w-4xl" : "max-w-xl"} max-h-[95vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
          <h2 className="font-semibold text-lg text-obsidian">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-md hover:bg-muted text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-black/10 flex gap-3 justify-between">{footer}</div>}
      </div>
    </div>
  );
}

export function MiniStat({ label, value, sub, tone }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : "text-obsidian";
  return (
    <div className="bg-white border border-black/10 rounded-lg p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-semibold mt-1.5 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
