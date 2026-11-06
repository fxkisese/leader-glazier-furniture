import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44, staffApi } from "@/api/base44Client";
import { FEATURES } from "@/lib/features";
import { StaffProvider, useStaff } from "@/lib/staffSession";
import { ROLES } from "../../convex/permissions";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package, Layers, MessageSquare, Star, LayoutDashboard, Lock, Sparkles, Upload, ShoppingBag,
  ExternalLink, LogOut, Menu, X, ArrowRight, Plus, AlertCircle, TrendingUp, Boxes, Wallet,
  Gauge, Users, Truck, Hammer, IdCard, ShieldCheck, Loader2, KeyRound, Megaphone,
} from "lucide-react";
import AdminSalesTab from "../components/admin/AdminSalesTab";
import AdminInventoryTab from "../components/admin/AdminInventoryTab";
import AdminExpensesTab from "../components/admin/AdminExpensesTab";
import AdminCeoDashboard from "../components/admin/AdminCeoDashboard";
import AdminCustomersTab from "../components/admin/AdminCustomersTab";
import AdminSuppliersTab from "../components/admin/AdminSuppliersTab";
import AdminProductionTab from "../components/admin/AdminProductionTab";
import AdminHrTab from "../components/admin/AdminHrTab";
import AdminTeamTab, { PasswordModal } from "../components/admin/AdminTeamTab";
import AdminProductsTab from "../components/admin/AdminProductsTab";
import AdminGlassTab from "../components/admin/AdminGlassTab";
import AdminQuotesTab from "../components/admin/AdminQuotesTab";
import AdminCustomOrdersTab from "../components/admin/AdminCustomOrdersTab";
import AdminBatchTab from "../components/admin/AdminBatchTab";
import AdminOrdersTab from "../components/admin/AdminOrdersTab";
import AdminHomepageTab from "../components/admin/AdminHomepageTab";
import AdminMarketingTab from "../components/admin/AdminMarketingTab";
import { PageHeader, Panel, ErrorState, Pill, formatKsh, formatDate } from "../components/admin/adminShared";

// Staff sign-in. On a brand-new install (no accounts yet) it offers to create the owner/CEO account.
function StaffLogin({ onSignedIn }) {
  const setup = useQuery({ queryKey: ["staff-has-accounts"], queryFn: staffApi.hasAccounts });
  const firstRun = setup.data === false;
  const [form, setForm] = useState({ name: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(""); };

  const submit = async (e) => {
    e.preventDefault();
    if (firstRun && form.password !== form.confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      if (firstRun) await staffApi.setupOwner(form.name, form.username, form.password);
      else await staffApi.login(form.username, form.password);
      onSignedIn();
    } catch (err) {
      setError(err.message);
      setForm((f) => ({ ...f, password: "", confirm: "" }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8F3] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-heading text-3xl text-obsidian">Craftsman Galore</p>
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold font-semibold mt-1">Business Suite</p>
        </div>
        <div className="bg-white border border-black/10 rounded-lg shadow-sm p-7 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-obsidian rounded-md flex items-center justify-center">
              {firstRun ? <ShieldCheck className="w-5 h-5 text-gold" /> : <Lock className="w-5 h-5 text-gold" />}
            </div>
            <div>
              <h2 className="font-semibold text-obsidian">{firstRun ? "Create the owner account" : "Staff sign in"}</h2>
              <p className="text-muted-foreground text-xs">{firstRun ? "This account is the CEO and can add everyone else" : "Use the login your manager gave you"}</p>
            </div>
          </div>
          {setup.isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : setup.error ? (
            <p className="text-sm text-red-600">Can't reach the server: {setup.error.message}</p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              {firstRun && <Input placeholder="Your full name" value={form.name} onChange={set("name")} required autoFocus />}
              <Input placeholder="Username" autoComplete="username" value={form.username} onChange={set("username")} required autoFocus={!firstRun} />
              <Input type="password" placeholder={firstRun ? "Password (8+ characters)" : "Password"} autoComplete={firstRun ? "new-password" : "current-password"}
                value={form.password} onChange={set("password")} required minLength={firstRun ? 8 : undefined} />
              {firstRun && <Input type="password" placeholder="Confirm password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} required />}
              {error && <p className="text-red-600 text-xs">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full bg-obsidian hover:bg-obsidian/90 text-white">
                {busy ? "Please wait..." : firstRun ? "Create account & sign in" : "Sign in"}
              </Button>
            </form>
          )}
        </div>
        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-obsidian mt-6">
          ← Back to website
        </Link>
      </div>
    </div>
  );
}

// Each item names the permission module that unlocks it (see convex/permissions.ts)
const NAV = [
  {
    group: null,
    items: [
      { id: "dashboard", label: "CEO Dashboard", icon: Gauge, module: "dashboard" },
      { id: "overview", label: "Website Overview", icon: LayoutDashboard, module: "website" },
    ],
  },
  {
    group: "Sales",
    items: [
      { id: "sales", label: "Sales & Profit", icon: TrendingUp, module: "sales" },
      { id: "customers", label: "Customers", icon: Users, module: "customers" },
      { id: "orders", label: "Website Orders", icon: ShoppingBag, badge: "orders", module: "website" },
      { id: "custom-orders", label: "Custom Requests", icon: Star, badge: "custom", module: "website" },
      ...(FEATURES.glassQuote ? [{ id: "quotes", label: "Glass Quotes", icon: MessageSquare, badge: "quotes", module: "website" }] : []),
    ],
  },
  {
    group: "Marketing",
    items: [
      { id: "marketing", label: "Marketing", icon: Megaphone, module: "marketing" },
    ],
  },
  {
    group: "Operations",
    items: [
      { id: "production", label: "Production", icon: Hammer, module: "production" },
      { id: "inventory", label: "Inventory & Costs", icon: Boxes, module: "inventory" },
      { id: "suppliers", label: "Suppliers", icon: Truck, module: "suppliers" },
      { id: "expenses", label: "Expenses", icon: Wallet, module: "costs" },
    ],
  },
  {
    group: "People",
    items: [
      { id: "hr", label: "Staff & Payroll", icon: IdCard, module: "hr" },
      { id: "team", label: "Logins & Roles", icon: ShieldCheck, module: "team" },
    ],
  },
  {
    group: "Website",
    items: [
      { id: "products", label: "Products", icon: Package, module: "website" },
      { id: "bulk-upload", label: "Bulk Upload", icon: Upload, module: "website" },
      { id: "glass", label: "Glass Types", icon: Layers, module: "website" },
      { id: "homepage", label: "Homepage", icon: Sparkles, module: "website" },
    ],
  },
];

// Shared queries so the sidebar badges and the overview reuse the same cache
const useInbox = (enabled) => {
  const quotes = useQuery({ queryKey: ["quote-requests"], queryFn: () => base44.entities.QuoteRequest.list("-created_date", 200), enabled });
  const custom = useQuery({ queryKey: ["custom-orders"], queryFn: () => base44.entities.CustomOrderRequest.list("-created_date", 200), enabled });
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_at", 200), enabled });
  return { quotes, custom, orders };
};

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["staff-me"], queryFn: staffApi.me, retry: false });

  const signOut = async () => {
    await staffApi.logout();
    queryClient.clear();
    queryClient.setQueryData(["staff-me"], null);
  };

  if (me.isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FBF8F3]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!me.data) return <StaffLogin onSignedIn={() => { queryClient.clear(); me.refetch(); }} />;
  return (
    <StaffProvider account={me.data} signOut={signOut}>
      <AdminShell />
    </StaffProvider>
  );
}

function AdminShell() {
  const { account, can, signOut } = useStaff();
  const nav = NAV
    .map((g) => ({ ...g, items: g.items.filter((i) => can(i.module)) }))
    .filter((g) => g.items.length);
  const allowed = nav.flatMap((g) => g.items.map((i) => i.id));

  const [params, setParams] = useSearchParams();
  const tab = allowed.includes(params.get("tab")) ? params.get("tab") : allowed[0];
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const { quotes, custom, orders } = useInbox(can("website"));

  const badges = {
    quotes: (quotes.data || []).filter((q) => q.status === "new").length,
    custom: (custom.data || []).filter((o) => o.status === "new").length,
    orders: (orders.data || []).filter((o) => (o.order_status || "new") === "new").length,
  };

  const go = (id) => {
    setParams(id === allowed[0] ? {} : { tab: id });
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => { document.title = "Admin · Craftsman Galore"; }, []);

  const current = nav.flatMap((g) => g.items).find((i) => i.id === tab);

  const sidebar = (
    <nav className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center justify-between border-b border-white/10">
        <div>
          <p className="font-heading text-xl text-white leading-none">Craftsman Galore</p>
          <p className="text-[9px] uppercase tracking-[0.28em] text-gold font-semibold mt-1">Admin</p>
        </div>
        <button className="lg:hidden p-2 text-white/70" onClick={() => setMenuOpen(false)} aria-label="Close menu">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {nav.map(({ group, items }) => (
          <div key={group || "main"}>
            {group && <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">{group}</p>}
            <ul className="space-y-0.5">
              {items.map(({ id, label, icon: Icon, badge }) => {
                const active = tab === id;
                const count = badge ? badges[badge] : 0;
                return (
                  <li key={id}>
                    <button
                      onClick={() => go(id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        active ? "bg-white/10 text-white" : "text-white/65 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? "text-gold" : ""}`} />
                      <span className="flex-1 text-left">{label}</span>
                      {count > 0 && (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-gold text-obsidian text-[11px] font-bold flex items-center justify-center">
                          {count}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-white/10 space-y-0.5">
        <Link to="/" target="_blank" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/65 hover:text-white hover:bg-white/5">
          <ExternalLink className="w-4 h-4" /> View website
        </Link>
        <button onClick={() => setPwOpen(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/65 hover:text-white hover:bg-white/5">
          <KeyRound className="w-4 h-4" /> Change password
        </button>
        <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/65 hover:text-white hover:bg-white/5">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
        <div className="px-3 pt-3 mt-2 border-t border-white/10">
          <p className="text-sm text-white truncate">{account.name}</p>
          <p className="text-[11px] text-gold">{ROLES[account.role]?.label || account.role}</p>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F5EFE6] font-body">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-60 bg-obsidian z-40">{sidebar}</aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-obsidian shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-60">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 h-14 bg-obsidian flex items-center gap-3 px-4">
          <button onClick={() => setMenuOpen(true)} className="p-1.5 -ml-1.5 text-white" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-white font-medium text-sm">{current?.label}</p>
        </header>

        <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-[1400px]">
          {tab === "dashboard" && <AdminCeoDashboard go={go} />}
          {tab === "customers" && <AdminCustomersTab />}
          {tab === "suppliers" && <AdminSuppliersTab />}
          {tab === "production" && <AdminProductionTab />}
          {tab === "hr" && <AdminHrTab />}
          {tab === "team" && <AdminTeamTab />}
          {tab === "overview" && <AdminOverview go={go} inbox={{ quotes, custom, orders }} />}
          {tab === "orders" && <AdminOrdersTab />}
          {tab === "custom-orders" && <AdminCustomOrdersTab />}
          {tab === "quotes" && <AdminQuotesTab />}
          {tab === "sales" && <AdminSalesTab />}
          {tab === "inventory" && <AdminInventoryTab />}
          {tab === "expenses" && <AdminExpensesTab />}
          {tab === "products" && <AdminProductsTab />}
          {tab === "bulk-upload" && <AdminBatchTab onNavigate={go} />}
          {tab === "glass" && <AdminGlassTab />}
          {tab === "homepage" && <AdminHomepageTab />}
          {tab === "marketing" && <AdminMarketingTab />}
        </main>
        {pwOpen && <PasswordModal account={account} self onClose={() => setPwOpen(false)} onDone={signOut} />}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, onClick }) {
  return (
    <button onClick={onClick} className="text-left bg-white border border-black/10 rounded-lg p-5 hover:border-obsidian/30 hover:shadow-sm transition-all group">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors" />
      </div>
      <p className="text-2xl font-semibold text-obsidian mt-2">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </button>
  );
}

function InboxList({ title, items, empty, onViewAll, render }) {
  return (
    <Panel>
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
        <h3 className="font-semibold text-sm text-obsidian">{title}</h3>
        <button onClick={onViewAll} className="text-xs text-muted-foreground hover:text-obsidian flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      {items.length ? (
        <ul className="divide-y divide-black/5">{items.slice(0, 5).map(render)}</ul>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-10">{empty}</p>
      )}
    </Panel>
  );
}

function AdminOverview({ go, inbox }) {
  const products = useQuery({ queryKey: ["products", "admin-all"], queryFn: () => base44.entities.Product.list("-created_date", 500) });
  const { quotes, custom, orders } = inbox;

  const failed = [products, quotes, custom, orders].find((q) => q.error);
  if (failed) {
    return (
      <>
        <PageHeader title="Overview" />
        <Panel><ErrorState error={failed.error} onRetry={() => [products, quotes, custom, orders].forEach((q) => q.refetch())} /></Panel>
      </>
    );
  }

  const p = products.data || [];
  const o = orders.data || [];
  const newQuotes = (quotes.data || []).filter((q) => q.status === "new");
  const newCustom = (custom.data || []).filter((c) => c.status === "new");
  const newOrders = o.filter((x) => (x.order_status || "new") === "new");
  const drafts = p.filter((x) => !x.is_published);
  const revenue = o.reduce((sum, x) => sum + (Number(x.amount_paid) || 0), 0);
  const loading = products.isLoading || quotes.isLoading || custom.isLoading || orders.isLoading;
  const dash = loading ? "—" : null;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="What needs your attention today."
        actions={
          <>
            <Button variant="outline" className="gap-2 bg-white" onClick={() => go("bulk-upload")}><Upload className="w-4 h-4" /> Bulk upload</Button>
            <Button className="bg-obsidian hover:bg-obsidian/90 text-white gap-2" onClick={() => go("products")}><Plus className="w-4 h-4" /> Manage products</Button>
          </>
        }
      />

      {drafts.length > 0 && (
        <button
          onClick={() => go("products")}
          className="w-full flex items-center gap-3 mb-6 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-left text-sm text-amber-900 hover:bg-amber-100/70"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">
            <strong>{drafts.length} draft product{drafts.length === 1 ? "" : "s"}</strong> hidden from customers. Add prices and publish them.
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="New orders" value={dash ?? newOrders.length} sub={dash ?? `${o.length} total`} icon={ShoppingBag} onClick={() => go("orders")} />
        <StatCard label="Revenue received" value={dash ?? formatKsh(revenue)} sub="From online orders" icon={ShoppingBag} onClick={() => go("orders")} />
        <StatCard label="Open requests" value={dash ?? newCustom.length + newQuotes.length} sub={dash ?? (FEATURES.glassQuote ? `${newCustom.length} custom · ${newQuotes.length} glass` : `${newCustom.length} custom`)} icon={MessageSquare} onClick={() => go("custom-orders")} />
        <StatCard label="Live products" value={dash ?? p.length - drafts.length} sub={dash ?? `${drafts.length} drafts`} icon={Package} onClick={() => go("products")} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <InboxList
          title="New orders"
          items={newOrders}
          empty="No new orders"
          onViewAll={() => go("orders")}
          render={(x) => (
            <li key={x.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-obsidian truncate">{x.customer_name}</p>
                <p className="text-xs text-muted-foreground truncate">{x.product_name} · {formatDate(x.created_at)}</p>
              </div>
              <Pill tone={x.payment_status === "paid" ? "green" : "amber"}>{formatKsh(x.amount_paid)}</Pill>
            </li>
          )}
        />
        <InboxList
          title="New custom requests"
          items={newCustom}
          empty="No new custom requests"
          onViewAll={() => go("custom-orders")}
          render={(x) => (
            <li key={x.id} className="px-5 py-3 text-sm">
              <p className="font-medium text-obsidian truncate">{x.customer_name || "Unnamed customer"}</p>
              <p className="text-xs text-muted-foreground truncate">{x.product_type} · {x.phone} · {formatDate(x.created_at)}</p>
            </li>
          )}
        />
        {FEATURES.glassQuote && <InboxList
          title="New glass quotes"
          items={newQuotes}
          empty="No new glass quotes"
          onViewAll={() => go("quotes")}
          render={(x) => (
            <li key={x.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-obsidian truncate">{x.glass_type_name}</p>
                <p className="text-xs text-muted-foreground truncate">{x.width} × {x.height} {x.unit} · {x.customer_name || x.phone || formatDate(x.created_at)}</p>
              </div>
              <span className="text-xs font-medium whitespace-nowrap">{formatKsh(x.estimated_total)}</span>
            </li>
          )}
        />}
      </div>
    </div>
  );
}
