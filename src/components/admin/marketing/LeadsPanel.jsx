import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Users, Search, MessageCircle, Reply } from "lucide-react";
import { base44, marketingApi } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, Pill, EmptyState, ErrorState, ListSkeleton, FilterChips, formatDate } from "../adminShared";
import { Field, NativeSelect, Modal, num } from "../businessShared";
import {
  LEAD_SOURCES, LEAD_STATUSES, LOST_REASONS, PRODUCTS, BRANCHES, STATUS_TONE, Options, cap, ksh,
  nairobiDate, nairobiTime, toMs, useRefreshMarketing,
} from "./shared";

const SOURCE_TONE = { meta_ad: "blue", organic_post: "purple", website: "amber", walk_in: "green", referral: "green" };
const waLink = (phone) => `https://wa.me/${phone}`;

export default function LeadsPanel({ from, to }) {
  const refresh = useRefreshMarketing();
  const [status, setStatus] = useState("open");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // { type: "lead" | "won" | "lost", lead? }

  const leads = useQuery({ queryKey: ["mkt", "leads"], queryFn: () => base44.entities.MktLead.list() });
  const campaigns = useQuery({ queryKey: ["mkt", "campaigns"], queryFn: () => base44.entities.MktCampaign.list() });
  const ads = useQuery({ queryKey: ["mkt", "ads"], queryFn: () => base44.entities.MktAd.list() });
  const posts = useQuery({ queryKey: ["mkt", "posts"], queryFn: () => base44.entities.MktPost.list() });

  const update = useMutation({
    mutationFn: ({ id, ...changes }) => base44.entities.MktLead.update(id, changes),
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  });

  const [fromMs, toMs_] = [toMs(from, "00:00"), toMs(to, "23:59") + 59_999];
  const period = useMemo(() => (leads.data || []).filter((l) => l.received_at >= fromMs && l.received_at <= toMs_), [leads.data, fromMs, toMs_]);
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, period.filter((l) => l.status === s).length]));
  const open = period.filter((l) => !["won", "lost"].includes(l.status)).length;
  const q = search.trim().toLowerCase();
  const rows = period.filter((l) =>
    (status === "all" || (status === "open" ? !["won", "lost"].includes(l.status) : l.status === status)) &&
    (!source || l.source_type === source) &&
    (!q || [l.name, l.phone, l.product_interest, l.notes].some((x) => x?.toLowerCase().includes(q))));

  const campaignName = new Map((campaigns.data || []).map((c) => [c.id, c.name]));
  const adName = new Map((ads.data || []).map((a) => [a.id, a.name]));

  const changeStatus = (lead, next) => {
    if (next === "won") return setModal({ type: "won", lead });
    if (next === "lost") return setModal({ type: "lost", lead });
    update.mutate({ id: lead.id, status: next });
  };
  const close = () => setModal(null);
  const saved = () => { refresh(); close(); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <FilterChips value={status} onChange={setStatus}
          options={[{ value: "open", label: "Open", count: open }, ...LEAD_STATUSES.map((s) => ({ value: s, label: cap(s), count: counts[s] })), { value: "all", label: "All", count: period.length }]} />
        <Button className="bg-obsidian hover:bg-obsidian/90 text-white gap-2 shrink-0" onClick={() => setModal({ type: "lead" })}><Plus className="w-4 h-4" /> Add lead</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, product..." className="pl-9" />
        </div>
        <NativeSelect value={source} onChange={setSource} className="sm:w-48"><Options values={LEAD_SOURCES} empty="All sources" /></NativeSelect>
      </div>

      <Panel>
        {leads.isLoading ? <ListSkeleton /> : leads.error ? <ErrorState error={leads.error} onRetry={leads.refetch} /> : rows.length === 0 ? (
          <EmptyState icon={Users} title="No leads here"
            description="Add every enquiry — WhatsApp chats, calls, walk-ins. Website custom-order requests are added automatically." />
        ) : (
          <ul className="divide-y divide-black/5">
            {rows.map((l) => (
              <li key={l.id} className="flex flex-col lg:flex-row lg:items-center gap-3 px-5 py-3 text-sm">
                <button onClick={() => setModal({ type: "lead", lead: l })} className="flex-1 min-w-0 flex items-start gap-4 text-left">
                  <span className="w-24 shrink-0 text-muted-foreground">{formatDate(nairobiDate(l.received_at))}<span className="block text-xs">{nairobiTime(l.received_at)}</span></span>
                  <span className="min-w-0">
                    <span className="font-medium text-obsidian">{l.name || "No name"}</span>
                    {l.phone && <span className="text-muted-foreground"> · {l.phone}</span>}
                    <span className="block text-xs text-muted-foreground truncate">
                      {[l.product_interest && cap(l.product_interest), l.campaign_id && campaignName.get(l.campaign_id), l.ad_id && adName.get(l.ad_id),
                        l.status === "won" && l.sale_amount ? `Sold ${ksh(l.sale_amount)}` : null, l.status === "lost" && l.lost_reason ? `Lost: ${l.lost_reason}` : null,
                        l.notes].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Pill tone={SOURCE_TONE[l.source_type] || "gray"}>{cap(l.source_type)}</Pill>
                  {!l.first_response_at && l.status === "new" && (
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => update.mutate({ id: l.id, status: "contacted" })} title="Mark that you've replied">
                      <Reply className="w-3.5 h-3.5" /> Mark replied
                    </Button>
                  )}
                  {l.phone && (
                    <a href={waLink(l.phone)} target="_blank" rel="noreferrer" title="Open WhatsApp chat" className="p-1.5 rounded hover:bg-emerald-50 text-emerald-700"><MessageCircle className="w-4 h-4" /></a>
                  )}
                  <NativeSelect value={l.status} onChange={(v) => changeStatus(l, v)} className="h-8 py-1 w-32">
                    {LEAD_STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
                  </NativeSelect>
                  <span className="hidden xl:inline"><Pill tone={STATUS_TONE[l.status]}>{cap(l.status)}</Pill></span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {modal?.type === "lead" && (
        <LeadModal lead={modal.lead} campaigns={campaigns.data || []} ads={ads.data || []} posts={posts.data || []} onClose={close} onSaved={saved}
          onWon={() => setModal({ type: "won", lead: modal.lead })} />
      )}
      {modal?.type === "won" && <WonModal lead={modal.lead} onClose={close} onSaved={saved} />}
      {modal?.type === "lost" && <LostModal lead={modal.lead} onClose={close} onSaved={saved} />}
    </div>
  );
}

const OPTIONAL = ["name", "phone", "campaign_id", "ad_id", "post_id", "product_interest", "branch", "quoted_amount", "notes"];

function LeadModal({ lead, campaigns, ads, posts, onClose, onSaved, onWon }) {
  const isEdit = !!lead;
  const src = lead || {};
  const [f, setF] = useState({
    name: src.name || "", phone: src.phone || "", source_type: src.source_type || "whatsapp",
    campaign_id: src.campaign_id || "", ad_id: src.ad_id || "", post_id: src.post_id || "",
    product_interest: src.product_interest || "", branch: src.branch || "",
    date: nairobiDate(src.received_at), time: nairobiTime(src.received_at), status: src.status || "new",
    quoted_amount: src.quoted_amount != null ? String(src.quoted_amount) : "", notes: src.notes || "",
  });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: typeof v === "string" ? v : v.target.value }));
  const campaignAds = ads.filter((a) => !f.campaign_id || a.campaign_id === f.campaign_id);
  const recentPosts = [...posts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);

  const save = useMutation({
    mutationFn: () => {
      const { date, time, ...rest } = f;
      const data = { ...rest, name: f.name.trim(), phone: f.phone.trim(), notes: f.notes.trim(), received_at: toMs(date, time),
        quoted_amount: f.quoted_amount ? num(f.quoted_amount) : undefined };
      OPTIONAL.forEach((k) => { if (data[k] === "" || data[k] === undefined) delete data[k]; });
      if (!isEdit && data.status === "won") data.status = "new"; // won goes through the sale step
      const clear = isEdit ? OPTIONAL.filter((k) => data[k] === undefined && lead[k] !== undefined) : undefined;
      return isEdit ? base44.entities.MktLead.update(lead.id, data, clear) : base44.entities.MktLead.create(data);
    },
    onSuccess: () => { toast.success(isEdit ? "Lead updated" : "Lead added"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  const remove = useMutation({
    mutationFn: () => base44.entities.MktLead.delete(lead.id),
    onSuccess: () => { toast.success("Lead deleted"); onSaved(); },
    onError: (e) => toast.error("Delete failed: " + e.message),
  });

  return (
    <Modal title={isEdit ? "Lead" : "Add lead"} onClose={onClose}
      footer={<>
        <div>{isEdit && <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white"
          onClick={() => { if (confirm("Delete this lead?")) remove.mutate(); }}>Delete</Button>}</div>
        <div className="flex gap-3">
          {isEdit && lead.status !== "won" && <Button variant="outline" onClick={onWon}>Mark won…</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || (!f.name.trim() && !f.phone.trim())} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name"><Input value={f.name} onChange={set("name")} /></Field>
        <Field label="Phone" hint="Used to match WhatsApp chats and sales"><Input value={f.phone} onChange={set("phone")} placeholder="07XX XXX XXX" /></Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Came from *"><NativeSelect value={f.source_type} onChange={set("source_type")}>{LEAD_SOURCES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}</NativeSelect></Field>
        <Field label="Received"><Input type="date" value={f.date} onChange={set("date")} /></Field>
        <Field label="Time"><Input type="time" value={f.time} onChange={set("time")} /></Field>
      </div>
      {(f.source_type === "meta_ad" || f.source_type === "tiktok" || f.source_type === "google" || f.campaign_id) && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Campaign">
            <NativeSelect value={f.campaign_id} onChange={(v) => setF((x) => ({ ...x, campaign_id: v, ad_id: "" }))}>
              <option value="">—</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Ad">
            <NativeSelect value={f.ad_id} onChange={set("ad_id")}><option value="">—</option>{campaignAds.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</NativeSelect>
          </Field>
        </div>
      )}
      {(f.source_type === "organic_post" || f.post_id) && (
        <Field label="Which post">
          <NativeSelect value={f.post_id} onChange={set("post_id")}>
            <option value="">—</option>
            {recentPosts.map((p) => <option key={p.id} value={p.id}>{formatDate(p.date)} · {cap(p.platform)} · {[p.product, p.hook].filter(Boolean).map(cap).join(" / ") || "untagged"}</option>)}
          </NativeSelect>
        </Field>
      )}
      <div className="grid grid-cols-3 gap-4">
        <Field label="Interested in"><NativeSelect value={f.product_interest} onChange={set("product_interest")}><Options values={PRODUCTS} /></NativeSelect></Field>
        <Field label="Branch"><NativeSelect value={f.branch} onChange={set("branch")}><Options values={BRANCHES} /></NativeSelect></Field>
        <Field label="Quoted (KSh)"><Input type="number" value={f.quoted_amount} onChange={set("quoted_amount")} /></Field>
      </div>
      {isEdit && (
        <Field label="Status">
          <NativeSelect value={f.status} onChange={set("status")}>{LEAD_STATUSES.filter((s) => s !== "won" || lead.status === "won").map((s) => <option key={s} value={s}>{cap(s)}</option>)}</NativeSelect>
        </Field>
      )}
      <Field label="Notes"><Input value={f.notes} onChange={set("notes")} /></Field>
    </Modal>
  );
}

/** Won: the sale amount is what turns marketing spend into ROAS. Linking the Sales record keeps it honest. */
function WonModal({ lead, onClose, onSaved }) {
  const sales = useQuery({ queryKey: ["mkt", "sales"], queryFn: marketingApi.sales });
  const [saleId, setSaleId] = useState(lead.sale_id || "");
  const [amount, setAmount] = useState(lead.sale_amount != null ? String(lead.sale_amount) : lead.quoted_amount != null ? String(lead.quoted_amount) : "");
  // Sales with this customer's phone first
  const options = useMemo(() => {
    const all = sales.data || [];
    return [...all.filter((s) => lead.phone && s.customer_phone === lead.phone), ...all.filter((s) => !lead.phone || s.customer_phone !== lead.phone)];
  }, [sales.data, lead.phone]);
  const pick = (id) => {
    setSaleId(id);
    const s = options.find((x) => x.id === id);
    if (s?.amount) setAmount(String(s.amount));
  };
  const save = useMutation({
    mutationFn: () => base44.entities.MktLead.update(lead.id, { status: "won", sale_amount: num(amount), ...(saleId ? { sale_id: saleId } : {}) }, saleId ? undefined : ["sale_id"]),
    onSuccess: () => { toast.success("Marked won"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  return (
    <Modal title={`Mark won — ${lead.name || lead.phone || "lead"}`} onClose={onClose}
      footer={<><div /><div className="flex gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !(num(amount) > 0)} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">{save.isPending ? "Saving..." : "Mark won"}</Button>
      </div></>}>
      <Field label="Matching sale" hint="Pick the sale from Sales & Profit if it's been recorded — matching phone numbers are listed first">
        <NativeSelect value={saleId} onChange={pick}>
          <option value="">{sales.isLoading ? "Loading sales..." : "Not recorded in Sales yet"}</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {lead.phone && s.customer_phone === lead.phone ? "★ " : ""}{formatDate(s.date)} · {s.customer_name || "—"} · {s.product_name || "sale"} · {ksh(s.amount)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Sale amount (KSh) *"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
    </Modal>
  );
}

function LostModal({ lead, onClose, onSaved }) {
  const [reason, setReason] = useState(lead.lost_reason || LOST_REASONS[0]);
  const save = useMutation({
    mutationFn: () => base44.entities.MktLead.update(lead.id, { status: "lost", lost_reason: reason }),
    onSuccess: () => { toast.success("Marked lost"); onSaved(); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });
  return (
    <Modal title={`Mark lost — ${lead.name || lead.phone || "lead"}`} onClose={onClose}
      footer={<><div /><div className="flex gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-obsidian hover:bg-obsidian/90 text-white px-8">Mark lost</Button>
      </div></>}>
      <Field label="Why was it lost?" hint="Shows on the Overview so you can see why sales slip away">
        <NativeSelect value={reason} onChange={setReason}>{LOST_REASONS.map((r) => <option key={r} value={r}>{cap(r)}</option>)}</NativeSelect>
      </Field>
    </Modal>
  );
}
