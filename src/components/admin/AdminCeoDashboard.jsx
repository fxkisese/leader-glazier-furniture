import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { AlertTriangle, ArrowRight, Flame, PackageX, Wallet } from "lucide-react";
import { base44, businessApi } from "@/api/base44Client";
import { useStaff } from "@/lib/staffSession";
import { PageHeader, Panel, ErrorState, FilterChips, Pill, formatDate } from "./adminShared";
import { MiniStat, money, cents, num, itemCosts, PERIODS, inPeriod, recordDate, today } from "./businessShared";
import { SALES_KEY, EXPENSES_KEY } from "./AdminSalesTab";
import { INVENTORY_KEY } from "./AdminInventoryTab";
import { PURCHASES_KEY } from "./AdminSuppliersTab";
import { JOBS_KEY, isOverdue } from "./AdminProductionTab";

// Validated categorical slots 1 & 2 (blue, orange) on the white panel surface
const SALES_COLOR = "#2a78d6";
const COSTS_COLOR = "#eb6834";

const cogsOf = (s) => num(s.unit_cost) * (num(s.quantity) || 1);
const shortKsh = (n) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `${Math.round(n / 1e3)}k` : `${Math.round(n)}`);

export default function AdminCeoDashboard({ go }) {
  const { account } = useStaff();
  const [period, setPeriod] = useState("this-month");

  const sales = useQuery({ queryKey: SALES_KEY, queryFn: () => base44.entities.Sale.list() });
  const expenses = useQuery({ queryKey: EXPENSES_KEY, queryFn: () => base44.entities.Expense.list() });
  const inventory = useQuery({ queryKey: INVENTORY_KEY, queryFn: () => base44.entities.InventoryItem.list() });
  const purchases = useQuery({ queryKey: PURCHASES_KEY, queryFn: () => base44.entities.Purchase.list() });
  const jobs = useQuery({ queryKey: JOBS_KEY, queryFn: () => base44.entities.ProductionJob.list() });
  const people = useQuery({ queryKey: ["employee-names"], queryFn: businessApi.employeeNames });
  const all = [sales, expenses, inventory, purchases, jobs];

  const S = sales.data || [], E = expenses.data || [], I = inventory.data || [], P = purchases.data || [], J = jobs.data || [];

  const k = useMemo(() => {
    const ps = S.filter((s) => inPeriod(recordDate(s), period));
    const pe = E.filter((e) => inPeriod(recordDate(e), period));
    const revenue = cents(ps.reduce((t, s) => t + num(s.amount), 0));
    const cogs = cents(ps.reduce((t, s) => t + cogsOf(s), 0));
    const spent = cents(pe.reduce((t, e) => t + num(e.amount), 0));
    const wages = cents(pe.filter((e) => e.category === "wages").reduce((t, e) => t + num(e.amount), 0));
    return {
      revenue, cogs, spent, wages,
      gross: cents(revenue - cogs),
      net: cents(revenue - cogs - spent),
      received: cents(ps.reduce((t, s) => t + num(s.amount_paid ?? s.amount), 0)),
      count: ps.length,
      top: Object.values(ps.reduce((m, s) => {
        const key = s.product_name || "Other";
        m[key] = m[key] || { name: key, qty: 0, revenue: 0, profit: 0 };
        m[key].qty += num(s.quantity) || 1;
        m[key].revenue += num(s.amount);
        m[key].profit += num(s.amount) - cogsOf(s);
        return m;
      }, {})).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    };
  }, [S, E, period]);

  const owedToUs = cents(S.reduce((t, s) => t + Math.max(num(s.amount) - num(s.amount_paid ?? s.amount), 0), 0));
  const owedBySales = S.filter((s) => num(s.amount) - num(s.amount_paid ?? s.amount) > 0).sort((a, b) => (num(b.amount) - num(b.amount_paid)) - (num(a.amount) - num(a.amount_paid)));
  const weOwe = cents(P.reduce((t, p) => t + Math.max(num(p.amount) - num(p.amount_paid ?? p.amount), 0), 0));
  const stockValue = cents(I.reduce((t, i) => t + Math.max(num(i.stock_qty), 0) * itemCosts(i).unit, 0));
  const lowStock = I.filter((i) => num(i.stock_qty) <= 1);
  const overdue = J.filter(isOverdue);
  const inWorkshop = J.filter((j) => !["ready", "delivered"].includes(j.stage)).length;

  // Last six calendar months, oldest first
  const trend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const ms = S.filter((s) => recordDate(s).startsWith(key));
      const sold = cents(ms.reduce((t, s) => t + num(s.amount), 0));
      const costs = cents(ms.reduce((t, s) => t + cogsOf(s), 0) + E.filter((e) => recordDate(e).startsWith(key)).reduce((t, e) => t + num(e.amount), 0));
      return { key, label: d.toLocaleDateString("en-KE", { month: "short" }), Sales: sold, Costs: costs, net: cents(sold - costs) };
    });
  }, [S, E]);

  const failed = all.find((q) => q.error);
  const loading = all.some((q) => q.isLoading);
  const v = (x) => (loading ? "—" : x);
  const hour = new Date().getHours();

  if (failed) {
    return <><PageHeader title="CEO Dashboard" /><Panel><ErrorState error={failed.error} onRetry={() => all.forEach((q) => q.refetch())} /></Panel></>;
  }

  return (
    <div>
      <PageHeader
        title={`Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, ${account.name.split(" ")[0]}`}
        description="The whole business on one page."
        actions={<FilterChips options={PERIODS} value={period} onChange={setPeriod} />}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <MiniStat label="Sales" value={v(money(k.revenue))} sub={`${k.count} sale${k.count === 1 ? "" : "s"}`} />
        <MiniStat label="Gross profit" value={v(money(k.gross))} tone={k.gross < 0 ? "bad" : "good"} sub={k.revenue ? `${((k.gross / k.revenue) * 100).toFixed(1)}% margin` : "Sales minus cost of goods"} />
        <MiniStat label="Net profit" value={v(money(k.net))} tone={k.net < 0 ? "bad" : "good"} sub={`After ${money(k.spent)} expenses`} />
        <MiniStat label="Cash received" value={v(money(k.received))} sub="From sales in this period" />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MiniStat label="Customers owe you" value={v(money(owedToUs))} tone={owedToUs > 0 ? "bad" : undefined} sub="All time" />
        <MiniStat label="You owe suppliers" value={v(money(weOwe))} tone={weOwe > 0 ? "bad" : undefined} sub="All time" />
        <MiniStat label="Stock value (at cost)" value={v(money(stockValue))} sub={`${I.reduce((t, i) => t + Math.max(num(i.stock_qty), 0), 0)} units on hand`} />
        <MiniStat label="Wages" value={v(money(k.wages))} sub={people.data ? `${people.data.length} active staff` : "Paid through payroll"} />
      </div>

      <div className="grid xl:grid-cols-3 gap-6 mb-6">
        <Panel className="xl:col-span-2 p-5">
          <p className="text-sm font-semibold text-obsidian">Sales vs costs — last 6 months</p>
          <p className="text-xs text-muted-foreground mb-4">Costs = production cost of what sold + all expenses</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#00000010" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6b6b6b" }} />
                <YAxis tickFormatter={shortKsh} tickLine={false} axisLine={false} width={44} tick={{ fontSize: 12, fill: "#6b6b6b" }} />
                <Tooltip
                  cursor={{ fill: "#0000000a" }}
                  formatter={(value, name) => [money(value), name]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #0000001a", fontSize: 12 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#444" }} />
                <Bar dataKey="Sales" fill={SALES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Costs" fill={COSTS_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Same numbers as a table, so nothing depends on reading colour */}
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr><th className="text-left font-medium py-1">Net profit</th>{trend.map((m) => <th key={m.key} className="text-right font-medium py-1">{m.label}</th>)}</tr>
              </thead>
              <tbody>
                <tr><td />{trend.map((m) => <td key={m.key} className={`text-right py-1 font-medium ${m.net < 0 ? "text-red-600" : "text-obsidian"}`}>{shortKsh(m.net)}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="p-5">
          <p className="text-sm font-semibold text-obsidian mb-3">Best sellers</p>
          {k.top.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No sales in this period</p> : (
            <ul className="space-y-3">
              {k.top.map((t) => (
                <li key={t.name} className="text-sm">
                  <div className="flex justify-between gap-2"><span className="font-medium text-obsidian truncate">{t.name}</span><span>{money(t.revenue)}</span></div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t.qty} sold</span>
                    <span className={t.profit < 0 ? "text-red-600" : "text-emerald-700"}>{money(t.profit)} profit</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => go("sales")} className="mt-4 text-xs text-muted-foreground hover:text-obsidian flex items-center gap-1">All sales <ArrowRight className="w-3 h-3" /></button>
        </Panel>
      </div>

      <h2 className="text-sm font-semibold text-obsidian mb-3">Needs your attention</h2>
      <div className="grid lg:grid-cols-3 gap-6">
        <AttentionList
          icon={Flame} title="Overdue production" empty={`${inWorkshop} jobs in the workshop, none overdue`} onViewAll={() => go("production")}
          items={overdue.slice(0, 5).map((j) => ({ id: j.id, main: j.title, sub: j.customer_name ? `For ${j.customer_name}` : "For stock", right: <Pill tone="red">Due {formatDate(j.due_date)}</Pill> }))}
        />
        <AttentionList
          icon={PackageX} title="Low or no stock" empty="Everything is in stock" onViewAll={() => go("inventory")}
          items={lowStock.slice(0, 5).map((i) => ({ id: i.id, main: i.name, sub: `Costs ${money(itemCosts(i).unit)} to make`, right: <Pill tone={num(i.stock_qty) <= 0 ? "red" : "amber"}>{num(i.stock_qty) <= 0 ? "Sold out" : "1 left"}</Pill> }))}
        />
        <AttentionList
          icon={Wallet} title="Biggest unpaid balances" empty="No one owes you money" onViewAll={() => go("customers")}
          items={owedBySales.slice(0, 5).map((s) => ({ id: s.id, main: s.customer_name || "Walk-in customer", sub: `${s.product_name} · ${formatDate(recordDate(s))}`, right: <span className="text-sm font-medium text-red-600">{money(num(s.amount) - num(s.amount_paid))}</span> }))}
        />
      </div>
      {!loading && S.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Start by adding cost sheets under Inventory & Costs, then record sales — this dashboard fills in from there. (Today: {formatDate(today())})
        </p>
      )}
    </div>
  );
}

function AttentionList({ icon: Icon, title, items, empty, onViewAll }) {
  return (
    <Panel>
      <div className="flex items-center justify-between px-5 py-3 border-b border-black/10">
        <p className="font-semibold text-sm text-obsidian flex items-center gap-2"><Icon className="w-4 h-4 text-gold" />{title}</p>
        <button onClick={onViewAll} className="text-xs text-muted-foreground hover:text-obsidian flex items-center gap-1">View <ArrowRight className="w-3 h-3" /></button>
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8 px-4">{empty}</p> : (
        <ul className="divide-y divide-black/5">
          {items.map((it) => (
            <li key={it.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0"><p className="font-medium text-obsidian truncate">{it.main}</p><p className="text-xs text-muted-foreground truncate">{it.sub}</p></div>
              {it.right}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
