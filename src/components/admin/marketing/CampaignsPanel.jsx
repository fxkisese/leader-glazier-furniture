import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, RefreshCw, Megaphone, PlugZap } from "lucide-react";
import { base44, marketingApi } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, Pill, EmptyState } from "../adminShared";
import { Field, NativeSelect, Modal, num } from "../businessShared";
import {
  AD_PLATFORMS, CAMPAIGN_STATUSES, FORMATS, PRODUCTS, HOOKS, Options, DataTable, SectionTitle,
  cap, ksh, roasText, nairobiDate, useRefreshMarketing,
} from "./shared";

const STATUS_TONE = { active: "green", paused: "amber", ended: "gray" };

export default function CampaignsPanel({ report }) {
  const refresh = useRefreshMarketing();
  const [modal, setModal] = useState(null); // { type: "campaign" | "ad" | "spend", row? }
  const campaigns = useQuery({ queryKey: ["mkt", "campaigns"], queryFn: () => base44.entities.MktCampaign.list() });
  const ads = useQuery({ queryKey: ["mkt", "ads"], queryFn: () => base44.entities.MktAd.list() });
  const status = useQuery({ queryKey: ["mkt", "status"], queryFn: marketingApi.status, staleTime: 5 * 60_000 });

  const sync = useMutation({
    mutationFn: () => marketingApi.syncMeta(7),
    onSuccess: (r) => { toast.success(`Synced ${r.rows} rows (${r.since} → ${r.until})${r.leads_linked ? `, linked ${r.leads_linked} leads` : ""}`); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const tagAd = useMutation({
    mutationFn: ({ id, field, value }) => base44.entities.MktAd.update(id, value ? { [field]: value } : {}, value ? undefined : [field]),
    onSuccess: refresh,
    onError: (e) => toast.error("Couldn't save tag: " + e.message),
  });

  const perf = new Map(report.campaigns.map((c) => [c.campaign_id, c]));
  const campaignName = new Map((campaigns.data || []).map((c) => [c.id, c.name]));
  const close = () => setModal(null);
  const saved = () => { refresh(); close(); };

  return (
    <div className="space-y-6">
      {/* Meta connection */}
      <Panel className="p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-md bg-sky-50 flex items-center justify-center shrink-0"><PlugZap className="w-5 h-5 text-sky-700" /></div>
          <div>
            <p className="font-medium text-obsidian">Meta ads (Facebook & Instagram)</p>
            {status.data?.meta_connected
              ? <p className="text-sm text-muted-foreground">Connected. Spend, clicks and WhatsApp chats sync every morning at 6am; ads appear below for tagging.</p>
              : <p className="text-sm text-muted-foreground">Not connected yet — record spend by hand for now. To sync automatically, add <code className="text-xs bg-muted px-1 rounded">META_ACCESS_TOKEN</code> and <code className="text-xs bg-muted px-1 rounded">META_AD_ACCOUNT_ID</code> in the Convex dashboard.</p>}
          </div>
        </div>
        <Button variant="outline" className="gap-2 shrink-0" disabled={!status.data?.meta_connected || sync.isPending} onClick={() => sync.mutate()}>
          <RefreshCw className={`w-4 h-4 ${sync.isPending ? "animate-spin" : ""}`} /> {sync.isPending ? "Syncing..." : "Sync Meta ads now"}
        </Button>
      </Panel>

      {/* Campaigns */}
      <Panel>
        <SectionTitle title="Campaigns" sub="Numbers are for the selected period"
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" disabled={!campaigns.data?.length} onClick={() => setModal({ type: "spend" })}>
                <Plus className="w-4 h-4" /> Record spend
              </Button>
              <Button size="sm" className="bg-obsidian hover:bg-obsidian/90 text-white gap-1.5" onClick={() => setModal({ type: "campaign" })}>
                <Plus className="w-4 h-4" /> New campaign
              </Button>
            </div>
          } />
        {campaigns.data?.length ? (
          <DataTable
            rows={campaigns.data}
            columns={[
              { key: "name", title: "Campaign", render: (c) => (
                <button onClick={() => setModal({ type: "campaign", row: c })} className="text-left font-medium hover:underline">
                  {c.name}{c.meta_campaign_id && <span className="ml-2 text-[10px] uppercase tracking-wide text-sky-700">synced</span>}
                </button>) },
              { key: "platform", title: "Platform", render: (c) => cap(c.platform) },
              { key: "status", title: "Status", render: (c) => <Pill tone={STATUS_TONE[c.status]}>{cap(c.status)}</Pill> },
              { key: "spend", title: "Spend", num: true, render: (c) => ksh(perf.get(c.id)?.spend ?? 0) },
              { key: "leads", title: "Leads", num: true, render: (c) => perf.get(c.id)?.leads ?? 0 },
              { key: "won", title: "Won", num: true, render: (c) => perf.get(c.id)?.won ?? 0 },
              { key: "revenue", title: "Revenue", num: true, render: (c) => ksh(perf.get(c.id)?.revenue ?? 0) },
              { key: "roas", title: "ROAS", num: true, render: (c) => roasText(perf.get(c.id)?.roas ?? null) },
            ]}
          />
        ) : (
          <EmptyState icon={Megaphone} title="No campaigns yet"
            description="Add the campaigns you run (or connect Meta to pull them in), then record what you spend on each." />
        )}
      </Panel>

      {/* Ads */}
      <Panel>
        <SectionTitle title="Tag your ads" sub="Type, product and hook tell you which kind of content sells. Changes save as you pick."
          action={<Button size="sm" variant="outline" className="gap-1.5" disabled={!campaigns.data?.length} onClick={() => setModal({ type: "ad" })}><Plus className="w-4 h-4" /> Add ad</Button>} />
        <DataTable
          rows={ads.data || []}
          empty="No ads yet. Synced Meta ads appear here automatically; you can also add them by hand."
          rowClass={(a) => (!a.product || !a.hook || !a.creative_type ? "bg-amber-50/50" : "")}
          columns={[
            { key: "name", title: "Ad", render: (a) => (
              <button onClick={() => setModal({ type: "ad", row: a })} className="text-left hover:underline">
                <span className="font-medium">{a.name}</span>
                <span className="block text-xs text-muted-foreground">{campaignName.get(a.campaign_id) || "—"}</span>
              </button>) },
            ...[["creative_type", FORMATS, "Type"], ["product", PRODUCTS, "Product"], ["hook", HOOKS, "Hook"]].map(([field, values, title]) => ({
              key: field, title, render: (a) => (
                <NativeSelect value={a[field] || ""} onChange={(value) => tagAd.mutate({ id: a.id, field, value })} className="h-8 py-1 min-w-[130px]">
                  <Options values={values} />
                </NativeSelect>
              ),
            })),
          ]}
        />
      </Panel>

      <Panel>
        <SectionTitle title="Ad performance" sub="Which individual ads brought enquiries and sales in this period" />
        <DataTable
          rows={report.ads.map((a) => ({ ...a, id: a.ad_id }))}
          empty="No ad spend or ad-linked leads in this period"
          rowClass={(a) => (a.roas != null && a.roas >= 1 ? "bg-emerald-50/60" : "")}
          columns={[
            { key: "name", title: "Ad", render: (a) => <><span className="font-medium">{a.name}</span><span className="block text-xs text-muted-foreground">{a.campaign_name}</span></> },
            { key: "tags", title: "Tags", render: (a) => [a.creative_type, a.product, a.hook].filter(Boolean).map(cap).join(" · ") || "—" },
            { key: "spend", title: "Spend", num: true, render: (a) => ksh(a.spend) },
            { key: "messages", title: "Chats", num: true },
            { key: "leads", title: "Leads", num: true },
            { key: "won", title: "Won", num: true },
            { key: "revenue", title: "Revenue", num: true, render: (a) => ksh(a.revenue) },
            { key: "cpl", title: "Cost/lead", num: true, render: (a) => ksh(a.cost_per_lead) },
            { key: "roas", title: "ROAS", num: true, render: (a) => roasText(a.roas) },
          ]}
        />
      </Panel>

      {modal?.type === "campaign" && <CampaignModal campaign={modal.row} onClose={close} onSaved={saved} />}
      {modal?.type === "ad" && <AdModal ad={modal.row} campaigns={campaigns.data || []} onClose={close} onSaved={saved} />}
      {modal?.type === "spend" && <SpendModal campaigns={campaigns.data || []} onClose={close} onSaved={saved} />}
    </div>
  );
}

function CampaignModal({ campaign, onClose, onSaved }) {
  const isEdit = !!campaign;
  const [f, setF] = useState({
    name: campaign?.name || "", platform: campaign?.platform || "meta", objective: campaign?.objective || "",
    status: campaign?.status || "active", start_date: campaign?.start_date || "", end_date: campaign?.end_date || "",
    daily_budget: campaign?.daily_budget != null ? String(campaign.daily_budget) : "", notes: campaign?.notes || "",
  });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: typeof v === "string" ? v : v.target.value }));
  const optionalKeys = ["objective", "start_date", "end_date", "daily_budget", "notes"];

  const save = useMutation({
    mutationFn: () => {
      const data = { ...f, name: f.name.trim(), daily_budget: f.daily_budget ? num(f.daily_budget) : undefined };
      optionalKeys.forEach((k) => { if (data[k] === "") delete data[k]; });
      const clear = isEdit ? optionalKeys.filter((k) => data[k] === undefined && campaign[k] !== undefined) : undefined;
      return isEdit ? base44.entities.MktCampaign.update(campaign.id, data, clear) : base44.entities.MktCampaign.create(data);
    },
    onSuccess: () => { toast.success(isEdit ? "Campaign updated" : "Campaign added"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  const remove = useMutation({
    mutationFn: () => base44.entities.MktCampaign.delete(campaign.id),
    onSuccess: () => { toast.success("Campaign deleted"); onSaved(); },
    onError: (e) => toast.error("Delete failed: " + e.message),
  });

  return (
    <Modal title={isEdit ? "Edit campaign" : "New campaign"} onClose={onClose}
      footer={<>
        <div>{isEdit && <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white"
          onClick={() => { if (confirm("Delete this campaign, its ads and its spend? Leads stay but lose the link.")) remove.mutate(); }}>Delete</Button>}</div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !f.name.trim()} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </>}>
      <Field label="Name *"><Input value={f.name} onChange={set("name")} placeholder="Sofas — November WhatsApp" /></Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Platform"><NativeSelect value={f.platform} onChange={set("platform")}>{AD_PLATFORMS.map((p) => <option key={p} value={p}>{cap(p)}</option>)}</NativeSelect></Field>
        <Field label="Status"><NativeSelect value={f.status} onChange={set("status")}>{CAMPAIGN_STATUSES.map((p) => <option key={p} value={p}>{cap(p)}</option>)}</NativeSelect></Field>
        <Field label="Daily budget (KSh)"><Input type="number" value={f.daily_budget} onChange={set("daily_budget")} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Objective"><Input value={f.objective} onChange={set("objective")} placeholder="Messages, traffic..." /></Field>
        <Field label="Start"><Input type="date" value={f.start_date} onChange={set("start_date")} /></Field>
        <Field label="End"><Input type="date" value={f.end_date} onChange={set("end_date")} /></Field>
      </div>
      <Field label="Notes"><Input value={f.notes} onChange={set("notes")} /></Field>
    </Modal>
  );
}

function AdModal({ ad, campaigns, onClose, onSaved }) {
  const isEdit = !!ad;
  const [f, setF] = useState({
    campaign_id: ad?.campaign_id || campaigns[0]?.id || "", name: ad?.name || "",
    creative_type: ad?.creative_type || "", product: ad?.product || "", hook: ad?.hook || "",
  });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: typeof v === "string" ? v : v.target.value }));
  const tags = ["creative_type", "product", "hook"];
  const save = useMutation({
    mutationFn: () => {
      const data = { ...f, name: f.name.trim() };
      tags.forEach((k) => { if (!data[k]) delete data[k]; });
      const clear = isEdit ? tags.filter((k) => !data[k] && ad[k]) : undefined;
      return isEdit ? base44.entities.MktAd.update(ad.id, data, clear) : base44.entities.MktAd.create(data);
    },
    onSuccess: () => { toast.success(isEdit ? "Ad updated" : "Ad added"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  const remove = useMutation({
    mutationFn: () => base44.entities.MktAd.delete(ad.id),
    onSuccess: () => { toast.success("Ad deleted"); onSaved(); },
    onError: (e) => toast.error("Delete failed: " + e.message),
  });
  return (
    <Modal title={isEdit ? "Edit ad" : "Add ad"} onClose={onClose}
      footer={<>
        <div>{isEdit && !ad.meta_ad_id && <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white"
          onClick={() => { if (confirm("Delete this ad?")) remove.mutate(); }}>Delete</Button>}</div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !f.name.trim() || !f.campaign_id} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </>}>
      <Field label="Campaign *"><NativeSelect value={f.campaign_id} onChange={set("campaign_id")}>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect></Field>
      <Field label="Ad name *"><Input value={f.name} onChange={set("name")} placeholder="Chesterfield build video" disabled={!!ad?.meta_ad_id} /></Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Type"><NativeSelect value={f.creative_type} onChange={set("creative_type")}><Options values={FORMATS} /></NativeSelect></Field>
        <Field label="Product"><NativeSelect value={f.product} onChange={set("product")}><Options values={PRODUCTS} /></NativeSelect></Field>
        <Field label="Hook"><NativeSelect value={f.hook} onChange={set("hook")}><Options values={HOOKS} /></NativeSelect></Field>
      </div>
    </Modal>
  );
}

/** Manual spend for campaigns that aren't synced (TikTok, Google, or Meta before connecting). */
function SpendModal({ campaigns, onClose, onSaved }) {
  const [f, setF] = useState({ campaign_id: campaigns[0]?.id || "", date: nairobiDate(), spend: "", clicks: "", messages: "", impressions: "" });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: typeof v === "string" ? v : v.target.value }));
  const save = useMutation({
    mutationFn: () => base44.entities.MktSpend.create({
      campaign_id: f.campaign_id, ad_key: "", date: f.date, spend: num(f.spend), source: "manual",
      ...(f.clicks ? { clicks: num(f.clicks) } : {}), ...(f.messages ? { messages: num(f.messages) } : {}), ...(f.impressions ? { impressions: num(f.impressions) } : {}),
    }),
    onSuccess: () => { toast.success("Spend recorded"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  return (
    <Modal title="Record ad spend" onClose={onClose}
      footer={<><div /><div className="flex gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !f.campaign_id || !(num(f.spend) > 0)} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
      </div></>}>
      <p className="text-sm text-muted-foreground">One entry per campaign per day — entering the same day again replaces it. You can also enter a whole week or month as one entry dated its last day.</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Campaign *"><NativeSelect value={f.campaign_id} onChange={set("campaign_id")}>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect></Field>
        <Field label="Date *"><Input type="date" value={f.date} onChange={set("date")} /></Field>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Field label="Spend (KSh) *"><Input type="number" value={f.spend} onChange={set("spend")} /></Field>
        <Field label="Chats"><Input type="number" value={f.messages} onChange={set("messages")} /></Field>
        <Field label="Clicks"><Input type="number" value={f.clicks} onChange={set("clicks")} /></Field>
        <Field label="Impressions"><Input type="number" value={f.impressions} onChange={set("impressions")} /></Field>
      </div>
    </Modal>
  );
}
