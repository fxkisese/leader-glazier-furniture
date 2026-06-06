import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, Layers, MessageSquare, Star, Image, Settings, Plus, Edit, Trash2, Eye, LayoutDashboard, Lock, Sparkles, Upload, ShoppingBag } from "lucide-react";
import AdminProductsTab from "../components/admin/AdminProductsTab";
import AdminGlassTab from "../components/admin/AdminGlassTab";
import AdminQuotesTab from "../components/admin/AdminQuotesTab";
import AdminCustomOrdersTab from "../components/admin/AdminCustomOrdersTab";
import AdminBatchTab from "../components/admin/AdminBatchTab";
import AdminOrdersTab from "../components/admin/AdminOrdersTab";
import AdminHomepageTab from "../components/admin/AdminHomepageTab";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "admin2020";

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
          <p className="text-muted-foreground text-sm mt-1">Authorised personnel only</p>
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
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "homepage", label: "Homepage", icon: Sparkles },
  { id: "products", label: "Furniture", icon: Package },
  { id: "payment-orders", label: "Orders", icon: ShoppingBag },
  { id: "batch", label: "Bulk Upload", icon: Upload },
  { id: "glass", label: "Glass Types", icon: Layers },
  { id: "quotes", label: "Quote Requests", icon: MessageSquare },
  { id: "custom-orders", label: "Custom Orders", icon: Star },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [unlocked, setUnlocked] = useState(false);

  if (user && user.role !== "admin") return <Navigate to="/" />;
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-playfair text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-primary-foreground/70 text-sm mt-1">Craftsman Galore — Owner Panel</p>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                <Eye className="w-4 h-4 mr-1" /> View Site
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Nav */}
        <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-2xl p-2 border border-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${tab === id ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "overview" && <AdminOverview />}
        {tab === "homepage" && <AdminHomepageTab />}
        {tab === "products" && <AdminProductsTab />}
        {tab === "payment-orders" && <AdminOrdersTab />}
        {tab === "batch" && <AdminBatchTab />}
        {tab === "glass" && <AdminGlassTab />}
        {tab === "quotes" && <AdminQuotesTab />}
        {tab === "custom-orders" && <AdminCustomOrdersTab />}
      </div>
    </div>
  );
}

function AdminOverview() {
  const { data: products = [] } = useQuery({ queryKey: ["products", "all-admin"], queryFn: () => base44.entities.Product.list() });
  const { data: glassTypes = [] } = useQuery({ queryKey: ["glass-types"], queryFn: () => base44.entities.GlassType.list() });
  const { data: quoteReqs = [] } = useQuery({ queryKey: ["quote-requests"], queryFn: () => base44.entities.QuoteRequest.list() });
  const { data: customOrders = [] } = useQuery({ queryKey: ["custom-orders"], queryFn: () => base44.entities.CustomOrderRequest.list() });

  const stats = [
    { label: "Total Products", value: products.length, icon: Package, color: "bg-primary/10 text-primary" },
    { label: "Glass Types", value: glassTypes.length, icon: Layers, color: "bg-blue-50 text-blue-600" },
    { label: "Quote Requests", value: quoteReqs.length, icon: MessageSquare, color: "bg-amber-50 text-amber-600" },
    { label: "Custom Orders", value: customOrders.length, icon: Star, color: "bg-green-50 text-green-600" },
  ];

  const newQuotes = quoteReqs.filter((q) => q.status === "new");
  const newOrders = customOrders.filter((o) => o.status === "new");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
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
                    <p className="text-muted-foreground text-xs">{q.width} × {q.height} {q.unit} — KSh {q.estimated_total?.toLocaleString()}</p>
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
                    <p className="text-muted-foreground text-xs">{o.product_type} — {o.phone}</p>
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

      <div className="bg-white rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link to="/catalogue"><Button variant="outline" className="border-primary text-primary gap-2"><Plus className="w-4 h-4" /> Add Product</Button></Link>
          <Link to="/glass"><Button variant="outline" className="border-primary text-primary gap-2"><Plus className="w-4 h-4" /> Add Glass Type</Button></Link>
          <Link to="/gallery"><Button variant="outline" className="border-primary text-primary gap-2"><Plus className="w-4 h-4" /> Add Gallery Project</Button></Link>
        </div>
      </div>
    </div>
  );
}