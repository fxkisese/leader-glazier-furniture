import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, TrendingUp, Banknote, Smartphone, CreditCard } from "lucide-react";
import { toast } from "sonner";

const BRANCHES = [
  { id: "kyumbi", label: "Kyumbi — Machakos Junction" },
  { id: "whitehouse", label: "Whitehouse — Tena, Nairobi" },
];

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: Banknote, color: "bg-green-100 text-green-700" },
  { id: "mpesa", label: "MPesa", icon: Smartphone, color: "bg-emerald-100 text-emerald-700" },
  { id: "credit", label: "Credit", icon: CreditCard, color: "bg-amber-100 text-amber-700" },
];

function AddSaleModal({ branch, onClose, onSaved }) {
  const [form, setForm] = useState({
    branch: branch || "kyumbi",
    customer_name: "",
    amount: "",
    payment_method: "cash",
    items: "",
    notes: "",
    sale_date: new Date().toISOString().split("T")[0],
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => base44.entities.Sale.create({
      ...form,
      amount: parseFloat(form.amount),
    }),
    onSuccess: () => { toast.success("Sale logged!"); onSaved(); },
    onError: () => toast.error("Failed to log sale. Check your connection."),
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-playfair font-bold text-xl">Log New Sale</h2>
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
            <label className="text-sm font-medium mb-1 block">Amount (KSh) *</label>
            <Input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="25000" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Payment Method *</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => set("payment_method", m.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.payment_method === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Customer Name (optional)</label>
            <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="e.g. John Kamau" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Items Sold</label>
            <Input value={form.items} onChange={(e) => set("items", e.target.value)} placeholder="e.g. 3-seater sofa, mirror glass 4x3ft" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Date</label>
            <Input type="date" value={form.sale_date} onChange={(e) => set("sale_date", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Any extra details..." />
          </div>
        </div>
        <div className="p-6 border-t border-border flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.amount}
            className="bg-primary hover:bg-primary/90 text-white px-8"
          >
            {mutation.isPending ? "Saving..." : "Log Sale"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSalesTab({ branchFilter }) {
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();

  const { data: allSales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-created_at", 200),
  });

  const sales = branchFilter === "all"
    ? allSales
    : allSales.filter((s) => s.branch === branchFilter);

  const totalRevenue = sales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const byCash = sales.filter((s) => s.payment_method === "cash").reduce((sum, s) => sum + (s.amount || 0), 0);
  const byMpesa = sales.filter((s) => s.payment_method === "mpesa").reduce((sum, s) => sum + (s.amount || 0), 0);
  const byCredit = sales.filter((s) => s.payment_method === "credit").reduce((sum, s) => sum + (s.amount || 0), 0);

  const paymentColor = { cash: "bg-green-100 text-green-700", mpesa: "bg-emerald-100 text-emerald-700", credit: "bg-amber-100 text-amber-700" };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `KSh ${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "bg-primary/10 text-primary" },
          { label: "Cash", value: `KSh ${byCash.toLocaleString()}`, icon: Banknote, color: "bg-green-50 text-green-600" },
          { label: "MPesa", value: `KSh ${byMpesa.toLocaleString()}`, icon: Smartphone, color: "bg-emerald-50 text-emerald-600" },
          { label: "Credit", value: `KSh ${byCredit.toLocaleString()}`, icon: CreditCard, color: "bg-amber-50 text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-bold text-foreground text-sm">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-foreground">Sales ({sales.length})</h2>
        <Button onClick={() => setShowAdd(true)} className="bg-primary text-white gap-2">
          <Plus className="w-4 h-4" /> Log Sale
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse border border-border" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Branch</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Items</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 text-muted-foreground whitespace-nowrap">{s.sale_date || s.created_at?.split("T")[0]}</td>
                    <td className="p-4 capitalize">
                      <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-lg">
                        {s.branch === "kyumbi" ? "Kyumbi" : "Whitehouse"}
                      </span>
                    </td>
                    <td className="p-4 text-foreground">{s.customer_name || <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-4 text-muted-foreground max-w-[200px] truncate">{s.items || "—"}</td>
                    <td className="p-4 font-semibold text-foreground">KSh {s.amount?.toLocaleString()}</td>
                    <td className="p-4">
                      <Badge className={paymentColor[s.payment_method] || "bg-gray-100 text-gray-600"} variant="secondary">
                        {s.payment_method}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sales.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No sales logged yet</p>
                <p className="text-xs mt-1">Click "Log Sale" to record your first sale</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showAdd && (
        <AddSaleModal
          branch={branchFilter !== "all" ? branchFilter : undefined}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); queryClient.invalidateQueries({ queryKey: ["sales"] }); }}
        />
      )}
    </div>
  );
}
