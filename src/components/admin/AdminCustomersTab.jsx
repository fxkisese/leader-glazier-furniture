import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Users, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, EmptyState, ErrorState, ListSkeleton, Pill, formatDate } from "./adminShared";
import { Field, Modal, MiniStat, money, cents, num, recordDate, SuggestInput, uniqueValues } from "./businessShared";
import { SALES_KEY } from "./AdminSalesTab";

export const CUSTOMERS_KEY = ["customers"];

const digits = (p = "") => p.replace(/\D/g, "").slice(-9); // match 07.., +2547.., 7.. as the same number

/** Sales belonging to a customer: linked by id, or (for older sales) by the same phone number. */
export const salesFor = (customer, sales) =>
  sales.filter((s) => s.customer_id === customer.id || (!s.customer_id && customer.phone && digits(s.customer_phone) === digits(customer.phone)));

export default function AdminCustomersTab() {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const customers = useQuery({ queryKey: CUSTOMERS_KEY, queryFn: () => base44.entities.Customer.list() });
  const sales = useQuery({ queryKey: SALES_KEY, queryFn: () => base44.entities.Sale.list() });

  const rows = useMemo(() => (customers.data || [])
    .map((c) => {
      const mine = salesFor(c, sales.data || []);
      return {
        ...c,
        bought: cents(mine.reduce((t, s) => t + num(s.amount), 0)),
        owed: cents(mine.reduce((t, s) => t + Math.max(num(s.amount) - num(s.amount_paid), 0), 0)),
        count: mine.length,
        last: mine.map(recordDate).sort().pop(),
      };
    })
    .filter((c) => !search || `${c.name} ${c.phone} ${c.location}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.bought - a.bought), [customers.data, sales.data, search]);

  const owedTotal = cents(rows.reduce((t, c) => t + c.owed, 0));
  const error = customers.error || sales.error;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Everyone who buys from you, what they've bought, and what they still owe."
        actions={<Button onClick={() => setModal("new")} className="bg-obsidian hover:bg-obsidian/90 text-white gap-2"><Plus className="w-4 h-4" /> Add customer</Button>}
      />
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <MiniStat label="Customers" value={(customers.data || []).length} />
        <MiniStat label="Owed to you" value={money(owedTotal)} tone={owedTotal > 0 ? "bad" : undefined} sub={`${rows.filter((c) => c.owed > 0).length} customers with a balance`} />
        <MiniStat label="Repeat customers" value={rows.filter((c) => c.count > 1).length} sub="Bought more than once" />
      </div>

      <Panel>
        <div className="p-4 border-b border-black/10">
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, location" className="pl-9 bg-white" />
          </div>
        </div>
        {customers.isLoading ? <ListSkeleton /> : error ? (
          <ErrorState error={error} onRetry={() => { customers.refetch(); sales.refetch(); }} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title={search ? "No matching customers" : "No customers yet"} description="Add customers here, or pick them when recording a sale." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground bg-muted/40">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Customer</th>
                  <th className="text-left font-medium px-4 py-2.5">Location</th>
                  <th className="text-right font-medium px-4 py-2.5">Purchases</th>
                  <th className="text-right font-medium px-4 py-2.5">Total bought</th>
                  <th className="text-right font-medium px-4 py-2.5">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rows.map((c) => (
                  <tr key={c.id} onClick={() => setModal(c)} className="cursor-pointer hover:bg-muted/30">
                    <td className="px-4 py-3"><p className="font-medium text-obsidian">{c.name}</p><p className="text-xs text-muted-foreground">{c.phone}</p></td>
                    <td className="px-4 py-3 text-muted-foreground">{c.location || "—"}</td>
                    <td className="px-4 py-3 text-right">{c.count}{c.last && <p className="text-xs text-muted-foreground">last {formatDate(c.last)}</p>}</td>
                    <td className="px-4 py-3 text-right font-medium">{money(c.bought)}</td>
                    <td className="px-4 py-3 text-right">{c.owed > 0 ? <Pill tone="red">{money(c.owed)} due</Pill> : <span className="text-muted-foreground">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {modal && (
        <CustomerModal
          key={modal === "new" ? "new" : modal.id}
          customer={modal === "new" ? null : modal}
          locations={uniqueValues((customers.data || []).map((c) => c.location))}
          sales={modal === "new" ? [] : salesFor(modal, sales.data || [])}
          onClose={() => setModal(null)}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY }); setModal(null); }}
        />
      )}
    </div>
  );
}

export function CustomerModal({ customer, sales = [], locations = [], onClose, onSaved }) {
  const isEdit = !!customer;
  const [form, setForm] = useState({
    name: customer?.name || "", phone: customer?.phone || "", email: customer?.email || "",
    location: customer?.location || "", notes: customer?.notes || "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: () => {
      const data = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]));
      if (!isEdit) return base44.entities.Customer.create(data);
      return base44.entities.Customer.update(customer.id, data, Object.keys(data).filter((k) => !data[k]));
    },
    onSuccess: (saved) => { toast.success(isEdit ? "Customer updated" : "Customer added"); onSaved(saved); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  const remove = useMutation({
    mutationFn: () => base44.entities.Customer.delete(customer.id),
    onSuccess: () => { toast.success("Customer deleted"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Modal
      title={isEdit ? customer.name : "Add customer"}
      onClose={onClose}
      footer={
        <>
          <div>{isEdit && <Button variant="outline" className="text-destructive border-destructive/40" onClick={() => { if (confirm("Delete this customer? Their sales are kept.")) remove.mutate(); }}>Delete</Button>}</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name *"><Input value={form.name} onChange={set("name")} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={set("phone")} placeholder="07..." /></Field>
        <Field label="Email"><Input value={form.email} onChange={set("email")} /></Field>
        <Field label="Location"><SuggestInput values={locations} value={form.location} onChange={set("location")} placeholder="Donholm, Nairobi" /></Field>
      </div>
      <Field label="Notes"><Input value={form.notes} onChange={set("notes")} placeholder="Preferences, referral, delivery directions..." /></Field>

      {isEdit && (
        <div>
          <p className="text-sm font-medium mb-2">Purchase history</p>
          {sales.length === 0 ? <p className="text-sm text-muted-foreground">No sales yet.</p> : (
            <ul className="border border-black/10 rounded-md divide-y divide-black/5 text-sm">
              {sales.map((s) => {
                const due = cents(num(s.amount) - num(s.amount_paid));
                return (
                  <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="w-24 text-muted-foreground">{formatDate(recordDate(s))}</span>
                    <span className="flex-1">{num(s.quantity) || 1} × {s.product_name}</span>
                    <span className="font-medium">{money(s.amount)}</span>
                    {due > 0 && <Pill tone="red">{money(due)} due</Pill>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
