import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Boxes, Search, Copy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel, EmptyState, ErrorState, ListSkeleton, Pill, PRODUCT_CATEGORIES, humanize, formatDate } from "./adminShared";
import {
  Field, NativeSelect, Modal, MiniStat, money, cents, num, today, itemCosts,
  CostLinesEditor, CostTypeRows, mainCostLines, editableLines, validCostLines, toCostLines,
} from "./businessShared";

export const INVENTORY_KEY = ["inventory-items"];

export default function AdminInventoryTab() {
  const [modal, setModal] = useState(null); // null | "new" | item | { copyOf: item }
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: INVENTORY_KEY,
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const rows = useMemo(
    () => items
      .map((it) => ({ ...it, costs: itemCosts(it) }))
      .filter((it) => !search || `${it.name} ${it.category}`.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  const totals = rows.reduce(
    (t, it) => ({
      units: t.units + Math.max(num(it.stock_qty), 0),
      stockValue: t.stockValue + Math.max(num(it.stock_qty), 0) * it.costs.unit,
      spent: t.spent + it.costs.total,
    }),
    { units: 0, stockValue: 0, spent: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Inventory & Costs"
        description="Break down what every piece costs to make — materials, labour, transport and finishing — and track how many are left."
        actions={
          <Button onClick={() => setModal("new")} className="bg-obsidian hover:bg-obsidian/90 text-white gap-2">
            <Plus className="w-4 h-4" /> New cost sheet
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MiniStat label="Items tracked" value={items.length} />
        <MiniStat label="Units in stock" value={totals.units} />
        <MiniStat label="Stock value (at cost)" value={money(totals.stockValue)} sub="Money tied up in unsold pieces" />
        <MiniStat label="Total production spend" value={money(totals.spent)} />
      </div>

      <Panel>
        <div className="p-4 border-b border-black/10">
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items" className="pl-9 bg-white" />
          </div>
        </div>

        {isLoading ? <ListSkeleton /> : error ? <ErrorState error={error} onRetry={refetch} /> : rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={search ? "No matching items" : "No cost sheets yet"}
            description="Create a cost sheet for a piece of furniture and list everything that went into making it."
            action={!search && <Button onClick={() => setModal("new")} className="bg-obsidian text-white gap-2"><Plus className="w-4 h-4" /> New cost sheet</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground bg-muted/40">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Item</th>
                  <th className="text-right font-medium px-4 py-2.5">In stock</th>
                  <th className="text-right font-medium px-4 py-2.5">Cost / unit</th>
                  <th className="text-right font-medium px-4 py-2.5">Selling price</th>
                  <th className="text-right font-medium px-4 py-2.5">Profit / unit</th>
                  <th className="text-right font-medium px-4 py-2.5">Stock value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rows.map((it) => {
                  const stock = num(it.stock_qty);
                  return (
                    <tr key={it.id} onClick={() => setModal(it)} className="cursor-pointer hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-obsidian">{it.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[it.category && humanize(it.category), `${num(it.quantity_made) || 1} made`, it.date && formatDate(it.date)].filter(Boolean).join(" · ")}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {stock <= 0 ? <Pill tone="red">{stock < 0 ? `${stock} oversold` : "Sold out"}</Pill> : stock}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{money(it.costs.unit)}</td>
                      <td className="px-4 py-3 text-right">{it.selling_price ? money(it.selling_price) : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3 text-right">
                        {it.costs.profit === null ? <span className="text-muted-foreground">—</span> : (
                          <span className={it.costs.profit < 0 ? "text-red-600" : "text-emerald-700"}>
                            {money(it.costs.profit)} <span className="text-xs opacity-70">({it.costs.margin.toFixed(1)}%)</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">{money(Math.max(stock, 0) * it.costs.unit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {modal && (
        <CostSheetModal
          key={modal === "new" ? "new" : modal.copyOf ? `copy-${modal.copyOf.id}` : modal.id}
          item={modal === "new" ? null : modal.copyOf ? null : modal}
          template={modal.copyOf}
          onCopy={(it) => setModal({ copyOf: it })}
          onClose={() => setModal(null)}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: INVENTORY_KEY }); setModal(null); }}
        />
      )}
    </div>
  );
}

function CostSheetModal({ item, template, onCopy, onClose, onSaved }) {
  const isEdit = !!item;
  const src = item || template;
  const { data: products = [] } = useQuery({
    queryKey: ["products", "admin-all"],
    queryFn: () => base44.entities.Product.list(),
  });

  const [form, setForm] = useState({
    name: src ? (template ? `${src.name} (copy)` : src.name) : "",
    category: src?.category || "",
    product_id: src?.product_id || "",
    quantity_made: String(src?.quantity_made ?? 1),
    stock_qty: isEdit ? String(src.stock_qty ?? 0) : "",
    selling_price: src?.selling_price != null ? String(src.selling_price) : "",
    date: template ? today() : src?.date || today(),
    notes: src?.notes || "",
  });
  const [lines, setLines] = useState(() =>
    src?.cost_lines?.length ? editableLines(src.cost_lines) : mainCostLines(),
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pickProduct = (id) => {
    const p = products.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      product_id: id,
      name: f.name || p?.name || "",
      category: f.category || p?.category || "",
      selling_price: f.selling_price || (p ? String(p.discount_price || p.price || "") : ""),
    }));
  };

  const costs = itemCosts({ cost_lines: validCostLines(lines), quantity_made: form.quantity_made, selling_price: form.selling_price });

  const save = useMutation({
    mutationFn: () => {
      const made = Math.max(Math.round(num(form.quantity_made)) || 1, 1);
      const data = {
        name: form.name.trim(),
        category: form.category || undefined,
        product_id: form.product_id || undefined,
        quantity_made: made,
        stock_qty: form.stock_qty === "" ? made : Math.round(num(form.stock_qty)),
        selling_price: form.selling_price === "" ? undefined : cents(form.selling_price),
        date: form.date || undefined,
        notes: form.notes.trim() || undefined,
        cost_lines: toCostLines(lines),
      };
      if (!isEdit) return base44.entities.InventoryItem.create(data);
      const clear = ["category", "product_id", "selling_price", "date", "notes"].filter((k) => data[k] === undefined);
      return base44.entities.InventoryItem.update(item.id, data, clear);
    },
    onSuccess: () => { toast.success(isEdit ? "Cost sheet updated" : "Cost sheet saved"); onSaved(); },
    onError: (err) => toast.error("Save failed: " + (err.message || "Unknown error")),
  });

  const remove = useMutation({
    mutationFn: () => base44.entities.InventoryItem.delete(item.id),
    onSuccess: () => { toast.success("Cost sheet deleted"); onSaved(); },
    onError: (err) => toast.error("Delete failed: " + (err.message || "Unknown error")),
  });

  return (
    <Modal
      wide
      title={isEdit ? "Edit cost sheet" : "New cost sheet"}
      onClose={onClose}
      footer={
        <>
          <div className="flex gap-2">
            {isEdit && (
              <>
                <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                  onClick={() => { if (confirm("Delete this cost sheet? Past sales keep their recorded costs.")) remove.mutate(); }}>
                  Delete
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => onCopy(item)} title="Start a new batch with the same costs">
                  <Copy className="w-4 h-4" /> New batch
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Item name *">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="L-shaped sofa, grey velvet" />
        </Field>
        <Field label="Website product (optional)" hint="Links this cost sheet to a product in your catalogue">
          <NativeSelect value={form.product_id} onChange={pickProduct}>
            <option value="">— Not linked —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        </Field>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Category">
          <NativeSelect value={form.category} onChange={(v) => set("category", v)}>
            <option value="">—</option>
            {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Date made">
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Units made" hint="Costs below cover this many">
          <Input type="number" min="1" value={form.quantity_made} onChange={(e) => set("quantity_made", e.target.value)} />
        </Field>
        <Field label="Units in stock" hint={isEdit ? "Sales reduce this automatically" : "Defaults to units made"}>
          <Input type="number" value={form.stock_qty} onChange={(e) => set("stock_qty", e.target.value)} placeholder={form.quantity_made} />
        </Field>
      </div>

      <CostLinesEditor lines={lines} setLines={setLines} />

      {/* Summary */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-md bg-muted/40 p-4 space-y-1.5 text-sm">
          <CostTypeRows costs={costs} />
          <div className="flex justify-between font-semibold pt-1.5 border-t border-black/10">
            <span>Total for {Math.max(num(form.quantity_made) || 1, 1)} unit(s)</span><span>{money(costs.total)}</span>
          </div>
          <div className="flex justify-between font-semibold text-obsidian">
            <span>Cost per unit</span><span>{money(costs.unit)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <Field label="Planned selling price per unit (KSh)">
            <Input type="number" step="0.01" value={form.selling_price} onChange={(e) => set("selling_price", e.target.value)} placeholder="0.00" />
          </Field>
          {costs.profit !== null && (
            <p className={`text-sm font-medium ${costs.profit < 0 ? "text-red-600" : "text-emerald-700"}`}>
              {costs.profit < 0 ? "Loss" : "Profit"} per unit: {money(costs.profit)} ({costs.margin.toFixed(1)}% margin)
            </p>
          )}
          <Field label="Notes">
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Supplier, fabric code, workshop notes..." />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
