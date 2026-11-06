import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Wallet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, EmptyState, ErrorState, ListSkeleton, Pill, FilterChips, formatDate, humanize } from "./adminShared";
import { Field, NativeSelect, Modal, MiniStat, money, cents, num, today, PERIODS, EXPENSE_CATEGORIES, inPeriod, recordDate, SuggestInput, uniqueValues } from "./businessShared";
import { EXPENSES_KEY } from "./AdminSalesTab";

export default function AdminExpensesTab() {
  const [period, setPeriod] = useState("this-month");
  const [modal, setModal] = useState(null);
  const queryClient = useQueryClient();

  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: EXPENSES_KEY, queryFn: () => base44.entities.Expense.list() });

  const rows = useMemo(
    () => data.filter((e) => inPeriod(recordDate(e), period)).sort((a, b) => recordDate(b).localeCompare(recordDate(a))),
    [data, period],
  );
  const total = cents(rows.reduce((t, e) => t + num(e.amount), 0));
  const byCategory = Object.entries(
    rows.reduce((m, e) => ({ ...m, [e.category || "other"]: cents((m[e.category || "other"] || 0) + num(e.amount)) }), {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Running costs that aren't part of a single piece — rent, electricity, wages, tools. They come off your profit on the Sales screen."
        actions={
          <Button onClick={() => setModal("new")} className="bg-obsidian hover:bg-obsidian/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Add expense
          </Button>
        }
      />

      <div className="mb-4"><FilterChips options={PERIODS} value={period} onChange={setPeriod} /></div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MiniStat label="Total spent" value={money(total)} sub={`${rows.length} expense${rows.length === 1 ? "" : "s"}`} />
        {byCategory.slice(0, 3).map(([cat, amt]) => (
          <MiniStat key={cat} label={humanize(cat)} value={money(amt)} sub={total ? `${((amt / total) * 100).toFixed(1)}% of spending` : undefined} />
        ))}
      </div>

      <Panel>
        {isLoading ? <ListSkeleton /> : error ? <ErrorState error={error} onRetry={refetch} /> : rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No expenses in this period"
            action={<Button onClick={() => setModal("new")} className="bg-obsidian text-white gap-2"><Plus className="w-4 h-4" /> Add expense</Button>}
          />
        ) : (
          <ul className="divide-y divide-black/5">
            {rows.map((e) => (
              <li key={e.id}>
                <button onClick={() => setModal(e)} className="w-full flex items-center gap-4 px-4 py-3 text-left text-sm hover:bg-muted/30">
                  <span className="w-24 shrink-0 text-muted-foreground">{formatDate(recordDate(e))}</span>
                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-obsidian">{e.description}</span>
                    {e.notes && <span className="block text-xs text-muted-foreground truncate">{e.notes}</span>}
                  </span>
                  <Pill>{humanize(e.category || "other")}</Pill>
                  <span className="w-32 text-right font-medium">{money(e.amount)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {modal && (
        <ExpenseModal
          key={modal === "new" ? "new" : modal.id}
          expense={modal === "new" ? null : modal}
          past={data}
          onClose={() => setModal(null)}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: EXPENSES_KEY }); setModal(null); }}
        />
      )}
    </div>
  );
}

function ExpenseModal({ expense, past, onClose, onSaved }) {
  const isEdit = !!expense;
  const [form, setForm] = useState({
    description: expense?.description || "",
    amount: expense ? String(expense.amount) : "",
    category: expense?.category || "rent",
    date: expense ? recordDate(expense) : today(),
    notes: expense?.notes || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  // Picking an earlier expense also picks the category it was filed under
  const pickDescription = (description) => {
    const prev = past.find((e) => e.description?.trim().toLowerCase() === description.trim().toLowerCase());
    setForm((f) => ({ ...f, description, ...(prev?.category ? { category: prev.category } : {}) }));
  };

  const save = useMutation({
    mutationFn: () => {
      const data = {
        description: form.description.trim(),
        amount: cents(form.amount),
        category: form.category,
        date: form.date || today(),
        notes: form.notes.trim() || undefined,
      };
      return isEdit ? base44.entities.Expense.update(expense.id, data) : base44.entities.Expense.create(data);
    },
    onSuccess: () => { toast.success(isEdit ? "Expense updated" : "Expense added"); onSaved(); },
    onError: (err) => toast.error("Save failed: " + (err.message || "Unknown error")),
  });

  const remove = useMutation({
    mutationFn: () => base44.entities.Expense.delete(expense.id),
    onSuccess: () => { toast.success("Expense deleted"); onSaved(); },
    onError: (err) => toast.error("Delete failed: " + (err.message || "Unknown error")),
  });

  return (
    <Modal
      title={isEdit ? "Edit expense" : "Add expense"}
      onClose={onClose}
      footer={
        <>
          <div>
            {isEdit && (
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                onClick={() => { if (confirm("Delete this expense?")) remove.mutate(); }}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.description.trim() || !(num(form.amount) > 0)}
              className="bg-obsidian hover:bg-obsidian/90 text-white px-8">
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </>
      }
    >
      <Field label="Description *">
        <SuggestInput values={uniqueValues(past.map((e) => e.description))} value={form.description} onChange={(e) => pickDescription(e.target.value)} placeholder="Workshop rent — November" />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Amount (KSh) *">
          <Input type="number" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Category">
          <NativeSelect value={form.category} onChange={(v) => set("category", v)}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Date">
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Receipt number, supplier..." />
      </Field>
    </Modal>
  );
}
