// Profit tracker for the CEO dashboard: this month's net profit against a monthly target,
// day by day, with the pace needed to hit it and how past months did.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Target, Pencil, CheckCircle2, XCircle, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, Pill } from "./adminShared";
import { money, cents, num, recordDate } from "./businessShared";

export const TARGETS_KEY = ["profit-targets"];

// This month is the one series in colour (categorical slot 1); last month and the target are neutral context
const THIS_COLOR = "#2a78d6";
const LAST_COLOR = "#b9b2aa";
const PACE_COLOR = "#6b6259";

const pad = (n) => String(n).padStart(2, "0");
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const daysIn = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const monthName = (d, style = "long") => d.toLocaleDateString("en-KE", { month: style, year: style === "long" ? "numeric" : undefined });
const shortKsh = (n) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `${Math.round(n / 1e3)}k` : `${Math.round(n)}`);
const cogsOf = (s) => num(s.unit_cost) * (num(s.quantity) || 1);

// Net profit per day of a month: sales minus what they cost to make, minus expenses that day
function dailyNet(sales, expenses, key, days) {
  const net = Array(days + 1).fill(0);
  const dayOf = (r) => { const d = recordDate(r); return d.startsWith(key) ? parseInt(d.slice(8, 10), 10) : 0; };
  sales.forEach((s) => { const d = dayOf(s); if (d) net[d] += num(s.amount) - cogsOf(s); });
  expenses.forEach((e) => { const d = dayOf(e); if (d) net[d] -= num(e.amount); });
  return net;
}

const running = (net) => net.reduce((acc, v, i) => { acc.push(cents((acc[i - 1] ?? 0) + v)); return acc; }, []);

// A month without its own target uses the latest one set before it
function targetFor(targets, key) {
  const t = targets.filter((x) => x.month <= key).sort((a, b) => b.month.localeCompare(a.month))[0];
  return t ? num(t.amount) : 0;
}

export default function ProfitTracker({ sales, expenses, loading }) {
  const queryClient = useQueryClient();
  const targetsQ = useQuery({ queryKey: TARGETS_KEY, queryFn: () => base44.entities.ProfitTarget.list() });
  const targets = targetsQ.data || [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const now = new Date();
  const key = monthKey(now);
  const days = daysIn(now);
  const day = now.getDate();
  const target = targetFor(targets, key);
  const ownTarget = targets.find((t) => t.month === key);

  const t = useMemo(() => {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDays = daysIn(last);
    const cum = running(dailyNet(sales, expenses, key, days));
    const cumLast = running(dailyNet(sales, expenses, monthKey(last), lastDays));
    const soFar = cum[day];
    const lastSameDay = cumLast[Math.min(day, lastDays)];
    const chart = Array.from({ length: days }, (_, i) => {
      const d = i + 1;
      return {
        day: d,
        "This month": d <= day ? cum[d] : null,
        "Last month": d <= lastDays ? cumLast[d] : null,
        ...(target ? { "Target pace": cents((target * d) / days) } : {}),
      };
    });
    // Five finished months plus this one, oldest first
    const history = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const k = monthKey(d);
      const net = running(dailyNet(sales, expenses, k, daysIn(d)));
      return { key: k, label: monthName(d, "short"), profit: net[net.length - 1], target: targetFor(targets, k), current: k === key };
    });
    return { soFar, lastSameDay, lastName: monthName(last, "long").split(" ")[0], chart, history, projected: cents((soFar / day) * days) };
  }, [sales, expenses, targets, key, day, days, target]);

  const save = useMutation({
    mutationFn: (amount) => (ownTarget
      ? base44.entities.ProfitTarget.update(ownTarget.id, { amount })
      : base44.entities.ProfitTarget.create({ month: key, amount })),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: TARGETS_KEY }); setEditing(false); toast.success("Profit target saved"); },
    onError: (e) => toast.error("Couldn't save the target: " + (e.message || "unknown error")),
  });

  const startEdit = () => { setDraft(target ? String(target) : ""); setEditing(true); };
  const submit = (e) => {
    e.preventDefault();
    const amount = cents(draft);
    if (amount <= 0) { toast.error("Enter a target above zero"); return; }
    save.mutate(amount);
  };

  const pct = target ? (t.soFar / target) * 100 : 0;
  const expected = target ? (target * day) / days : 0;
  const toGo = cents(target - t.soFar);
  const daysLeft = days - day;
  const hit = target > 0 && t.soFar >= target;
  const onTrack = target > 0 && t.soFar >= expected;
  const vsLast = cents(t.soFar - t.lastSameDay);
  const v = (x) => (loading ? "—" : x);

  return (
    <Panel className="p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-semibold text-obsidian flex items-center gap-2"><Target className="w-4 h-4 text-gold" /> Profit tracker — {monthName(now)}</p>
          <p className="text-xs text-muted-foreground">Net profit = sales − cost to make what sold − expenses. Day {day} of {days}.</p>
        </div>
        {editing ? (
          <form onSubmit={submit} className="flex items-center gap-2">
            <Input autoFocus type="number" min="0" step="1000" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Monthly target (KSh)" className="h-8 w-44" />
            <Button type="submit" size="sm" disabled={save.isPending} className="bg-obsidian hover:bg-obsidian/90 text-white h-8">{save.isPending ? "Saving..." : "Save"}</Button>
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setEditing(false)}>Cancel</Button>
          </form>
        ) : (
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={startEdit} disabled={targetsQ.isLoading}>
            <Pencil className="w-3.5 h-3.5" /> {target ? "Change target" : "Set monthly target"}
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Numbers */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net profit so far</p>
            <p className={`text-3xl font-semibold mt-1 ${t.soFar < 0 ? "text-red-600" : "text-obsidian"}`}>{v(money(t.soFar))}</p>
            {target > 0 && <p className="text-sm text-muted-foreground">of {money(target)} target{!ownTarget && " (carried over)"}</p>}
          </div>

          {target > 0 ? (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-obsidian">{loading ? "—" : `${Math.max(pct, 0).toFixed(0)}% of target`}</span>
                  {!loading && (hit
                    ? <Pill tone="green"><CheckCircle2 className="w-3 h-3" /> Target hit</Pill>
                    : onTrack ? <Pill tone="green"><TrendingUp className="w-3 h-3" /> On track</Pill>
                      : <Pill tone="amber"><Clock className="w-3 h-3" /> Behind pace</Pill>)}
                </div>
                <div className="relative h-2.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: THIS_COLOR }} />
                  {/* Where you should be by today */}
                  <div className="absolute top-0 h-full w-0.5 bg-obsidian/60" style={{ left: `${(day / days) * 100}%` }} title="Where you should be by today" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">The dark tick marks where you should be by today ({money(expected)}).</p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Stat label={hit ? "Above target" : "Still to make"} value={v(money(Math.abs(toGo)))} />
                <Stat label="Needed per day" value={hit ? "Done" : daysLeft > 0 ? v(money(toGo / daysLeft)) : "Last day"} sub={!hit && daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : undefined} />
                <Stat label="At this pace, month ends at" value={v(money(t.projected))} tone={t.projected >= target ? "good" : "bad"} sub={day < 7 ? "Early in the month — rough guess" : undefined} />
                <Stat label={`vs ${t.lastName} by day ${day}`} value={v(`${vsLast >= 0 ? "+" : "−"}${money(Math.abs(vsLast))}`)} tone={vsLast >= 0 ? "good" : "bad"} icon={vsLast >= 0 ? TrendingUp : TrendingDown} />
              </dl>
            </>
          ) : (
            <div className="rounded-md bg-muted/40 p-4 text-sm">
              <p className="font-medium text-obsidian">Set a monthly profit target</p>
              <p className="text-muted-foreground mt-1">You'll see how far along you are, whether you're on pace, and how much you need to make each day to hit it.</p>
              <p className="text-muted-foreground mt-2">At this pace the month ends at <span className="font-medium text-obsidian">{v(money(t.projected))}</span>.</p>
            </div>
          )}
        </div>

        {/* Running total through the month */}
        <div className="lg:col-span-3">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={t.chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#00000010" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} tick={{ fontSize: 12, fill: "#6b6b6b" }} />
                <YAxis tickFormatter={shortKsh} tickLine={false} axisLine={false} width={44} tick={{ fontSize: 12, fill: "#6b6b6b" }} />
                <Tooltip
                  labelFormatter={(d) => `Day ${d}`}
                  formatter={(value, name) => [money(value), name]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #0000001a", fontSize: 12 }}
                />
                <Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12, color: "#444" }} />
                <Line type="monotone" dataKey="Last month" stroke={LAST_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} />
                {target > 0 && <Line type="linear" dataKey="Target pace" stroke={PACE_COLOR} strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} />}
                <Line type="monotone" dataKey="This month" stroke={THIS_COLOR} strokeWidth={2.5} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Month by month against the target */}
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left font-medium py-1" />
                  {t.history.map((m) => <th key={m.key} className="text-right font-medium py-1">{m.label}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-muted-foreground py-1">Profit</td>
                  {t.history.map((m) => <td key={m.key} className={`text-right py-1 font-medium ${m.profit < 0 ? "text-red-600" : "text-obsidian"}`}>{loading ? "—" : shortKsh(m.profit)}</td>)}
                </tr>
                <tr>
                  <td className="text-muted-foreground py-1">Target</td>
                  {t.history.map((m) => <td key={m.key} className="text-right py-1 text-muted-foreground">{m.target ? shortKsh(m.target) : "—"}</td>)}
                </tr>
                <tr>
                  <td className="text-muted-foreground py-1">Result</td>
                  {t.history.map((m) => (
                    <td key={m.key} className="text-right py-1">
                      {!m.target || loading ? <span className="text-muted-foreground">—</span>
                        : m.profit >= m.target ? <span className="inline-flex items-center gap-0.5 text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Hit</span>
                          : m.current ? <span className="text-muted-foreground">In progress</span>
                            : <span className="inline-flex items-center gap-0.5 text-red-600"><XCircle className="w-3 h-3" /> Missed</span>}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Stat({ label, value, sub, tone, icon: Icon }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : "text-obsidian";
  return (
    <div className="rounded-md border border-black/10 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`font-semibold mt-0.5 flex items-center gap-1 ${color}`}>{Icon && <Icon className="w-3.5 h-3.5" />}{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground mt-0.5">{sub}</dd>}
    </div>
  );
}
