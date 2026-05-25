import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package, Layers, MessageSquare, Star, Image, Plus, Eye,
  LayoutDashboard, Lock, TrendingUp, CreditCard, Receipt, MapPin, Settings
} from "lucide-react";
import AdminProductsTab from "../components/admin/AdminProductsTab";
import AdminGlassTab from "../components/admin/AdminGlassTab";
import AdminQuotesTab from "../components/admin/AdminQuotesTab";
import AdminCustomOrdersTab from "../components/admin/AdminCustomOrdersTab";
import AdminSalesTab from "../components/admin/AdminSalesTab";
import AdminCreditTab from "../components/admin/AdminCreditTab";
import AdminExpensesTab from "../components/admin/AdminExpensesTab";
import AdminAccessoriesTab from "../components/admin/AdminAccessoriesTab";
import AdminSettingsTab from "../components/admin/AdminSettingsTab";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "leader2024";

const BRANCHES = [
  { id: "all", label: "All Branches" },
  { id: "kyumbi", label: "Kyumbi — Machakos Junction" },
  { id: "whitehouse", label: "Whitehouse — Tena, Nairobi" },
];

function PasswordGate({ onUnlock }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) {
      onUnlock();
    } else {
      setError(true);
      setPwd("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f5ff] via-white to-[#f0ebff] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-border shadow-xl p-8 w-full max-w-sm text-center space-y-6">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h2 className="font-playfair text-2xl font-bold text-foreground">Admin Access</h2>
          <p className="text-muted-foreground text-sm mt-1">Leader Glazier & Furniture</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            placeholder="Enter admin password"
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setError(false); }}
            className={error ? "border-destructive focus-visible:ring-destructive" : ""}
            autoFocus
          />
          {error && <p className="text-destructive text-xs">Incorrect password. Try again.</p>}
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 rounded-xl">
            Unlock Dashboard
          </Button>
        </form>
      </div>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "website" },
  { id: "products", label: "Furniture", icon: Package, group: "website" },
  { id: "glass", label: "Glass Types", icon: Layers, group: "website" },
  { id: "accessories", label: "Accessories", icon: Star, group: "website" },
  { id: "quotes", label: "Quote Requests", icon: MessageSquare, group: "website" },
  { id: "orders", label: "Custom Orders", icon: Image, group: "website" },
  { id: "sales", label: "Sales", icon: TrendingUp, group: "business" },
  { id: "credit", label: "Credit", icon: CreditCard, group: "business" },
  { id: "expenses", label: "Expenses", icon: Receipt, group: "business" },
  { id: "settings", label: "Settings", icon: Settings, group: "business" },
];

const BUSINESS_TABS = ["sales", "credit", "expenses"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [unlocked, setUnlocked] = useState(false);
  const [branchFilter, setBranchFilter] = useState("all");

  if (user && user.role !== "admin") return <Navigate to="/" />;
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  const showBranchFilter = BUSINESS_TABS.includes(tab);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-playfair text-xl font-bold">Admin Dashboard</h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">Leader Glazier and Furniture</p>
            </div>
            <div className="flex items-center gap-3">
              {showBranchFilter && (
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="w-52 bg-white/10 border-white/20 text-white text-sm h-9">
                    <MapPin className="w-3.5 h-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map((b) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Link to="/">
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                  <Eye className="w-4 h-4 mr-1" /> View Site
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Nav */}
        <div className="mb-6 bg-white rounded-2xl p-2 border border-border">
          <div className="flex flex-wrap gap-1 mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 self-center">Website</span>
            {TABS.filter((t) => t.group === "website").map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${tab === id ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 self-center">Business</span>
            {TABS.filter((t) => t.group === "business").map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${tab === id ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "overview" && <AdminOverview />}
        {tab === "products" && <AdminProductsTab />}
        {tab === "glass" && <AdminGlassTab />}
        {tab === "accessories" && <AdminAccessoriesTab />}
        {tab === "quotes" && <AdminQuotesTab />}
        {tab === "orders" && <AdminCustomOrdersTab />}
        {tab === "sales" && <AdminSalesTab branchFilter={branchFilter} />}
        {tab === "credit" && <AdminCreditTab branchFilter={branchFilter} />}
        {tab === "expenses" && <AdminExpensesTab branchFilter={branchFilter} />}
        {tab === "settings" && <AdminSettingsTab />}
      </div>
    </div>
  );
}

function AdminOverview() {
  const { data: products = [] } = useQuery({ queryKey: ["products", "all-admin"], queryFn: () => base44.entities.Product.list() });
  const { data: glassTypes = [] } = useQuery({ queryKey: ["glass-types"], queryFn: () => base44.entities.GlassType.list() });
  const { data: quoteReqs = [] } = useQuery({ queryKey: ["quote-requests"], queryFn: () => base44.entities.QuoteRequest.list() });
  const { data: customOrders = [] } = useQuery({ queryKey: ["custom-orders"], queryFn: () => base44.entities.CustomOrderRequest.list() });
  const { data: sales = [] } = useQuery({ queryKey: ["sales"], queryFn: () => base44.entities.Sale.list("-created_at", 200) });
  const { data: creditCustomers = [] } = useQuery({ queryKey: ["credit-customers"], queryFn: () => base44.entities.CreditCustomer.list() });

  const totalRevenue = sales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalCredit = creditCustomers.reduce((sum, c) => sum + Math.max(0, (c.total_amount || 0) - (c.amount_paid || 0)), 0);
  const newQuotes = quoteReqs.filter((q) => q.status === "new");
  const newOrders = customOrders.filter((o) => o.status === "new");

  const topStats = [
    { label: "Total Products", value: products.length, icon: Package, color: "bg-primary/10 text-primary" },
    { label: "Total Revenue", value: `KSh ${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "bg-green-50 text-green-600" },
    { label: "Credit Outstanding", value: `KSh ${totalCredit.toLocaleString()}`, icon: CreditCard, color: "bg-amber-50 text-amber-600" },
    { label: "Pending Quotes", value: newQuotes.length, icon: MessageSquare, color: "bg-blue-50 text-blue-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topStats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Branch breakdown */}
      <div className="grid lg:grid-cols-2 gap-4">
        {["kyumbi", "whitehouse"].map((b) => {
          const bSales = sales.filter((s) => s.branch === b);
          const bRevenue = bSales.reduce((sum, s) => sum + (s.amount || 0), 0);
          const label = b === "kyumbi" ? "Kyumbi — Machakos Junction" : "Whitehouse — Tena, Nairobi";
          return (
            <div key={b} className="bg-white rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">{label}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="font-bold text-foreground">KSh {bRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="font-bold text-foreground">{bSales.length}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> New Quote Requests
            {newQuotes.length > 0 && <Badge className="bg-primary text-white text-xs">{newQuotes.length}</Badge>}
          </h3>
          {newQuotes.length > 0 ? (
            <div className="space-y-3">
              {newQuotes.slice(0, 5).map((q) => (
                <div key={q.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl text-sm">
                  <div>
                    <p className="font-medium">{q.glass_type_name}</p>
                    <p className="text-muted-foreground text-xs">{q.customer_name} • KSh {q.estimated_total?.toLocaleString()}</p>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-200">New</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-6">No new quote requests</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" /> New Custom Orders
            {newOrders.length > 0 && <Badge className="bg-primary text-white text-xs">{newOrders.length}</Badge>}
          </h3>
          {newOrders.length > 0 ? (
            <div className="space-y-3">
              {newOrders.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl text-sm">
                  <div>
                    <p className="font-medium">{o.customer_name}</p>
                    <p className="text-muted-foreground text-xs">{o.product_type} • {o.phone}</p>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-200">New</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-6">No new custom orders</p>
          )}
        </div>
      </div>
    </div>
  );
}
