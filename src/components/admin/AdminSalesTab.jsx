import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Receipt, AlertCircle, FileText } from "lucide-react";
import { base44, businessApi } from "@/api/base44Client";
import { useStaff } from "@/lib/staffSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, EmptyState, ErrorState, ListSkeleton, Pill, FilterChips, formatDate, humanize } from "./adminShared";
import {
  Field, NativeSelect, Modal, MiniStat, money, cents, num, today, itemCosts, saleCosts,
  CostLinesEditor, CostTypeRows, mainCostLines, editableLines, validCostLines, toCostLines,
  COST_TYPES, costTypeLabel, SuggestInput, uniqueValues, PERIODS, PAYMENT_METHODS, inPeriod, recordDate,
} from "./businessShared";
import { INVENTORY_KEY } from "./AdminInventoryTab";
import { CUSTOMERS_KEY } from "./AdminCustomersTab";
import InvoiceDialog from "./InvoiceDialog";
import { saleInvoice } from "./invoice";

export const SALES_KEY = ["sales"];
export const EXPENSES_KEY = ["expenses"];

const saleProfit = (s) => cents(num(s.amount) - num(s.unit_cost) * (num(s.quantity) || 1));
const balance = (s) => cents(num(s.amount) - num(s.amount_paid));

const STATUS_TONE = { paid: "green", partial: "amber", unpaid: "red" };

export default function AdminSalesTab() {
  const [period, setPeriod] = useState("this-month");
  const [modal, setModal] = useState(null); // null | "new" | sale
  const [invoiceFor, setInvoiceFor] = useState(null); // sale
  const queryClient = useQueryClient();
  const { can } = useStaff();
  const canCosts = can("costs");

  const sales = useQuery({ queryKey: SALES_KEY, queryFn: () => base44.entities.Sale.list() });
  const expenses = useQuery({ queryKey: EXPENSES_KEY, queryFn: () => base44.entities.Expense.list(), enabled: canCosts });
  // Staff without inventory access get item names, stock and prices only — no cost sheets
  const inventory = useQuery(can("inventory")
    ? { queryKey: INVENTORY_KEY, queryFn: () => base44.entities.InventoryItem.list() }
    : { queryKey: ["inventory-for-sale"], queryFn: businessApi.inventoryForSale });
  const customers = useQuery({ queryKey: CUSTOMERS_KEY, queryFn: () => base44.entities.Customer.list() });

  const rows = useMemo(
    () => (sales.data || [])
      .filter((s) => inPeriod(recordDate(s), period))
      .sort((a, b) => recordDate(b).localeCompare(recordDate(a))),
    [sales.data, period],
  );

  const costsById = useMemo(
    () => Object.fromEntries(rows.map((s) => [s.id, saleCosts(s, inventory.data || [])])),
    [rows, inventory.data],
  );
  const periodExpenses = (expenses.data || []).filter((e) => inPeriod(recordDate(e), period));

  const revenue = cents(rows.reduce((t, s) => t + num(s.amount), 0));
  const received = cents(rows.reduce((t, s) => t + num(s.amount_paid), 0));
  const cogs = cents(rows.reduce((t, s) => t + num(s.unit_cost) * (num(s.quantity) || 1), 0));
  const gross = cents(revenue - cogs);
  const spent = cents(periodExpenses.reduce((t, e) => t + num(e.amount), 0));
  const net = cents(gross - spent);
  const owed = (sales.data || []).filter((s) => balance(s) > 0);
  const owedTotal = cents(owed.reduce((t, s) => t + balance(s), 0));
  const missingCost = canCosts ? rows.filter((s) => !s.unit_cost).length : 0;

  const error = sales.error || expenses.error || inventory.error || customers.error;
  const periodLabel = PERIODS.find((p) => p.value === period)?.label.toLowerCase();

  return (
    <div>
      <PageHeader
        title="Sales & Profit"
        description={canCosts ? "Record every sale. Profit is worked out from each item's production cost at the time it was sold." : "Record every sale and keep track of what customers still owe."}
        actions={
          <Button onClick={() => setModal("new")} className="bg-obsidian hover:bg-obsidian/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Record sale
          </Button>
        }
      />

      <div className="mb-4"><FilterChips options={PERIODS} value={period} onChange={setPeriod} /></div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <MiniStat label="Sales" value={money(revenue)} sub={`${rows.length} sale${rows.length === 1 ? "" : "s"} · ${money(received)} received`} />
        {canCosts && <>
        <MiniStat label="Cost of goods" value={money(cogs)} sub="What the sold pieces cost to make" />
        <MiniStat label="Gross profit" value={money(gross)} tone={gross < 0 ? "bad" : "good"} sub={revenue ? `${((gross / revenue) * 100).toFixed(1)}% margin` : undefined} />
        <MiniStat label="Expenses" value={money(spent)} sub="Rent, bills, wages..." />
        <MiniStat label="Net profit" value={money(net)} tone={net < 0 ? "bad" : "good"} sub="Gross profit minus expenses" />
        </>}
        <MiniStat label="Owed to you" value={money(owedTotal)} tone={owedTotal > 0 ? "bad" : undefined} sub={`${owed.length} unpaid balance${owed.length === 1 ? "" : "s"} (all time)`} />
      </div>

      {missingCost > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {missingCost} sale{missingCost === 1 ? " has" : "s have"} no production cost, so {missingCost === 1 ? "its" : "their"} profit is overstated. Open {missingCost === 1 ? "it" : "them"} and add a cost.
        </div>
      )}

      {canCosts && rows.length > 0 && (
        <ProfitAndLoss
          periodLabel={PERIODS.find((p) => p.value === period)?.label}
          revenue={revenue} cogs={cogs} gross={gross} net={net} spent={spent}
          costs={Object.values(costsById)} expenses={periodExpenses}
        />
      )}

      <Panel>
        {sales.isLoading ? <ListSkeleton /> : error ? (
          <ErrorState error={error} onRetry={() => [sales, expenses, inventory].forEach((q) => q.refetch())} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={`No sales ${period === "all" ? "yet" : periodLabel}`}
            description="Record a sale to see your profit here."
            action={<Button onClick={() => setModal("new")} className="bg-obsidian text-white gap-2"><Plus className="w-4 h-4" /> Record sale</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground bg-muted/40">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Date</th>
                  <th className="text-left font-medium px-4 py-2.5">Item</th>
                  <th className="text-left font-medium px-4 py-2.5">Customer</th>
                  <th className="text-right font-medium px-4 py-2.5">Total</th>
                  {canCosts && <th className="text-right font-medium px-4 py-2.5">Cost</th>}
                  {canCosts && <th className="text-right font-medium px-4 py-2.5">Profit</th>}
                  <th className="text-right font-medium px-4 py-2.5">Payment</th>
                  <th className="px-2 py-2.5"><span className="sr-only">Invoice</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rows.map((s) => {
                  const qty = num(s.quantity) || 1;
                  const profit = saleProfit(s);
                  const status = s.status || "paid";
                  return (
                    <tr key={s.id} onClick={() => setModal(s)} className="cursor-pointer hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(recordDate(s))}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-obsidian">{s.product_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{qty} × {money(s.unit_price ?? num(s.amount) / qty)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{s.customer_name || <span className="text-muted-foreground">Walk-in</span>}</p>
                        {s.customer_phone && <p className="text-xs text-muted-foreground">{s.customer_phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{money(s.amount)}</td>
                      {canCosts && (
                        <td className="px-4 py-3 text-right">
                          {s.unit_cost ? money(s.unit_cost * qty) : <Pill tone="amber">Missing</Pill>}
                          {s.unit_cost > 0 && <p className="text-xs text-muted-foreground whitespace-nowrap">{costSplit(costsById[s.id])}</p>}
                        </td>
                      )}
                      {canCosts && <td className={`px-4 py-3 text-right font-medium ${profit < 0 ? "text-red-600" : "text-emerald-700"}`}>{money(profit)}</td>}
                      <td className="px-4 py-3 text-right">
                        <Pill tone={STATUS_TONE[status] || "gray"}>{humanize(status)}{s.payment_method ? ` · ${humanize(s.payment_method)}` : ""}</Pill>
                        {balance(s) > 0 && <p className="text-xs text-red-600 mt-1">{money(balance(s))} due</p>}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <Button variant="outline" size="sm" className="gap-1.5 h-8" title="Create invoice"
                          onClick={(e) => { e.stopPropagation(); setInvoiceFor(s); }}>
                          <FileText className="w-3.5 h-3.5" /> Invoice
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {invoiceFor && (
        <InvoiceDialog
          key={invoiceFor.id}
          invoice={saleInvoice(invoiceFor, (customers.data || []).find((c) => c.id === invoiceFor.customer_id))}
          onClose={() => setInvoiceFor(null)}
        />
      )}

      {modal && (
        <SaleModal
          key={modal === "new" ? "new" : modal.id}
          sale={modal === "new" ? null : modal}
          items={inventory.data || []}
          pastNames={uniqueValues((sales.data || []).map((s) => s.product_name))}
          customers={customers.data || []}
          canCosts={canCosts}
          onClose={() => setModal(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: SALES_KEY });
            queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
            queryClient.invalidateQueries({ queryKey: ["inventory-for-sale"] });
            queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

// Two biggest cost types as a share of the sale's cost, e.g. "Materials 62% · Labour 30%"
function costSplit(c) {
  if (!c?.sheet || !c.total) return "Not broken down";
  return Object.entries(c.byType)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([t, v]) => `${costTypeLabel(t)} ${Math.round((v / c.total) * 100)}%`)
    .join(" · ");
}

// Sales, minus what the sold pieces cost to make (split like the cost sheets), minus running expenses
function ProfitAndLoss({ periodLabel, revenue, cogs, gross, net, spent, costs, expenses }) {
  const byType = Object.fromEntries(COST_TYPES.map((t) => [t.value, 0]));
  let unsplit = 0, unsplitCount = 0;
  costs.forEach((c) => {
    Object.entries(c.byType).forEach(([t, v]) => { byType[t] = cents((byType[t] || 0) + v); });
    if (c.unsplit) { unsplit = cents(unsplit + c.unsplit); unsplitCount++; }
  });
  const byCategory = Object.entries(expenses.reduce((m, e) => {
    const k = e.category || "other";
    m[k] = cents((m[k] || 0) + num(e.amount));
    return m;
  }, {})).sort((a, b) => b[1] - a[1]);

  const pct = (v) => (revenue ? `${((v / revenue) * 100).toFixed(1)}%` : "");
  const Line = ({ label, value, sub, minus, strong, tone }) => (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? "font-semibold border-t border-black/10 mt-1 pt-2.5" : "pl-4"}`}>
      <span className={strong ? "text-obsidian" : "text-muted-foreground"}>
        {label}{sub && <span className="text-xs ml-2 opacity-80">{sub}</span>}
      </span>
      <span className="flex items-baseline gap-3 whitespace-nowrap">
        <span className={tone === "bad" ? "text-red-600" : tone === "good" ? "text-emerald-700" : ""}>{minus ? "− " : ""}{money(value)}</span>
        <span className="text-xs text-muted-foreground w-12 text-right">{pct(value)}</span>
      </span>
    </div>
  );

  return (
    <Panel className="p-5 mb-6">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-semibold text-obsidian">Profit & loss — {periodLabel?.toLowerCase()}</p>
        <p className="text-xs text-muted-foreground">% of sales</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-x-10 text-sm">
        <div>
          <div className="flex items-baseline justify-between gap-4 py-1.5 font-semibold">
            <span className="text-obsidian">Sales</span>
            <span className="flex items-baseline gap-3"><span>{money(revenue)}</span><span className="w-12" /></span>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mt-2 mb-0.5">Production cost of what sold</p>
          {COST_TYPES.filter((t) => byType[t.value] > 0).map((t) => (
            <Line key={t.value} label={t.label} value={byType[t.value]} minus />
          ))}
          {unsplit > 0 && <Line label="Not broken down" sub={`${unsplitCount} sale${unsplitCount === 1 ? "" : "s"} with a single cost figure`} value={unsplit} minus />}
          {cogs === 0 && <p className="pl-4 py-1.5 text-muted-foreground">No production costs recorded</p>}
          <Line strong label="Gross profit" value={gross} tone={gross < 0 ? "bad" : "good"} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mt-2 lg:mt-1.5 mb-0.5">Running expenses</p>
          {byCategory.length === 0 && <p className="pl-4 py-1.5 text-muted-foreground">No expenses recorded</p>}
          {byCategory.map(([cat, v]) => <Line key={cat} label={humanize(cat)} value={v} minus />)}
          <Line strong label="Total expenses" value={spent} />
          <Line strong label="Net profit" value={net} tone={net < 0 ? "bad" : "good"} />
        </div>
      </div>
    </Panel>
  );
}

// The cost lines a sale opens with: its own sheet, the linked item's sheet if it still matches
// (older sales), a single line for a cost recorded as one figure, or a blank sheet
function startingCosts(sale, items) {
  const sheet = sale ? saleCosts(sale, items).sheet : null;
  if (sheet) return { lines: editableLines(sheet.lines), batch: String(sheet.made) };
  if (num(sale?.unit_cost) > 0) {
    return { lines: editableLines([{ label: "Production cost", type: "other", quantity: 1, unit_cost: sale.unit_cost }]), batch: "1" };
  }
  return { lines: mainCostLines(), batch: "" };
}

function SaleModal({ sale, items, pastNames, customers, canCosts, onClose, onSaved }) {
  const isEdit = !!sale;
  const [start] = useState(() => startingCosts(sale, items));
  const [lines, setLines] = useState(start.lines);
  const [form, setForm] = useState({
    inventory_item_id: sale?.inventory_item_id || "",
    product_name: sale?.product_name || "",
    quantity: String(sale?.quantity ?? 1),
    unit_price: sale ? String(sale.unit_price ?? num(sale.amount) / (num(sale.quantity) || 1)) : "",
    cost_batch: start.batch, // pieces the cost lines pay for; blank = the pieces in this sale
    amount_paid: sale?.amount_paid != null ? String(sale.amount_paid) : "",
    payment_method: sale?.payment_method || "mpesa",
    date: sale?.date || (sale ? recordDate(sale) : today()),
    customer_id: sale?.customer_id || "",
    save_customer: false,
    customer_name: sale?.customer_name || "",
    customer_phone: sale?.customer_phone || "",
    notes: sale?.notes || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const item = items.find((i) => i.id === form.inventory_item_id);
  const qty = Math.max(Math.round(num(form.quantity)) || 1, 1);
  const total = cents(qty * num(form.unit_price));
  const paid = form.amount_paid === "" ? total : cents(form.amount_paid);
  const batch = form.cost_batch === "" ? qty : Math.max(Math.round(num(form.cost_batch)) || 1, 1);
  const hasCosts = validCostLines(lines).length > 0;
  const costs = itemCosts({ cost_lines: validCostLines(lines), quantity_made: batch });
  const cost = cents(qty * costs.unit);
  const profit = cents(total - cost);
  // Stock this sale can draw on: what's on hand, plus what this sale already took if editing the same item
  const available = item ? num(item.stock_qty) + (isEdit && sale.inventory_item_id === item.id ? num(sale.quantity) || 1 : 0) : null;

  const pickItem = (id) => {
    const it = items.find((i) => i.id === id);
    const sheet = it?.cost_lines?.length > 0;
    if (sheet) setLines(editableLines(it.cost_lines));
    setForm((f) => ({
      ...f,
      inventory_item_id: id,
      product_name: it ? it.name : f.product_name,
      cost_batch: sheet ? String(Math.max(num(it.quantity_made) || 1, 1)) : f.cost_batch,
      unit_price: it?.selling_price ? String(it.selling_price) : f.unit_price,
    }));
  };

  const pickCustomer = (id) => {
    const c = customers.find((x) => x.id === id);
    setForm((f) => ({ ...f, customer_id: id, customer_name: c ? c.name : "", customer_phone: c ? c.phone || "" : "" }));
  };

  const save = useMutation({
    mutationFn: async () => {
      let customerId = form.customer_id || undefined;
      if (!customerId && form.save_customer && form.customer_name.trim()) {
        const c = await base44.entities.Customer.create({ name: form.customer_name.trim(), phone: form.customer_phone.trim() || undefined });
        customerId = c.id;
      }
      const data = {
        customer_id: customerId,
        inventory_item_id: form.inventory_item_id || undefined,
        product_id: item?.product_id || undefined,
        product_name: form.product_name.trim(),
        quantity: qty,
        unit_price: cents(form.unit_price),
        // Without cost access the server fills these in from the inventory cost sheet.
        // The sale keeps its own copy of the lines, so later edits to the sheet don't change it.
        unit_cost: canCosts && hasCosts ? costs.unit : undefined,
        cost_lines: canCosts && hasCosts ? toCostLines(lines) : undefined,
        cost_batch: canCosts && hasCosts ? batch : undefined,
        amount: total,
        amount_paid: paid,
        status: paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid",
        payment_method: form.payment_method,
        date: form.date || today(),
        customer_name: form.customer_name.trim() || undefined,
        customer_phone: form.customer_phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (!isEdit) return base44.entities.Sale.create(data);
      const clear = ["inventory_item_id", "product_id", "customer_id", ...(canCosts ? ["unit_cost", "cost_lines", "cost_batch"] : []), "customer_name", "customer_phone", "notes"].filter((k) => data[k] === undefined);
      return base44.entities.Sale.update(sale.id, data, clear);
    },
    onSuccess: () => { toast.success(isEdit ? "Sale updated" : "Sale recorded"); onSaved(); },
    onError: (err) => toast.error("Save failed: " + (err.message || "Unknown error")),
  });

  const remove = useMutation({
    mutationFn: () => base44.entities.Sale.delete(sale.id),
    onSuccess: () => { toast.success("Sale deleted — stock returned"); onSaved(); },
    onError: (err) => toast.error("Delete failed: " + (err.message || "Unknown error")),
  });

  return (
    <Modal
      wide={canCosts}
      title={isEdit ? "Edit sale" : "Record sale"}
      onClose={onClose}
      footer={
        <>
          <div>
            {isEdit && (
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                onClick={() => { if (confirm("Delete this sale? Its quantity goes back into stock.")) remove.mutate(); }}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.product_name.trim() || !(num(form.unit_price) > 0)}
              className="bg-obsidian hover:bg-obsidian/90 text-white px-8">
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </>
      }
    >
      <Field label="Item from inventory" hint={canCosts ? "Picking an item fills in its production cost and takes it out of stock" : "Picking an item takes it out of stock"}>
        <NativeSelect value={form.inventory_item_id} onChange={pickItem}>
          <option value="">— Not from inventory —</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>{i.name} · {num(i.stock_qty)} in stock{canCosts && i.cost_lines ? ` · cost ${money(itemCosts(i).unit)}` : ""}</option>
          ))}
        </NativeSelect>
      </Field>

      {!form.inventory_item_id && (
        <Field label="Item sold *">
          <SuggestInput values={pastNames} value={form.product_name} onChange={(e) => set("product_name", e.target.value)} placeholder="What did you sell?" />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Quantity">
          <Input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
        </Field>
        <Field label="Price each (KSh) *">
          <Input type="number" step="0.01" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} placeholder="0.00" />
        </Field>
      </div>

      {available !== null && qty > available && (
        <p className="text-sm text-amber-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Only {available} in stock. Saving will mark this item as oversold.
        </p>
      )}

      {canCosts && (
        <>
          <div>
            <CostLinesEditor lines={lines} setLines={setLines} title="Production costs for this sale" />
            <p className="text-xs text-muted-foreground mt-1.5">
              {item?.cost_lines?.length
                ? "Filled in from the inventory cost sheet. Changes here only apply to this sale."
                : "List everything that went into making what you sold: materials, labour, transport, finishing..."}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-md bg-muted/40 p-4 space-y-1.5 text-sm">
              {hasCosts ? <CostTypeRows costs={costs} /> : <p className="text-muted-foreground">No costs entered yet</p>}
              <div className="flex justify-between font-semibold pt-1.5 border-t border-black/10">
                <span>Total for {batch} piece{batch === 1 ? "" : "s"}</span><span>{money(costs.total)}</span>
              </div>
              <div className="flex justify-between font-semibold text-obsidian">
                <span>Cost per piece</span><span>{money(costs.unit)}</span>
              </div>
            </div>
            <Field label="These costs cover (pieces)" hint="Leave blank if they're just for the pieces in this sale. From inventory, this is the batch size.">
              <Input type="number" min="1" value={form.cost_batch} onChange={(e) => set("cost_batch", e.target.value)} placeholder={String(qty)} />
            </Field>
          </div>
        </>
      )}

      <div className="rounded-md bg-muted/40 p-4 grid grid-cols-3 gap-3 text-sm">
        <div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{money(total)}</p></div>
        {canCosts && <>
        <div><p className="text-xs text-muted-foreground">Cost ({qty} × {money(costs.unit)})</p><p className="font-semibold">{money(cost)}</p></div>
        <div>
          <p className="text-xs text-muted-foreground">Profit</p>
          <p className={`font-semibold ${profit < 0 ? "text-red-600" : "text-emerald-700"}`}>
            {money(profit)}{total > 0 && <span className="text-xs font-normal opacity-70 ml-1">({((profit / total) * 100).toFixed(1)}%)</span>}
          </p>
        </div>
        </>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Amount paid (KSh)" hint="Leave blank if paid in full">
          <Input type="number" step="0.01" value={form.amount_paid} onChange={(e) => set("amount_paid", e.target.value)} placeholder={total.toFixed(2)} />
        </Field>
        <Field label="Payment method">
          <NativeSelect value={form.payment_method} onChange={(v) => set("payment_method", v)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m === "mpesa" ? "M-Pesa" : humanize(m)}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Date">
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
      </div>
      {paid < total && <p className="text-sm text-red-600">Balance due: {money(total - paid)}</p>}

      <Field label="Customer">
        <NativeSelect value={form.customer_id} onChange={pickCustomer}>
          <option value="">— Walk-in / new customer —</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
        </NativeSelect>
      </Field>
      {!form.customer_id && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Customer name">
              <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
            </Field>
            <Field label="Customer phone">
              <Input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} />
            </Field>
          </div>
          {form.customer_name.trim() && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={form.save_customer} onChange={(e) => set("save_customer", e.target.checked)} className="w-4 h-4 accent-obsidian" />
              Save to customer list
            </label>
          )}
        </>
      )}
      <Field label="Notes">
        <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Delivery, M-Pesa code, etc." />
      </Field>
    </Modal>
  );
}
