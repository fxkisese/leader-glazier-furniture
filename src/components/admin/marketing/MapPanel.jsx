import { lazy, Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Target, MapPin, Pencil } from "lucide-react";
import { base44, marketingApi } from "@/api/base44Client";
import { COUNTIES, placeKey } from "@/data/kenyaPlaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, ErrorState, FilterChips } from "../adminShared";
import { Field, NativeSelect, Modal, num } from "../businessShared";
import { BarList, DataTable, SectionTitle, MAP_RAMP, MAP_PIN, MAP_INK, ksh, roasText, nairobiDate, useRefreshMarketing } from "./shared";
import LocationPicker, { usePlaces } from "./LocationPicker";

// Leaflet and the county shapes load only when this tab is opened
const KenyaMap = lazy(() => import("./KenyaMap"));

const count = (n) => (n == null ? "—" : Number(n).toLocaleString("en-KE"));

const METRICS = [
  { value: "spend", label: "Spend", fmt: ksh },
  { value: "reach", label: "Reach", fmt: count },
  { value: "clicks", label: "Clicks", fmt: count },
  { value: "messages", label: "Chats", fmt: count },
  { value: "leads", label: "Leads", fmt: count },
  { value: "won", label: "Sales", fmt: count },
  { value: "revenue", label: "Revenue", fmt: ksh },
  { value: "cost_per_lead", label: "Cost per lead", fmt: ksh },
  { value: "roas", label: "ROAS", fmt: roasText },
];

const NO_NUMBERS = { spend: 0, reach: 0, clicks: 0, messages: 0, leads: 0, won: 0, revenue: 0, cost_per_lead: null, roas: null };

const monthLabel = (m) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-KE", { month: "long", year: "numeric", timeZone: "UTC" });

/** This month (Nairobi) and the eleven before it, newest first. */
function recentMonths() {
  const now = nairobiDate().slice(0, 7);
  let [y, m] = now.split("-").map(Number);
  const months = [];
  for (let i = 0; i < 12; i++) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    if (--m === 0) { m = 12; y--; }
  }
  return { now, months };
}

function rangeFor(period, now) {
  if (period === "year") return { from: `${now.slice(0, 4)}-01`, to: `${now.slice(0, 4)}-12` };
  if (period === "all") return { from: "2000-01", to: "2099-12" };
  return { from: period, to: period };
}

/**
 * Splits the counties that have a value into up to five equal-sized groups, lightest to darkest.
 * Equal groups (rather than equal ranges) stop one big county such as Nairobi washing out the rest.
 */
function makeScale(values) {
  const v = [...new Set(values.filter((x) => x > 0))].sort((a, b) => a - b);
  const n = Math.min(MAP_RAMP.length, v.length);
  if (!n) return { color: () => null, steps: [] };
  const tops = Array.from({ length: n }, (_, i) => v[Math.ceil(((i + 1) * v.length) / n) - 1]);
  const colors = tops.map((_, i) => MAP_RAMP[Math.round(((i + 1) * MAP_RAMP.length) / n) - 1]);
  return {
    color: (x) => (x > 0 ? colors[tops.findIndex((t) => x <= t)] : null),
    steps: tops.map((to, i) => ({ to, color: colors[i] })),
  };
}

/** Hover text for a county or town: the chosen measure, then the three numbers that matter most. */
function tipLines(row, metric) {
  if (!row) return ["No numbers for this period"];
  const summary = `Spend ${ksh(row.spend)} · ${count(row.leads)} leads · ${count(row.won)} sales`;
  return ["spend", "leads", "won"].includes(metric.value) ? [summary] : [`${metric.label}: ${metric.fmt(row[metric.value])}`, summary];
}

const splitKey = (key) => {
  const i = key.indexOf("|");
  return { county: key.slice(0, i), town: key.slice(i + 1) };
};
const keyLabel = (key) => {
  const { county, town } = splitKey(key);
  return town ? `${town} (${county})` : county;
};

/** A map of Kenya shaded by where your ads and enquiries are, with the places each campaign is aimed at. */
export default function MapPanel({ go }) {
  const refresh = useRefreshMarketing();
  const queryClient = useQueryClient();
  const { now, months } = useMemo(recentMonths, []);
  const [period, setPeriod] = useState(now);
  const [campaignId, setCampaignId] = useState("");
  const [metricKey, setMetricKey] = useState("spend");
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("view"); // view | targets | place
  const [draft, setDraft] = useState(null); // targets being edited, as a Set of place keys
  const [modal, setModal] = useState(null); // { type: "entry", row?, county? } | { type: "place", county, lat, lng }

  const { from, to } = rangeFor(period, now);
  const report = useQuery({
    queryKey: ["mkt", "geo", from, to, campaignId],
    queryFn: () => marketingApi.geoReport(from, to, campaignId || undefined),
    placeholderData: (previous) => previous, // keep the map painted while the next month loads
  });
  const campaigns = useQuery({ queryKey: ["mkt", "campaigns"], queryFn: () => base44.entities.MktCampaign.list() });
  const places = usePlaces();

  const data = report.data;
  const metric = METRICS.find((m) => m.value === metricKey);
  const campaign = campaigns.data?.find((c) => c.id === campaignId);
  const campaignName = new Map((campaigns.data || []).map((c) => [c.id, c.name]));

  const countyRows = useMemo(() => new Map((data?.counties || []).map((c) => [c.county, c])), [data]);
  const townRows = useMemo(() => new Map((data?.towns || []).map((t) => [placeKey(t.county, t.town), t])), [data]);
  const scale = useMemo(() => makeScale((data?.counties || []).map((c) => c[metricKey])), [data, metricKey]);
  const fills = useMemo(() => {
    const m = new Map();
    for (const c of data?.counties || []) {
      const color = scale.color(c[metricKey]);
      if (color) m.set(c.county, color);
    }
    return m;
  }, [data, scale, metricKey]);

  // Targets: the picked campaign's, or every active campaign's when none is picked
  const savedTargets = useMemo(() => {
    const list = campaigns.data || [];
    const source = campaignId ? list.filter((c) => c.id === campaignId) : list.filter((c) => c.status === "active");
    return new Set(source.flatMap((c) => c.target_areas || []).map((t) => placeKey(t.county, t.town)));
  }, [campaigns.data, campaignId]);
  const targetKeys = draft ?? savedTargets;
  const targetCounties = useMemo(
    () => new Set([...targetKeys].filter((k) => k.endsWith("|")).map((k) => k.slice(0, -1))),
    [targetKeys],
  );

  const mapTowns = useMemo(() => {
    const max = Math.max(0, ...(data?.towns || []).map((t) => t[metricKey] || 0));
    return places.map((p) => {
      const key = placeKey(p.county, p.name);
      const row = townRows.get(key);
      const value = row?.[metricKey] || 0;
      const targeted = targetKeys.has(key);
      // Quiet towns stay off the map unless you're picking targets or placing a pin
      if (!(value > 0) && !targeted && !p.custom && mode === "view") return null;
      const lines = [`${p.name}, ${p.county}`];
      if (mode === "targets") lines.push(targeted ? "Targeted — click to remove" : "Click to target");
      else {
        lines.push(...tipLines(row, metric));
        if (targeted) lines.push("Targeted");
        if (p.custom) lines.push(mode === "place" ? "Your pin — click to remove" : "Your pin");
      }
      return {
        ...p, key, targeted, lines, filled: value > 0,
        radius: value > 0 ? 5 + 8 * Math.sqrt(value / max) : targeted ? 5.5 : 4.5,
      };
    }).filter(Boolean).sort((a, b) => b.radius - a.radius); // big circles first so small ones stay clickable
  }, [places, townRows, targetKeys, data, metricKey, metric, mode]);

  const countyLines = (name) => {
    const c = countyRows.get(name);
    if (mode === "targets") return [name, targetKeys.has(placeKey(name)) ? "Targeted — click to remove" : "Click to target"];
    if (mode === "place") return [name, "Click exactly where the place is"];
    return [name, ...tipLines(c, metric), ...(targetCounties.has(name) ? ["Targeted"] : [])];
  };

  // Where the plan and the results disagree
  const check = useMemo(() => {
    if (!targetKeys.size || !data) return null;
    const covered = new Set([...targetKeys].map((k) => splitKey(k).county));
    const quiet = [...targetKeys].filter((k) => {
      const row = k.endsWith("|") ? countyRows.get(k.slice(0, -1)) : townRows.get(k);
      return !row || !(row.leads || row.messages);
    }).map(keyLabel).sort();
    const surprise = data.counties.filter((c) => c.leads > 0 && !covered.has(c.county)).sort((a, b) => b.leads - a.leads);
    return { quiet, surprise };
  }, [targetKeys, data, countyRows, townRows]);

  const toggleTarget = (key) => setDraft((d) => {
    const next = new Set(d);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const saveTargets = useMutation({
    mutationFn: () => {
      const areas = [...draft].map((k) => {
        const { county, town } = splitKey(k);
        return town ? { county, town } : { county };
      });
      return areas.length
        ? base44.entities.MktCampaign.update(campaign.id, { target_areas: areas })
        : base44.entities.MktCampaign.update(campaign.id, {}, ["target_areas"]);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["mkt", "campaigns"], (list) => list?.map((c) => (c.id === updated.id ? updated : c)));
      toast.success("Targets saved");
      setDraft(null);
      setMode("view");
      refresh();
    },
    onError: (e) => toast.error("Couldn't save targets: " + e.message),
  });
  const removePlace = useMutation({
    mutationFn: (id) => base44.entities.MktPlace.delete(id),
    onSuccess: () => { toast.success("Pin removed"); refresh(); },
    onError: (e) => toast.error("Couldn't remove the pin: " + e.message),
  });

  const onCounty = (name, at) => {
    if (mode === "targets") return toggleTarget(placeKey(name));
    if (mode === "place") return setModal({ type: "place", county: name, lat: at.lat, lng: at.lng });
    setSelected((s) => (s === name ? null : name));
  };
  const onTown = (t) => {
    if (mode === "targets") return toggleTarget(t.key);
    if (mode === "place") {
      if (t.custom && confirm(`Remove your pin "${t.name}"? Numbers and leads already filed under it stay with ${t.county}.`)) removePlace.mutate(t.id);
      return;
    }
    setSelected(t.county);
  };
  const startTargets = () => { setDraft(new Set(savedTargets)); setMode("targets"); setSelected(null); };
  const stopEditing = () => { setDraft(null); setMode("view"); };
  const close = () => setModal(null);
  const saved = () => { refresh(); close(); };

  const card = selected ? countyRows.get(selected) ?? NO_NUMBERS : data?.total ?? NO_NUMBERS;
  const cardTowns = selected ? (data?.towns || []).filter((t) => t.county === selected).sort((a, b) => (b[metricKey] || 0) - (a[metricKey] || 0)) : [];
  const ranked = [...(data?.counties || [])].filter((c) => c[metricKey] > 0).sort((a, b) => b[metricKey] - a[metricKey]).slice(0, 10);
  const entries = (data?.entries || []).filter((e) => !selected || e.county === selected);
  const periodText = period === "year" ? `${now.slice(0, 4)}` : period === "all" ? "All time" : monthLabel(period);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Panel className="p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="grid grid-cols-2 gap-3 lg:w-[480px]">
            <Field label="Period">
              <NativeSelect value={period} onChange={setPeriod}>
                {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
                <option value="year">This year ({now.slice(0, 4)})</option>
                <option value="all">All time</option>
              </NativeSelect>
            </Field>
            <Field label="Campaign">
              <NativeSelect value={campaignId} onChange={(v) => { setCampaignId(v); stopEditing(); }}>
                <option value="">All campaigns</option>
                {(campaigns.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5" disabled={mode !== "view"} onClick={() => setMode("place")}><MapPin className="w-4 h-4" /> Add a place</Button>
            <Button variant="outline" className="gap-1.5" disabled={!campaign || mode !== "view"} onClick={startTargets}
              title={campaign ? "Mark the counties and towns this campaign is aimed at" : "Pick one campaign first"}>
              <Target className="w-4 h-4" /> Edit targets
            </Button>
            <Button className="bg-obsidian hover:bg-obsidian/90 text-white gap-1.5" onClick={() => setModal({ type: "entry", county: selected })}><Plus className="w-4 h-4" /> Add numbers</Button>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium mb-1.5">Shade the map by</p>
          <FilterChips options={METRICS} value={metricKey} onChange={setMetricKey} />
        </div>
      </Panel>

      {mode === "targets" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-black/15 bg-amber-50 px-4 py-3 text-sm">
          <p>Click the counties and town pins <span className="font-medium">“{campaign?.name}”</span> is aimed at. Click again to remove. <span className="text-muted-foreground">{draft?.size ?? 0} marked.</span></p>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={stopEditing}>Cancel</Button>
            <Button size="sm" className="bg-obsidian hover:bg-obsidian/90 text-white" disabled={saveTargets.isPending} onClick={() => saveTargets.mutate()}>{saveTargets.isPending ? "Saving..." : "Save targets"}</Button>
          </div>
        </div>
      )}
      {mode === "place" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-black/15 bg-amber-50 px-4 py-3 text-sm">
          <p>Zoom in and click the map exactly where the place is, then name it. Click one of your own pins to remove it.</p>
          <Button variant="outline" size="sm" className="shrink-0" onClick={stopEditing}>Done</Button>
        </div>
      )}

      {report.error && <Panel><ErrorState error={report.error} onRetry={report.refetch} /></Panel>}

      <div className="grid xl:grid-cols-[3fr_2fr] gap-6 items-start">
        <Panel>
          <SectionTitle title={`${metric.label} across Kenya`} sub={`${periodText}${campaign ? ` · ${campaign.name}` : ""} · click a county for its numbers`} />
          <div className="h-[460px] sm:h-[580px] xl:h-[700px]">
            <Suspense fallback={<div className="h-full animate-pulse bg-muted/60 rounded-b-lg" />}>
              <KenyaMap fills={fills} targetCounties={targetCounties} selected={selected} towns={mapTowns}
                countyLines={countyLines} onCounty={onCounty} onTown={onTown} picking={mode !== "view"} />
            </Suspense>
          </div>
          <Legend scale={scale} metric={metric} />
        </Panel>

        <div className="space-y-6">
          <Panel>
            <SectionTitle title={selected || "All of Kenya"} sub={periodText}
              action={
                <NativeSelect value={selected || ""} onChange={(v) => setSelected(v || null)} className="h-8 py-1 w-44">
                  <option value="">All of Kenya</option>
                  {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </NativeSelect>
              } />
            <dl className="grid grid-cols-3 gap-x-4 gap-y-3 px-5 py-4 text-sm">
              {METRICS.map((m) => (
                <div key={m.value}>
                  <dt className="text-xs text-muted-foreground">{m.label}</dt>
                  <dd className="font-semibold text-obsidian tabular-nums">{m.fmt(card[m.value])}</dd>
                </div>
              ))}
            </dl>
            {selected && (
              <div className="px-5 pb-4 space-y-3">
                {cardTowns.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Towns in {selected}</p>
                    <BarList rows={cardTowns.map((t) => ({ key: t.town, label: t.town, value: t[metricKey] || 0, display: `${metric.fmt(t[metricKey])} · ${count(t.leads)} leads` }))} />
                  </div>
                )}
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setModal({ type: "entry", county: selected })}><Plus className="w-4 h-4" /> Add numbers for {selected}</Button>
              </div>
            )}
          </Panel>

          <Panel>
            <SectionTitle title={`Top counties by ${metric.label.toLowerCase()}`} />
            <div className="p-5">
              <BarList rows={ranked.map((c) => ({ key: c.county, label: c.county, value: c[metricKey], display: metric.fmt(c[metricKey]) }))}
                empty="No numbers for this period yet. Use “Add numbers”, and set a county on your leads." />
            </div>
          </Panel>

          {check && (check.quiet.length > 0 || check.surprise.length > 0) && (
            <Panel>
              <SectionTitle title="Targets vs results" sub={campaign ? campaign.name : "All active campaigns"} />
              <div className="px-5 py-4 space-y-3 text-sm">
                {check.quiet.length > 0 && (
                  <p><span className="font-medium">Targeted, but no chats or leads recorded:</span> {check.quiet.join(", ")}.</p>
                )}
                {check.surprise.length > 0 && (
                  <p><span className="font-medium">Leads from places you didn’t target:</span> {check.surprise.map((c) => `${c.county} (${c.leads})`).join(", ")}.</p>
                )}
              </div>
            </Panel>
          )}

          {data?.unlocated_leads > 0 && (
            <div className="rounded-lg border border-black/10 bg-white px-5 py-4 text-sm">
              <p>{data.unlocated_leads} of {data.leads} leads in this period have no county yet, so they aren’t on the map.</p>
              <button onClick={() => go("leads")} className="mt-1 text-xs font-medium text-obsidian underline underline-offset-2">Open Leads and set their county →</button>
            </div>
          )}
        </div>
      </div>

      <Panel>
        <SectionTitle title={selected ? `Numbers entered for ${selected}` : "Numbers entered"}
          sub="One entry per month, place and campaign. Leads and sales come from the Leads tab, not from here." />
        <DataTable
          rows={entries}
          empty="Nothing entered for this period yet."
          columns={[
            { key: "month", title: "Month", render: (e) => monthLabel(e.month) },
            { key: "place", title: "Place", render: (e) => <span className="font-medium">{e.town ? `${e.town}, ${e.county}` : e.county}</span> },
            { key: "campaign", title: "Campaign", render: (e) => (e.campaign_id ? campaignName.get(e.campaign_id) || "—" : "—") },
            { key: "spend", title: "Spend", num: true, render: (e) => ksh(e.spend) },
            { key: "reach", title: "Reach", num: true, render: (e) => count(e.reach) },
            { key: "clicks", title: "Clicks", num: true, render: (e) => count(e.clicks) },
            { key: "messages", title: "Chats", num: true, render: (e) => count(e.messages) },
            { key: "edit", title: "", num: true, render: (e) => (
              <button onClick={() => setModal({ type: "entry", row: e })} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-obsidian">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>) },
          ]}
        />
      </Panel>

      {modal?.type === "entry" && (
        <EntryModal entry={modal.row} campaigns={campaigns.data || []} onClose={close} onSaved={saved}
          defaults={{ month: /^\d{4}-\d{2}$/.test(period) ? period : now, county: modal.county || "", campaign_id: campaignId }} />
      )}
      {modal?.type === "place" && <PlaceModal at={modal} places={places} onClose={close} onSaved={() => { saved(); setMode("view"); }} />}
    </div>
  );
}

/** What the colours and marks mean. Sits under the map so the shading is never a guess. */
function Legend({ scale, metric }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 border-t border-black/10 text-xs text-muted-foreground">
      {scale.steps.length > 0 ? (
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-obsidian">{metric.label}</span>
          {scale.steps.map((s) => (
            <span key={s.color} className="inline-flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-sm border border-black/10" style={{ background: s.color }} />
              up to {metric.fmt(s.to)}
            </span>
          ))}
        </span>
      ) : <span>No {metric.label.toLowerCase()} recorded for this period</span>}
      <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm border border-black/20 bg-white" /> No numbers</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm border-2 border-dashed" style={{ borderColor: MAP_INK }} /> Targeted</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full ring-2 ring-white" style={{ background: MAP_PIN }} /> Town (bigger = more)</span>
    </div>
  );
}

/** One month's ad numbers for a county or town. */
function EntryModal({ entry, defaults, campaigns, onClose, onSaved }) {
  const isEdit = !!entry;
  const src = entry || defaults;
  const text = (n) => (n != null ? String(n) : "");
  const [f, setF] = useState({
    month: src.month, county: src.county || "", town: src.town || "", campaign_id: src.campaign_id || "",
    spend: text(entry?.spend), reach: text(entry?.reach), clicks: text(entry?.clicks), messages: text(entry?.messages), notes: entry?.notes || "",
  });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: typeof v === "string" ? v : v.target.value }));
  const numbers = ["spend", "reach", "clicks", "messages"];
  const hasNumber = numbers.some((k) => f[k] !== "");

  const save = useMutation({
    mutationFn: () => marketingApi.saveGeoStat({
      month: f.month, county: f.county, town: f.town, campaign_id: f.campaign_id || undefined,
      ...Object.fromEntries(numbers.filter((k) => f[k] !== "").map((k) => [k, num(f[k])])),
      notes: f.notes.trim() || undefined,
    }, entry?.id),
    onSuccess: () => { toast.success("Numbers saved"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  const remove = useMutation({
    mutationFn: () => marketingApi.removeGeoStat(entry.id),
    onSuccess: () => { toast.success("Entry deleted"); onSaved(); },
    onError: (e) => toast.error("Delete failed: " + e.message),
  });

  return (
    <Modal title={isEdit ? "Edit numbers" : "Add numbers for a place"} onClose={onClose}
      footer={<>
        <div>{isEdit && <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white"
          onClick={() => { if (confirm("Delete this entry?")) remove.mutate(); }}>Delete</Button>}</div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !f.month || !f.county || !hasNumber} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </>}>
      <p className="text-sm text-muted-foreground">Copy these from your ads manager’s location breakdown. Saving the same month, place and campaign again replaces the earlier entry. Leads and sales are counted from the Leads tab.</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Month *"><Input type="month" value={f.month} onChange={set("month")} /></Field>
        <Field label="Campaign">
          <NativeSelect value={f.campaign_id} onChange={set("campaign_id")}>
            <option value="">Not tied to one campaign</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NativeSelect>
        </Field>
      </div>
      <LocationPicker county={f.county} town={f.town} required emptyTown="Whole county" onChange={(place) => setF((x) => ({ ...x, ...place }))} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Spend (KSh)"><Input type="number" min="0" value={f.spend} onChange={set("spend")} /></Field>
        <Field label="Reach"><Input type="number" min="0" value={f.reach} onChange={set("reach")} /></Field>
        <Field label="Clicks"><Input type="number" min="0" value={f.clicks} onChange={set("clicks")} /></Field>
        <Field label="Chats"><Input type="number" min="0" value={f.messages} onChange={set("messages")} /></Field>
      </div>
      <Field label="Notes"><Input value={f.notes} onChange={set("notes")} /></Field>
    </Modal>
  );
}

/** Names the spot that was clicked on the map and saves it as one of your own pins. */
function PlaceModal({ at, places, onClose, onSaved }) {
  const [name, setName] = useState("");
  const clean = name.replace(/\|/g, "/").trim();
  const taken = places.some((p) => p.county === at.county && p.name.toLowerCase() === clean.toLowerCase());
  const save = useMutation({
    mutationFn: () => base44.entities.MktPlace.create({ name: clean, county: at.county, lat: Math.round(at.lat * 1e5) / 1e5, lng: Math.round(at.lng * 1e5) / 1e5 }),
    onSuccess: () => { toast.success(`${clean} added to the map`); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  return (
    <Modal title="Add a place" onClose={onClose}
      footer={<><div /><div className="flex gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !clean || taken} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
      </div></>}>
      <p className="text-sm text-muted-foreground">This spot is in <span className="font-medium text-obsidian">{at.county}</span> county. Once saved you can pick it on leads, in “Add numbers”, and as a campaign target.</p>
      <Field label="Name *" hint={taken ? `${at.county} already has a place with this name.` : undefined}>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Katani, Greatwall Gardens" maxLength={60} />
      </Field>
    </Modal>
  );
}
