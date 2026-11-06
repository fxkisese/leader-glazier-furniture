import { useState } from "react";
import { Panel } from "../adminShared";
import { MiniStat } from "../businessShared";
import { BarList, DataTable, SectionTitle, DAYS, ksh, roasText, pct, cap, label } from "./shared";

const DIMENSIONS = ["hook", "product", "format", "platform"];

// Plain-language takeaways from the numbers
function insights(r) {
  const s = r.summary, out = [];
  if (!s.leads && !s.total_cost) return ["No activity in this period yet. Log your posts and leads, or connect Meta ads, and this fills in."];
  if (!s.leads) out.push(`${ksh(s.total_cost)} spent on marketing but no enquiries recorded yet. Add every enquiry on the Leads tab — WhatsApp chats, calls and walk-ins — so you can see what the spend brought in.`);
  else if (s.roas != null) {
    out.push(s.roas < 1
      ? `Marketing returned ${roasText(s.roas)} what it cost — it's losing money. Check the campaigns below before spending more.`
      : s.roas >= 3 ? `Marketing returned ${roasText(s.roas)} what it cost. That's strong: the best campaigns are worth more budget.`
        : `Marketing returned ${roasText(s.roas)} what it cost — profitable, but aim for 3× before scaling.`);
  }
  if (s.leads && !s.won) out.push(`${s.leads} enquiries but no sales marked won. If you've made sales, mark those leads won with the amount — ROAS stays at 0 until you do.`);
  const best = r.campaigns.find((c) => c.won > 0);
  if (best) out.push(`Best campaign: "${best.name}" — ${best.won} sale${best.won === 1 ? "" : "s"}, ${ksh(best.revenue)} from ${ksh(best.spend)} spend.`);
  const waste = r.campaigns.filter((c) => c.spend > 0 && c.leads === 0).sort((a, b) => b.spend - a.spend)[0];
  if (waste) out.push(`"${waste.name}" spent ${ksh(waste.spend)} with no enquiries recorded.`);
  const hook = r.content.hook?.find((h) => h.value !== "untagged" && h.leads > 0);
  if (hook) out.push(`"${cap(hook.value)}" content brings the most enquiries (${hook.leads}).`);
  if (s.conversion_rate != null && s.leads >= 10 && s.conversion_rate < 10) out.push(`Only ${s.conversion_rate}% of enquiries become sales. That points to follow-up or price, not the ads.`);
  if (s.avg_response_minutes != null && s.avg_response_minutes > 60) out.push(`Average reply time is ${Math.round(s.avg_response_minutes / 60)} h. Faster replies usually close more sales.`);
  if (r.lost_reasons[0]) out.push(`Most common reason for losing a sale: ${r.lost_reasons[0].reason} (${r.lost_reasons[0].leads}).`);
  if (r.untagged_ads) out.push(`${r.untagged_ads} ad${r.untagged_ads === 1 ? " isn't" : "s aren't"} fully tagged (type / product / hook) — tag them on Campaigns & Ads so content reports are accurate.`);
  return out;
}

export default function OverviewPanel({ report: r, go }) {
  const s = r.summary;
  const [dim, setDim] = useState("hook");
  const maxHour = Math.max(1, ...r.hours.flat());

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniStat label="Total marketing cost" value={ksh(s.total_cost)}
          sub={`Ads ${ksh(s.ad_spend)} · Boosts ${ksh(s.boost_spend)} · Staff ${ksh(s.staff_pay)} · Other ${ksh(s.other_costs)}`} />
        <MiniStat label="Enquiries (leads)" value={s.leads} sub={`Cost per lead ${ksh(s.cost_per_lead)}`} />
        <MiniStat label="Sales won" value={s.won} sub={`Conversion ${pct(s.conversion_rate)} · Cost per sale ${ksh(s.cost_per_sale)}`} />
        <MiniStat label="Revenue from leads" value={ksh(s.revenue)} tone={s.roas == null ? undefined : s.roas >= 1 ? "good" : "bad"}
          sub={`ROAS ${roasText(s.roas)} · Avg order ${ksh(s.avg_order)}`} />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniStat label="Posts" value={s.posts} sub="Organic posts logged" />
        <MiniStat label="Avg reply time" value={s.avg_response_minutes == null ? "—" : s.avg_response_minutes < 90 ? `${s.avg_response_minutes} min` : `${(s.avg_response_minutes / 60).toFixed(1)} h`}
          sub="From enquiry to first reply" />
        <MiniStat label="Ad spend" value={ksh(s.ad_spend)} sub={`${r.campaigns.length} campaign${r.campaigns.length === 1 ? "" : "s"} active`} />
        <MiniStat label="Other marketing costs" value={ksh(s.other_costs)} sub="Expenses filed under Marketing" />
      </div>

      <Panel>
        <SectionTitle title="What the numbers say" />
        <ul className="px-5 py-4 space-y-2 text-sm list-disc pl-9">
          {insights(r).map((t) => <li key={t}>{t}</li>)}
        </ul>
      </Panel>

      <div className="grid xl:grid-cols-2 gap-6">
        <Panel>
          <SectionTitle title="Where enquiries come from" action={<button onClick={() => go("leads")} className="text-xs text-muted-foreground hover:text-obsidian">View leads →</button>} />
          <div className="p-5">
            <BarList rows={r.sources.map((x) => ({ key: x.source_type, label: x.source_type, value: x.leads, display: `${x.leads} · ${x.won} won · ${ksh(x.revenue)}` }))} empty="No leads in this period" />
          </div>
        </Panel>
        <Panel>
          <SectionTitle title="What content works" sub="Posts and ads grouped by tag — enquiries each brought"
            action={
              <div className="inline-flex border border-black/10 rounded-md overflow-hidden">
                {DIMENSIONS.map((d) => (
                  <button key={d} onClick={() => setDim(d)} className={`px-2.5 py-1 text-xs capitalize ${dim === d ? "bg-obsidian text-white" : "bg-white text-muted-foreground"}`}>{d}</button>
                ))}
              </div>
            } />
          <div className="p-5">
            <BarList rows={(r.content[dim] || []).map((x) => ({ key: x.value, label: x.value, value: x.leads, display: `${x.leads} leads · ${x.won} won · ${x.items} item${x.items === 1 ? "" : "s"}` }))}
              empty="Log posts and tag your ads to see this" />
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle title="Campaigns" sub="Green = made money (ROAS ≥ 1×), amber = spent with no sales" action={<button onClick={() => go("campaigns")} className="text-xs text-muted-foreground hover:text-obsidian">Manage →</button>} />
        <DataTable
          rows={r.campaigns.map((c) => ({ ...c, id: c.campaign_id }))}
          empty="No campaign spend or leads in this period"
          rowClass={(c) => (c.roas != null && c.roas >= 1 ? "bg-emerald-50/60" : c.spend > 0 && !c.won ? "bg-amber-50/60" : "")}
          columns={[
            { key: "name", title: "Campaign", render: (c) => <span className="font-medium">{c.name}</span> },
            { key: "platform", title: "Platform", render: (c) => cap(c.platform) },
            { key: "spend", title: "Spend", num: true, render: (c) => ksh(c.spend) },
            { key: "messages", title: "Chats", num: true },
            { key: "leads", title: "Leads", num: true },
            { key: "won", title: "Won", num: true },
            { key: "revenue", title: "Revenue", num: true, render: (c) => ksh(c.revenue) },
            { key: "cpl", title: "Cost/lead", num: true, render: (c) => ksh(c.cost_per_lead) },
            { key: "roas", title: "ROAS", num: true, render: (c) => roasText(c.roas) },
          ]}
        />
      </Panel>

      <div className="grid xl:grid-cols-[2fr_1fr] gap-6">
        <Panel>
          <SectionTitle title="Best times for enquiries" sub="Nairobi time — darker means more enquiries. Post and reply when it's busiest." />
          <div className="p-5 overflow-x-auto">
            <div className="min-w-[560px] space-y-1">
              <div className="grid grid-cols-[36px_repeat(24,1fr)] gap-1 text-[10px] text-muted-foreground">
                <span />
                {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-center">{h % 3 === 0 ? h : ""}</span>)}
              </div>
              {r.hours.map((row, d) => (
                <div key={d} className="grid grid-cols-[36px_repeat(24,1fr)] gap-1 items-center">
                  <span className="text-[11px] text-muted-foreground">{DAYS[d]}</span>
                  {row.map((n, h) => (
                    <span key={h} title={`${DAYS[d]} ${h}:00 — ${n} enquir${n === 1 ? "y" : "ies"}`}
                      className="h-4 rounded-sm bg-gold" style={{ opacity: n ? 0.15 + 0.85 * (n / maxHour) : 0.06 }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel>
          <SectionTitle title="Why sales are lost" />
          <div className="p-5">
            <BarList rows={r.lost_reasons.map((x) => ({ key: x.reason, label: label(x.reason), value: x.leads }))} empty="No lost leads recorded" />
          </div>
        </Panel>
      </div>
    </div>
  );
}
