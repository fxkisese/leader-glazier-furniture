import { useId, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Truck, ShoppingCart, Search, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, EmptyState, ErrorState, ListSkeleton, Pill, FilterChips, formatDate } from "./adminShared";
import { Field, NativeSelect, Modal, MiniStat, money, cents, num, today, PERIODS, inPeriod, SuggestInput, Suggestions, uniqueValues, useCostSuggestions } from "./businessShared";

export const SUPPLIERS_KEY = ["suppliers"];
export const PURCHASES_KEY = ["purchases"];

const owing = (p) => cents(Math.max(num(p.amount) - num(p.amount_paid), 0));

export default function AdminSuppliersTab() {
  const [modal, setModal] = useState(null); // { supplier } | { purchase }
  const [period, setPeriod] = useState("this-month");
  const queryClient = useQueryClient();
  const suppliers = useQuery({ queryKey: SUPPLIERS_KEY, queryFn: () => base44.entities.Supplier.list() });
  const purchases = useQuery({ queryKey: PURCHASES_KEY, queryFn: () => base44.entities.Purchase.list() });

  const byId = useMemo(() => Object.fromEntries((suppliers.data || []).map((s) => [s.id, s])), [suppliers.data]);
  const allPurchases = purchases.data || [];
  const supplierRows = (suppliers.data || []).map((s) => {
    const mine = allPurchases.filter((p) => p.supplier_id === s.id);
    return { ...s, bought: cents(mine.reduce((t, p) => t + num(p.amount), 0)), owed: cents(mine.reduce((t, p) => t + owing(p), 0)) };
  }).sort((a, b) => b.owed - a.owed || b.bought - a.bought);

  const periodPurchases = allPurchases.filter((p) => inPeriod(p.date, period)).sort((a, b) => b.date.localeCompare(a.date));
  const spent = cents(periodPurchases.reduce((t, p) => t + num(p.amount), 0));
  const owedTotal = cents(allPurchases.reduce((t, p) => t + owing(p), 0));
  const error = suppliers.error || purchases.error;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY });
    queryClient.invalidateQueries({ queryKey: PURCHASES_KEY });
    setModal(null);
  };

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Who you buy timber, foam, fabric and hardware from — what you've bought and what you still owe them."
        actions={
          <>
            <Button variant="outline" className="bg-white gap-2" onClick={() => setModal({ supplier: null })}><Plus className="w-4 h-4" /> Add supplier</Button>
            <Button className="bg-obsidian hover:bg-obsidian/90 text-white gap-2" disabled={!supplierRows.length} onClick={() => setModal({ purchase: null })}>
              <ShoppingCart className="w-4 h-4" /> Record purchase
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <MiniStat label="Suppliers" value={supplierRows.length} />
        <MiniStat label={`Bought (${PERIODS.find((p) => p.value === period).label.toLowerCase()})`} value={money(spent)} />
        <MiniStat label="You owe suppliers" value={money(owedTotal)} tone={owedTotal > 0 ? "bad" : undefined} />
      </div>

      {error ? <Panel><ErrorState error={error} onRetry={() => { suppliers.refetch(); purchases.refetch(); }} /></Panel> : (
        <div className="grid xl:grid-cols-5 gap-6">
          <Panel className="xl:col-span-2 h-fit">
            <p className="px-4 py-3 border-b border-black/10 text-sm font-semibold text-obsidian">Suppliers</p>
            {suppliers.isLoading ? <ListSkeleton rows={3} /> : supplierRows.length === 0 ? (
              <EmptyState icon={Truck} title="No suppliers yet" action={<Button onClick={() => setModal({ supplier: null })} className="bg-obsidian text-white gap-2"><Plus className="w-4 h-4" /> Add supplier</Button>} />
            ) : (
              <ul className="divide-y divide-black/5">
                {supplierRows.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => setModal({ supplier: s })} className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/30">
                      <span className="flex-1 min-w-0">
                        <span className="font-medium text-obsidian block">{s.name}</span>
                        <span className="text-xs text-muted-foreground block truncate">
                          {s.price_list?.length ? s.price_list.map((p) => p.item).join(", ") : s.supplies}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          {[s.location, s.phone, s.delivery_fee != null && `Delivery ${deliveryLabel(s)}`].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-medium">{money(s.bought)}</span>
                        {s.owed > 0 && <span className="text-xs text-red-600">{money(s.owed)} owed</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="xl:col-span-3">
            <div className="px-4 py-3 border-b border-black/10 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-obsidian">Purchases</p>
              <FilterChips options={PERIODS} value={period} onChange={setPeriod} />
            </div>
            {purchases.isLoading ? <ListSkeleton /> : periodPurchases.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="No purchases in this period" />
            ) : (
              <ul className="divide-y divide-black/5">
                {periodPurchases.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => setModal({ purchase: p })} className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/30">
                      <span className="w-24 shrink-0 text-muted-foreground">{formatDate(p.date)}</span>
                      <span className="flex-1 min-w-0">
                        <span className="font-medium text-obsidian block truncate">{p.description}</span>
                        <span className="text-xs text-muted-foreground">{byId[p.supplier_id]?.name || "Deleted supplier"}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-medium">{money(p.amount)}</span>
                        {owing(p) > 0 ? <Pill tone="red">{money(owing(p))} owed</Pill> : <Pill tone="green">Paid</Pill>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {!error && supplierRows.length > 0 && <PriceComparison suppliers={supplierRows} onOpen={(s) => setModal({ supplier: s })} />}

      {modal && "supplier" in modal && <SupplierModal key={modal.supplier?.id || "new"} supplier={modal.supplier} locations={uniqueValues(supplierRows.map((s) => s.location))} onClose={() => setModal(null)} onSaved={refresh} />}
      {modal && "purchase" in modal && (
        <PurchaseModal key={modal.purchase?.id || "new"} purchase={modal.purchase} suppliers={supplierRows} purchases={allPurchases} onClose={() => setModal(null)} onSaved={refresh} />
      )}
    </div>
  );
}

// Every item every supplier sells, so you can see who has what and who is cheapest
function PriceComparison({ suppliers, onOpen }) {
  const [search, setSearch] = useState("");
  const rows = suppliers
    .flatMap((s) => (s.price_list || []).map((p) => ({ ...p, supplier: s })))
    .filter((r) => !search || `${r.item} ${r.supplier.name} ${r.supplier.location || ""}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.item.localeCompare(b.item, undefined, { sensitivity: "base" }) || num(a.price) - num(b.price));
  // Cheapest per item and unit (prices per sheet and per foot can't be compared)
  const cheapest = {};
  rows.forEach((r) => {
    const k = `${r.item.toLowerCase()}|${(r.unit || "").toLowerCase()}`;
    if (r.price > 0 && !(cheapest[k] <= r.price)) cheapest[k] = r.price;
  });

  return (
    <Panel className="mt-6">
      <div className="px-4 py-3 border-b border-black/10 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-obsidian">Who sells what</p>
          <p className="text-xs text-muted-foreground">Every supplier's prices side by side. Cheapest for each item is marked.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Boards, ply, paint..." className="pl-9 bg-white" />
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 px-4">
          {search ? "No supplier sells that yet." : "Open a supplier and add what they sell with prices to compare them here."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Item</th>
                <th className="text-left font-medium px-4 py-2.5">Supplier</th>
                <th className="text-left font-medium px-4 py-2.5">Location</th>
                <th className="text-right font-medium px-4 py-2.5">Price</th>
                <th className="text-right font-medium px-4 py-2.5">Delivery fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {rows.map((r, i) => {
                const best = r.price > 0 && cheapest[`${r.item.toLowerCase()}|${(r.unit || "").toLowerCase()}`] === r.price;
                return (
                  <tr key={`${r.supplier.id}-${i}`} onClick={() => onOpen(r.supplier)} className="cursor-pointer hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium text-obsidian">{r.item}</td>
                    <td className="px-4 py-2.5">{r.supplier.name}{r.supplier.phone && <span className="block text-xs text-muted-foreground">{r.supplier.phone}</span>}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.supplier.location || "—"}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {r.price > 0 ? <>{money(r.price)}{r.unit && <span className="text-xs text-muted-foreground"> / {r.unit}</span>}</> : <span className="text-muted-foreground">Ask</span>}
                      {best && <span className="ml-2"><Pill tone="green">Cheapest</Pill></span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap">{deliveryLabel(r.supplier)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

const deliveryLabel = (s) => (s.delivery_fee == null ? "—" : s.delivery_fee > 0 ? money(s.delivery_fee) : "Free");

const blankPrice = () => ({ key: crypto.randomUUID(), item: "", unit: "", price: "" });

function SupplierModal({ supplier, locations, onClose, onSaved }) {
  const isEdit = !!supplier;
  const suggest = useCostSuggestions();
  const itemsId = useId(), unitsId = useId();
  const [form, setForm] = useState({
    name: supplier?.name || "", phone: supplier?.phone || "",
    location: supplier?.location || "", notes: supplier?.notes || "",
    delivery_fee: supplier?.delivery_fee != null ? String(supplier.delivery_fee) : "",
  });
  // Older suppliers only have a free-text list ("Timber, foam"); turn it into price lines to fill in
  const [prices, setPrices] = useState(() => {
    const list = supplier?.price_list?.length
      ? supplier.price_list
      : (supplier?.supplies || "").split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).map((item) => ({ item }));
    const rows = list.map((p) => ({ key: crypto.randomUUID(), item: p.item, unit: p.unit || "", price: p.price != null ? String(p.price) : "" }));
    return rows.length ? rows : [blankPrice()];
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPrice = (key, k, v) => setPrices((ps) => ps.map((p) => (p.key === key ? { ...p, [k]: v } : p)));

  const save = useMutation({
    mutationFn: () => {
      const data = {
        ...Object.fromEntries(["name", "phone", "location", "notes"].map((k) => [k, form[k].trim() || undefined])),
        delivery_fee: form.delivery_fee === "" ? undefined : cents(form.delivery_fee),
        price_list: prices.filter((p) => p.item.trim()).map((p) => ({
          item: p.item.trim(),
          ...(p.unit.trim() ? { unit: p.unit.trim() } : {}),
          ...(p.price !== "" ? { price: cents(p.price) } : {}),
        })),
        supplies: undefined, // now kept in the price list
      };
      if (!isEdit) return base44.entities.Supplier.create(data);
      return base44.entities.Supplier.update(supplier.id, data, Object.keys(data).filter((k) => data[k] === undefined));
    },
    onSuccess: () => { toast.success(isEdit ? "Supplier updated" : "Supplier added"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  const remove = useMutation({
    mutationFn: () => base44.entities.Supplier.delete(supplier.id),
    onSuccess: () => { toast.success("Supplier deleted"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Modal
      wide
      title={isEdit ? "Edit supplier" : "Add supplier"}
      onClose={onClose}
      footer={
        <>
          <div>{isEdit && <Button variant="outline" className="text-destructive border-destructive/40" onClick={() => { if (confirm("Delete this supplier? Their purchases are kept.")) remove.mutate(); }}>Delete</Button>}</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name *"><Input value={form.name} onChange={set("name")} placeholder="Gikomba Timber Yard" /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Location"><SuggestInput values={locations} value={form.location} onChange={set("location")} placeholder="Gikomba, Nairobi" /></Field>
        <Field label="Delivery fee (KSh)" hint="What they charge to deliver. Enter 0 if delivery is free.">
          <Input type="number" step="0.01" min="0" value={form.delivery_fee} onChange={set("delivery_fee")} placeholder="0.00" />
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">What they sell</p>
          <button type="button" onClick={() => setPrices((ps) => [...ps, blankPrice()])} className="text-xs px-2 py-1 rounded border border-black/10 hover:bg-muted">
            + Add item
          </button>
        </div>
        <div className="border border-black/10 rounded-md overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="text-xs text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left font-medium px-2 py-2 w-[45%]">Item</th>
                <th className="text-left font-medium px-2 py-2">Sold per</th>
                <th className="text-left font-medium px-2 py-2 w-36">Price (KSh)</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {prices.map((p) => (
                <tr key={p.key}>
                  <td className="p-1.5"><Input list={itemsId} autoComplete="off" value={p.item} onChange={(e) => setPrice(p.key, "item", e.target.value)} placeholder="e.g. Boards" className="h-8" /></td>
                  <td className="p-1.5"><Input list={unitsId} autoComplete="off" value={p.unit} onChange={(e) => setPrice(p.key, "unit", e.target.value)} placeholder="sheet, ft, litre" className="h-8" /></td>
                  <td className="p-1.5"><Input type="number" step="0.01" value={p.price} onChange={(e) => setPrice(p.key, "price", e.target.value)} placeholder="0.00" className="h-8" /></td>
                  <td className="p-1.5">
                    <button type="button" onClick={() => setPrices((ps) => ps.filter((x) => x.key !== p.key))} aria-label="Remove item"
                      className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Suggestions id={itemsId} values={suggest.labels} />
        <Suggestions id={unitsId} values={suggest.units} />
        <p className="text-xs text-muted-foreground mt-1.5">Leave the price blank if it changes. Rows without an item name aren't saved.</p>
      </div>

      <Field label="Notes"><Input value={form.notes} onChange={set("notes")} placeholder="Payment terms, contact person, M-Pesa till..." /></Field>
    </Modal>
  );
}

function PurchaseModal({ purchase, suppliers, purchases, onClose, onSaved }) {
  const isEdit = !!purchase;
  const [form, setForm] = useState({
    supplier_id: purchase?.supplier_id || suppliers[0]?.id || "",
    date: purchase?.date || today(),
    description: purchase?.description || "",
    amount: purchase ? String(purchase.amount) : "",
    amount_paid: purchase?.amount_paid != null ? String(purchase.amount_paid) : "",
    notes: purchase?.notes || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const amount = cents(form.amount);
  const paid = form.amount_paid === "" ? amount : cents(form.amount_paid);
  // This supplier's price list (with prices shown), then what was bought from them before
  const chosen = suppliers.find((s) => s.id === form.supplier_id);
  const listed = (chosen?.price_list || []).map((p) => ({
    value: p.item,
    label: p.price != null ? `${money(p.price)}${p.unit ? ` / ${p.unit}` : ""}` : "Price varies",
  }));
  const supplierItems = [
    ...listed,
    ...uniqueValues(purchases.filter((p) => p.supplier_id === form.supplier_id).map((p) => p.description))
      .filter((d) => !listed.some((l) => l.value.toLowerCase() === d.toLowerCase())),
  ];

  const save = useMutation({
    mutationFn: () => {
      const data = {
        supplier_id: form.supplier_id, date: form.date || today(), description: form.description.trim(),
        amount, amount_paid: paid, notes: form.notes.trim() || undefined,
      };
      return isEdit ? base44.entities.Purchase.update(purchase.id, data, data.notes ? [] : ["notes"]) : base44.entities.Purchase.create(data);
    },
    onSuccess: () => { toast.success(isEdit ? "Purchase updated" : "Purchase recorded"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  const remove = useMutation({
    mutationFn: () => base44.entities.Purchase.delete(purchase.id),
    onSuccess: () => { toast.success("Purchase deleted"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Modal
      title={isEdit ? "Edit purchase" : "Record purchase"}
      onClose={onClose}
      footer={
        <>
          <div>{isEdit && <Button variant="outline" className="text-destructive border-destructive/40" onClick={() => { if (confirm("Delete this purchase?")) remove.mutate(); }}>Delete</Button>}</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.supplier_id || !form.description.trim() || !(amount > 0)}
              className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Supplier *">
          <NativeSelect value={form.supplier_id} onChange={(v) => set("supplier_id", v)}>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Date"><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
      </div>
      <Field label="What you bought *" hint={supplierItems.length ? "Pick from what this supplier sells, or type anything" : undefined}>
        <SuggestInput values={supplierItems} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="40 ft mahogany, 6 foam sheets..." />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Total (KSh) *"><Input type="number" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" /></Field>
        <Field label="Paid so far (KSh)" hint="Leave blank if paid in full">
          <Input type="number" step="0.01" value={form.amount_paid} onChange={(e) => set("amount_paid", e.target.value)} placeholder={amount.toFixed(2)} />
        </Field>
      </div>
      {paid < amount && <p className="text-sm text-red-600">You still owe: {money(amount - paid)}</p>}
      <Field label="Notes"><Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Receipt / invoice number" /></Field>
      <p className="text-xs text-muted-foreground">
        Purchases track what you owe suppliers. They aren't added to expenses, because material costs are already counted in each item's cost sheet when it sells.
      </p>
    </Modal>
  );
}
