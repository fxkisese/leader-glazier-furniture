import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Receipt } from "lucide-react";
import { toast } from "sonner";

const BRANCHES = [
  { id: "kyumbi", label: "Kyumbi — Machakos Junction" },
  { id: "whitehouse", label: "Whitehouse — Tena, Nairobi" },
];

const CATEGORIES = [
  { id: "rent", label: "Rent", color: "bg-blue-50 text-blue-700" },
  { id: "stock", label: "Stock / Supplies", color: "bg-purple-50 text-purple-700" },
  { id: "transport", label: "Transport / Delivery", color: "bg-orange-50 text-orange-700" },
  { id: "utilities", label: "Utilities", color: "bg-cyan-50 text-cyan-700" },
  { id: "wages", label: "Wages", color: "bg-indigo-50 text-indigo-700" },
  { id: "other", label: "Other", color: "bg-gray-100 text-gray-700" },
];

const catColor = (cat) => CATEGORIES.find((c) => c.id === cat)?.color || "bg-gray-100 text-gray-600";
const catLabel = (cat) => CATEGORIES.find((c) => c.id === cat)?.label || cat;

function AddExpenseModal({ branch, onClose, onSaved }) {
  const [form, setForm] = useState({
    branch: branch || "kyumbi",
    category: "stock",
    amount: "",
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => base44.entities.Expense.create({
      ...form,
      amount: parseFloat(form.amount),
    }),
    onSuccess: () => { toast.success("Expense logged!"); onSaved(); },
    onError: () => toast.error("Failed to log expense."),
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-playfair font-bold text-xl">Log Expense</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Branch *</label>
            <Select value={form.branch} onValueChange={(v) => set("branch", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Category *</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => set("category", c.id)}
                  className={`py-2 px-3 rounded-xl border-2 text-xs font-medium transition-all ${
                    form.category === c.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Amount (KSh) *</label>
            <Input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="5000" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="e.g. Monthly rent payment, fabric for sofas..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Date</label>
            <Input type="date" value={form.expense_date} onChange={(e) => set("expense_date", e.target.value)} />
          </div>
        </div>
        <div className="p-6 border-t border-border flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.amount}
            className="bg-primary hover:bg-primary/90 text-white px-8"
          >
            {mutation.isPending ? "Saving..." : "Log Expense"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminExpensesTab({ branchFilter }) {
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();

  const { data: allExpenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-created_at", 200),
  });

  const expenses = branchFilter === "all"
    ? allExpenses
    : allExpenses.filter((e) => e.branch === branchFilter);

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Totals by category
  const byCat = CATEGORIES.map((c) => ({
    ...c,
    total: expenses.filter((e) => e.category === c.id).reduce((sum, e) => sum + (e.amount || 0), 0),
  })).filter((c) => c.total > 0);

  return (
    <div className="space-y-5">
      {/* Total */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground">Total Expenses</p>
          <p className="text-xl font-bold text-foreground mt-1">KSh {total.toLocaleString()}</p>
        </div>
        {byCat.slice(0, 3).map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-lg font-bold text-foreground mt-1">KSh {c.total.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-foreground">Expenses ({expenses.length})</h2>
        <Button onClick={() => setShowAdd(true)} className="bg-primary text-white gap-2">
          <Plus className="w-4 h-4" /> Log Expense
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-white rounded-xl animate-pulse border border-border" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Branch</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Description</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 text-muted-foreground whitespace-nowrap">{e.expense_date || e.created_at?.split("T")[0]}</td>
                    <td className="p-4">
                      <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-lg">
                        {e.branch === "kyumbi" ? "Kyumbi" : "Whitehouse"}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge className={catColor(e.category)} variant="secondary">{catLabel(e.category)}</Badge>
                    </td>
                    <td className="p-4 text-muted-foreground max-w-[200px] truncate">{e.description || "—"}</td>
                    <td className="p-4 font-semibold text-foreground">KSh {e.amount?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Receipt className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No expenses logged yet</p>
                <p className="text-xs mt-1">Start tracking your costs branch by branch</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showAdd && (
        <AddExpenseModal
          branch={branchFilter !== "all" ? branchFilter : undefined}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); queryClient.invalidateQueries({ queryKey: ["expenses"] }); }}
        />
      )}
    </div>
  );
}
