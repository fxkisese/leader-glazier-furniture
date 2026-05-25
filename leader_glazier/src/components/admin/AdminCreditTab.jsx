import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, CreditCard, Phone, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

const BRANCHES = [
  { id: "kyumbi", label: "Kyumbi — Machakos Junction" },
  { id: "whitehouse", label: "Whitehouse — Tena, Nairobi" },
];

function AddCreditModal({ branch, editCustomer, onClose, onSaved }) {
  const isEdit = !!editCustomer;
  const [form, setForm] = useState({
    name: editCustomer?.name || "",
    phone: editCustomer?.phone || "",
    branch: editCustomer?.branch || branch || "kyumbi",
    total_amount: editCustomer?.total_amount || "",
    amount_paid: editCustomer?.amount_paid || "",
    due_date: editCustomer?.due_date || "",
    status: editCustomer?.status || "pending",
    notes: editCustomer?.notes || "",
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        ...form,
        total_amount: parseFloat(form.total_amount) || 0,
        amount_paid: parseFloat(form.amount_paid) || 0,
      };
      return isEdit
        ? base44.entities.CreditCustomer.update(editCustomer.id, data)
        : base44.entities.CreditCustomer.create(data);
    },
    onSuccess: () => { toast.success(isEdit ? "Record updated!" : "Credit customer added!"); onSaved(); },
    onError: () => toast.error("Failed to save. Check connection."),
  });

  const balance = (parseFloat(form.total_amount) || 0) - (parseFloat(form.amount_paid) || 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-playfair font-bold text-xl">{isEdit ? "Update Credit Record" : "Add Credit Customer"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Customer Name *</label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0712 345 678" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Branch *</label>
            <Select value={form.branch} onValueChange={(v) => set("branch", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Total Owed (KSh) *</label>
              <Input type="number" value={form.total_amount} onChange={(e) => set("total_amount", e.target.value)} placeholder="50000" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Amount Paid (KSh)</label>
              <Input type="number" value={form.amount_paid} onChange={(e) => set("amount_paid", e.target.value)} placeholder="20000" />
            </div>
          </div>
          {(form.total_amount || form.amount_paid) && (
            <div className={`p-3 rounded-xl text-sm font-semibold ${balance > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              Balance remaining: KSh {balance.toLocaleString()}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Due Date</label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="What items were bought on credit..." />
          </div>
        </div>
        <div className="p-6 border-t border-border flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || !form.total_amount}
            className="bg-primary hover:bg-primary/90 text-white px-8"
          >
            {mutation.isPending ? "Saving..." : isEdit ? "Update" : "Add Customer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-red-50 text-red-700", icon: AlertCircle },
  partial: { label: "Partial", color: "bg-amber-50 text-amber-700", icon: Clock },
  cleared: { label: "Cleared", color: "bg-green-50 text-green-700", icon: CheckCircle2 },
};

export default function AdminCreditTab({ branchFilter }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const queryClient = useQueryClient();

  const { data: allCustomers = [], isLoading } = useQuery({
    queryKey: ["credit-customers"],
    queryFn: () => base44.entities.CreditCustomer.list("-created_at", 200),
  });

  const customers = branchFilter === "all"
    ? allCustomers
    : allCustomers.filter((c) => c.branch === branchFilter);

  const totalOwed = customers.reduce((sum, c) => sum + ((c.total_amount || 0) - (c.amount_paid || 0)), 0);
  const cleared = customers.filter((c) => c.status === "cleared").length;
  const pending = customers.filter((c) => c.status !== "cleared").length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Outstanding</p>
          <p className="text-xl font-bold text-red-600 mt-1">KSh {totalOwed.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Active Debtors</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{pending}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Cleared</p>
          <p className="text-xl font-bold text-green-600 mt-1">{cleared}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-foreground">Credit Customers ({customers.length})</h2>
        <Button onClick={() => { setEditCustomer(null); setShowAdd(true); }} className="bg-primary text-white gap-2">
          <Plus className="w-4 h-4" /> Add Customer
        </Button>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-border" />)}</div>
      ) : (
        <div className="space-y-3">
          {customers.map((c) => {
            const balance = (c.total_amount || 0) - (c.amount_paid || 0);
            const pct = c.total_amount > 0 ? Math.min(100, ((c.amount_paid || 0) / c.total_amount) * 100) : 0;
            const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-border p-5 hover:border-primary/20 transition-colors cursor-pointer"
                onClick={() => { setEditCustomer(c); setShowAdd(true); }}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg capitalize">
                        {c.branch === "kyumbi" ? "Kyumbi" : "Whitehouse"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={cfg.color} variant="secondary">{cfg.label}</Badge>
                    {c.due_date && (
                      <p className="text-xs text-muted-foreground mt-1">Due: {c.due_date}</p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Paid: KSh {(c.amount_paid || 0).toLocaleString()}</span>
                    <span className="font-semibold text-red-600">Owed: KSh {balance.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Total: KSh {(c.total_amount || 0).toLocaleString()} • {pct.toFixed(0)}% paid</p>
                </div>

                {c.notes && <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">{c.notes}</p>}
              </div>
            );
          })}
          {customers.length === 0 && (
            <div className="text-center py-16 text-muted-foreground bg-white rounded-2xl border border-border">
              <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No credit customers</p>
              <p className="text-xs mt-1">Add customers who bought on credit</p>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <AddCreditModal
          branch={branchFilter !== "all" ? branchFilter : undefined}
          editCustomer={editCustomer}
          onClose={() => { setShowAdd(false); setEditCustomer(null); }}
          onSaved={() => { setShowAdd(false); setEditCustomer(null); queryClient.invalidateQueries({ queryKey: ["credit-customers"] }); }}
        />
      )}
    </div>
  );
}
