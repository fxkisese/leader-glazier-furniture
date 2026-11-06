// Marketing: campaigns, ads, ad spend, posts, leads and the reports that tie them to real sales.
// Ported from the Supabase "marketing tracker" module; the SQL report functions live in `report`.
import { query, mutation, internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { crud, requireAccess } from "./access";
import { can } from "./permissions";
import {
  mktCampaignFields, mktAdFields, mktSpendFields, mktPostFields, mktLeadFields, mktTeamFields,
} from "./schema";

const M = "marketing" as const;
const DAY = 86_400_000;
const NAIROBI = 3 * 3_600_000; // UTC+3, no daylight saving
const OPEN_LEAD_DAYS = 30; // one person = one lead while it's still open

// ── Helpers ──

/** YYYY-MM-DD in Nairobi for a timestamp. */
export const nairobiDate = (ms: number) => new Date(ms + NAIROBI).toISOString().slice(0, 10);
const dayStart = (date: string) => Date.parse(`${date}T00:00:00+03:00`);
const dayEnd = (date: string) => Date.parse(`${date}T23:59:59.999+03:00`);

/** Kenyan numbers in one shape (2547XXXXXXXX) so a WhatsApp chat and a form entry match. */
export function normalizePhone(raw?: string | null) {
  const d = (raw || "").replace(/\D/g, "");
  if (!d) return undefined;
  if (d.startsWith("254")) return d;
  if (d.startsWith("0") && d.length === 10) return "254" + d.slice(1);
  if (d.length === 9 && /^[17]/.test(d)) return "254" + d;
  return d;
}

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;
const ratio = (a: number, b: number, dp = 2) => (b ? round(a / b, dp) : null);
const sum = <T>(rows: T[], f: (r: T) => number | undefined) => rows.reduce((t, r) => t + (Number(f(r)) || 0), 0);

/** Fills in what a lead implies: its ad and campaign from a Meta ad id, its source, and timestamps. */
async function fillLead(ctx: QueryCtx, lead: any, before?: Doc<"mkt_leads">) {
  const out = { ...lead };
  if (out.phone !== undefined) out.phone = normalizePhone(out.phone);
  if (!out.ad_id && out.meta_ad_id) {
    const ad = await ctx.db.query("mkt_ads").withIndex("by_meta_id", (q) => q.eq("meta_ad_id", out.meta_ad_id)).first();
    if (ad) out.ad_id = ad._id;
  }
  if (out.ad_id && !out.campaign_id) out.campaign_id = (await ctx.db.get(out.ad_id as Id<"mkt_ads">))?.campaign_id;
  if (out.campaign_id && ["other", "whatsapp"].includes(out.source_type)) out.source_type = "meta_ad";
  if (out.post_id && out.source_type === "other") out.source_type = "organic_post";
  if (out.status && out.status !== "new" && !out.first_response_at && !before?.first_response_at) out.first_response_at = Date.now();
  if (out.status === "won" && !out.converted_at && !before?.converted_at) out.converted_at = Date.now();
  return out;
}

async function openLeadFor(ctx: QueryCtx, phone?: string) {
  if (!phone) return null;
  const since = Date.now() - OPEN_LEAD_DAYS * DAY;
  const rows = await ctx.db.query("mkt_leads").withIndex("by_phone", (q) => q.eq("phone", phone)).collect();
  return rows
    .filter((l) => !["won", "lost"].includes(l.status) && l.received_at >= since)
    .sort((a, b) => b.received_at - a.received_at)[0] ?? null;
}

// ── Campaigns, ads, spend, posts, team: standard CRUD behind the "marketing" permission ──

const campaigns = crud("mkt_campaigns", M, mktCampaignFields);
export const listCampaigns = campaigns.list, createCampaign = campaigns.create, updateCampaign = campaigns.update;

/** Deleting a campaign also deletes its ads and spend; leads keep their details but lose the link. */
export const removeCampaign = mutation({
  args: { token: v.string(), id: v.id("mkt_campaigns") },
  handler: async (ctx, { token, id }) => {
    await requireAccess(ctx, token, M);
    for (const ad of await ctx.db.query("mkt_ads").withIndex("by_campaign", (q) => q.eq("campaign_id", id)).collect()) {
      await ctx.db.delete(ad._id);
    }
    for (const s of (await ctx.db.query("mkt_ad_spend").collect()).filter((s) => s.campaign_id === id)) await ctx.db.delete(s._id);
    for (const l of (await ctx.db.query("mkt_leads").collect()).filter((l) => l.campaign_id === id)) {
      await ctx.db.patch(l._id, { campaign_id: undefined, ad_id: undefined });
    }
    await ctx.db.delete(id);
  },
});

const ads = crud("mkt_ads", M, mktAdFields);
export const listAds = ads.list, createAd = ads.create, updateAd = ads.update;

export const removeAd = mutation({
  args: { token: v.string(), id: v.id("mkt_ads") },
  handler: async (ctx, { token, id }) => {
    await requireAccess(ctx, token, M);
    for (const s of (await ctx.db.query("mkt_ad_spend").collect()).filter((s) => s.ad_id === id)) await ctx.db.patch(s._id, { ad_id: undefined });
    for (const l of (await ctx.db.query("mkt_leads").collect()).filter((l) => l.ad_id === id)) await ctx.db.patch(l._id, { ad_id: undefined });
    await ctx.db.delete(id);
  },
});

export const { list: listSpend, update: updateSpend, remove: removeSpend } = crud("mkt_ad_spend", M, mktSpendFields);

/** Manual spend is one row per campaign per day; entering the same day again replaces it. */
export const createSpend = mutation({
  args: { token: v.string(), ...mktSpendFields },
  handler: async (ctx, { token, ...row }) => {
    await requireAccess(ctx, token, M);
    const existing = await ctx.db.query("mkt_ad_spend")
      .withIndex("by_key", (q) => q.eq("campaign_id", row.campaign_id).eq("ad_key", row.ad_key).eq("date", row.date)).unique();
    if (existing) {
      await ctx.db.patch(existing._id, row);
      return existing._id;
    }
    return await ctx.db.insert("mkt_ad_spend", row);
  },
});

export const { list: listPosts, create: createPost, update: updatePost, remove: removePost } = crud("mkt_posts", M, mktPostFields);

export const { list: listTeam, update: updateTeam, remove: removeTeam } = crud("mkt_team", M, mktTeamFields);

export const createTeam = mutation({
  args: { token: v.string(), ...mktTeamFields },
  handler: async (ctx, { token, ...row }) => {
    await requireAccess(ctx, token, M);
    const existing = await ctx.db.query("mkt_team").withIndex("by_employee", (q) => q.eq("employee_id", row.employee_id)).first();
    if (existing) throw new Error("That person is already on the marketing team.");
    return await ctx.db.insert("mkt_team", row);
  },
});

// ── Leads ──

export const listLeads = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAccess(ctx, token, M);
    return await ctx.db.query("mkt_leads").withIndex("by_received").order("desc").collect();
  },
});

const leadInput = { ...mktLeadFields, status: v.optional(v.string()), received_at: v.optional(v.number()) };

export const createLead = mutation({
  args: { token: v.string(), ...leadInput },
  handler: async (ctx, { token, ...lead }) => {
    await requireAccess(ctx, token, M);
    const row = await fillLead(ctx, { status: "new", received_at: Date.now(), ...lead });
    return await ctx.db.insert("mkt_leads", row);
  },
});

const optional = (fields: Record<string, any>) =>
  Object.fromEntries(Object.entries(fields).map(([k, val]) => [k, val.isOptional === "optional" ? val : v.optional(val)]));

export const updateLead = mutation({
  args: { token: v.string(), id: v.id("mkt_leads"), clear: v.optional(v.array(v.string())), ...optional(mktLeadFields) },
  handler: async (ctx, { token, id, clear, ...changes }) => {
    await requireAccess(ctx, token, M);
    const before = await ctx.db.get(id);
    if (!before) throw new Error("This lead no longer exists.");
    const unset = Object.fromEntries((clear ?? []).map((k) => [k, undefined]));
    const merged = await fillLead(ctx, { ...before, ...unset, ...changes }, before);
    const { _id, _creationTime, ...patch } = merged;
    await ctx.db.patch(id, patch);
    return await ctx.db.get(id);
  },
});

export const removeLead = mutation({
  args: { token: v.string(), id: v.id("mkt_leads") },
  handler: async (ctx, { token, id }) => {
    await requireAccess(ctx, token, M);
    await ctx.db.delete(id);
  },
});

/**
 * A website enquiry becomes a lead (called from public forms, e.g. custom order requests).
 * Skipped when the same phone already has an open lead, so one customer stays one lead.
 */
export async function recordWebsiteLead(
  ctx: MutationCtx,
  lead: { name?: string; phone?: string; product_interest?: string; notes?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string },
) {
  const phone = normalizePhone(lead.phone);
  if (!phone || (await openLeadFor(ctx, phone))) return null;
  const clip = (s?: string, n = 120) => (s ? s.slice(0, n) : undefined);
  return await ctx.db.insert("mkt_leads", {
    name: clip(lead.name), phone, source_type: "website", status: "new", received_at: Date.now(),
    product_interest: clip(lead.product_interest), notes: clip(lead.notes, 300),
    utm_source: clip(lead.utm_source, 60), utm_medium: clip(lead.utm_medium, 60), utm_campaign: clip(lead.utm_campaign, 120),
  });
}

// ── Daily check-in (inbox / website / replied to everyone) ──

export const listCheckins = query({
  args: { token: v.string(), date: v.string() },
  handler: async (ctx, { token, date }) => {
    await requireAccess(ctx, token, M);
    return (await ctx.db.query("mkt_checkins").collect()).filter((c) => c.date === date);
  },
});

export const setCheckin = mutation({
  args: {
    token: v.string(), employee_id: v.string(), date: v.string(),
    checked_meta_inbox: v.optional(v.boolean()), checked_website: v.optional(v.boolean()), replied_all: v.optional(v.boolean()),
  },
  handler: async (ctx, { token, employee_id, date, ...flags }) => {
    await requireAccess(ctx, token, M);
    const existing = await ctx.db.query("mkt_checkins")
      .withIndex("by_employee_date", (q) => q.eq("employee_id", employee_id).eq("date", date)).unique();
    if (existing) return await ctx.db.patch(existing._id, flags);
    await ctx.db.insert("mkt_checkins", {
      employee_id, date, checked_meta_inbox: false, checked_website: false, replied_all: false, ...flags,
    });
  },
});

// ── Pickers: just enough of other modules for the marketing screens ──

export const employeeOptions = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAccess(ctx, token, M);
    return (await ctx.db.query("employees").collect())
      .filter((e) => e.status !== "left")
      .map((e) => ({ _id: e._id, name: e.name, position: e.position }));
  },
});

/** Recent sales to link a won lead to (no costs or profit). */
export const saleOptions = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAccess(ctx, token, M);
    const since = nairobiDate(Date.now() - 120 * DAY);
    return (await ctx.db.query("sales").order("desc").collect())
      .filter((s) => (s.date || nairobiDate(s._creationTime)) >= since)
      .map((s) => ({
        _id: s._id, date: s.date || nairobiDate(s._creationTime), amount: s.amount ?? 0,
        product_name: s.product_name, customer_name: s.customer_name, customer_phone: normalizePhone(s.customer_phone),
      }));
  },
});

// ── Reports ──

/**
 * Everything the Overview needs for a period, in one call. Revenue is the sale amount of leads
 * marked won, counted by when the lead came in. Staff pay comes from paid payslips of the
 * marketing team; other costs are Expenses filed under "marketing".
 */
export const report = query({
  args: { token: v.string(), from: v.string(), to: v.string() },
  handler: async (ctx, { token, from, to }) => {
    const me = await requireAccess(ctx, token, M);
    const showPay = can(me.role, "costs") || can(me.role, "hr");
    const [fromMs, toMs] = [dayStart(from), dayEnd(to)];

    const spend = await ctx.db.query("mkt_ad_spend").withIndex("by_date", (q) => q.gte("date", from).lte("date", to)).collect();
    const posts = await ctx.db.query("mkt_posts").withIndex("by_date", (q) => q.gte("date", from).lte("date", to)).collect();
    const leads = await ctx.db.query("mkt_leads").withIndex("by_received", (q) => q.gte("received_at", fromMs).lte("received_at", toMs)).collect();
    const allCampaigns = await ctx.db.query("mkt_campaigns").collect();
    const allAds = await ctx.db.query("mkt_ads").collect();
    const team = (await ctx.db.query("mkt_team").collect()).filter((t) => t.active);
    const employees = new Map((await ctx.db.query("employees").collect()).map((e) => [e._id as string, e]));
    const expenses = (await ctx.db.query("expenses").withIndex("by_category", (q) => q.eq("category", "marketing")).collect())
      .filter((e) => { const d = e.date || nairobiDate(e._creationTime); return d >= from && d <= to; });

    // Payslips for the months the period touches
    const months: string[] = [];
    for (let m = from.slice(0, 7); m <= to.slice(0, 7);) {
      months.push(m);
      const [y, mo] = m.split("-").map(Number);
      m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
    }
    const teamIds = new Set(team.map((t) => t.employee_id));
    const payslips = (await Promise.all(months.map((month) =>
      ctx.db.query("payslips").withIndex("by_month", (q) => q.eq("month", month)).collect()))).flat()
      .filter((p) => teamIds.has(p.employee_id));

    const isWon = (l: Doc<"mkt_leads">) => l.status === "won";
    const won = leads.filter(isWon);
    const adSpend = sum(spend, (s) => s.spend);
    const boostSpend = sum(posts, (p) => p.boost_cost);
    const staffPay = sum(payslips, (p) => p.gross);
    const otherCosts = sum(expenses, (e) => e.amount);
    const totalCost = adSpend + boostSpend + staffPay + otherCosts;
    const revenue = sum(won, (l) => l.sale_amount);
    const responded = leads.filter((l) => l.first_response_at);

    const summary = {
      ad_spend: round(adSpend), boost_spend: round(boostSpend), staff_pay: round(staffPay), other_costs: round(otherCosts),
      total_cost: round(totalCost), leads: leads.length, won: won.length, revenue: round(revenue),
      cost_per_lead: ratio(totalCost, leads.length), cost_per_sale: ratio(totalCost, won.length),
      roas: ratio(revenue, totalCost), conversion_rate: leads.length ? round((won.length / leads.length) * 100, 1) : null,
      avg_order: ratio(revenue, won.length), posts: posts.length,
      avg_response_minutes: responded.length
        ? Math.round(sum(responded, (l) => (l.first_response_at! - l.received_at) / 60_000) / responded.length) : null,
    };

    // Lead totals grouped by any key
    const leadStats = (key: (l: Doc<"mkt_leads">) => string | undefined) => {
      const m = new Map<string, { n: number; w: number; r: number }>();
      for (const l of leads) {
        const k = key(l);
        if (!k) continue;
        const s = m.get(k) ?? { n: 0, w: 0, r: 0 };
        s.n++;
        if (isWon(l)) { s.w++; s.r += l.sale_amount || 0; }
        m.set(k, s);
      }
      return m;
    };
    const spendBy = (key: (s: Doc<"mkt_ad_spend">) => string | undefined) => {
      const m = new Map<string, { spend: number; impressions: number; clicks: number; messages: number }>();
      for (const s of spend) {
        const k = key(s);
        if (!k) continue;
        const t = m.get(k) ?? { spend: 0, impressions: 0, clicks: 0, messages: 0 };
        t.spend += s.spend; t.impressions += s.impressions || 0; t.clicks += s.clicks || 0; t.messages += s.messages || 0;
        m.set(k, t);
      }
      return m;
    };
    const perf = (sp: { spend: number } | undefined, ld: { n: number; w: number; r: number } | undefined) => {
      const s = sp?.spend ?? 0, n = ld?.n ?? 0, w = ld?.w ?? 0, r = ld?.r ?? 0;
      return {
        spend: round(s), leads: n, won: w, revenue: round(r),
        cost_per_lead: ratio(s, n), cost_per_sale: ratio(s, w), roas: ratio(r, s),
        conversion_rate: n ? round((w / n) * 100, 1) : null,
      };
    };
    const byRevenue = (a: any, b: any) => b.revenue - a.revenue || b.spend - a.spend;

    const campSpend = spendBy((s) => s.campaign_id), campLeads = leadStats((l) => l.campaign_id);
    const campaignRows = allCampaigns
      .filter((c) => campSpend.has(c._id) || campLeads.has(c._id))
      .map((c) => {
        const sp = campSpend.get(c._id);
        return {
          campaign_id: c._id, name: c.name, platform: c.platform, status: c.status,
          impressions: sp?.impressions ?? 0, clicks: sp?.clicks ?? 0, messages: sp?.messages ?? 0, ...perf(sp, campLeads.get(c._id)),
        };
      })
      .sort(byRevenue);

    const campaignName = new Map(allCampaigns.map((c) => [c._id as string, c.name]));
    const adSpendMap = spendBy((s) => s.ad_id), adLeads = leadStats((l) => l.ad_id);
    const activeAds = allAds.filter((a) => adSpendMap.has(a._id) || adLeads.has(a._id));
    const adRows = activeAds
      .map((a) => {
        const sp = adSpendMap.get(a._id);
        return {
          ad_id: a._id, name: a.name, campaign_name: campaignName.get(a.campaign_id) ?? "—",
          creative_type: a.creative_type, product: a.product, hook: a.hook,
          clicks: sp?.clicks ?? 0, messages: sp?.messages ?? 0, ...perf(sp, adLeads.get(a._id)),
        };
      })
      .sort(byRevenue);

    // What content works: posts and ads grouped by format / product / hook / platform
    const postLeads = leadStats((l) => l.post_id);
    const campaignPlatform = new Map(allCampaigns.map((c) => [c._id as string, c.platform]));
    const items = [
      ...posts.map((p) => ({ format: p.format, product: p.product, hook: p.hook, platform: p.platform, cost: p.boost_cost || 0, ld: postLeads.get(p._id) })),
      ...activeAds.map((a) => ({
        format: a.creative_type, product: a.product, hook: a.hook, platform: campaignPlatform.get(a.campaign_id),
        cost: adSpendMap.get(a._id)?.spend ?? 0, ld: adLeads.get(a._id),
      })),
    ];
    const content: Record<string, { value: string; items: number; leads: number; won: number; revenue: number; spend: number }[]> = {};
    for (const dim of ["format", "product", "hook", "platform"] as const) {
      const m = new Map<string, { value: string; items: number; leads: number; won: number; revenue: number; spend: number }>();
      for (const it of items) {
        const value = (it as any)[dim] || "untagged";
        const g = m.get(value) ?? { value, items: 0, leads: 0, won: 0, revenue: 0, spend: 0 };
        g.items++; g.leads += it.ld?.n ?? 0; g.won += it.ld?.w ?? 0; g.revenue += it.ld?.r ?? 0; g.spend += it.cost;
        m.set(value, g);
      }
      content[dim] = [...m.values()].map((g) => ({ ...g, revenue: round(g.revenue), spend: round(g.spend) })).sort((a, b) => b.leads - a.leads);
    }

    const sources = [...leadStats((l) => l.source_type)]
      .map(([source_type, s]) => ({ source_type, leads: s.n, won: s.w, revenue: round(s.r), conversion_rate: round((s.w / s.n) * 100, 1) }))
      .sort((a, b) => b.leads - a.leads);

    // Best days/hours for enquiries, Nairobi time: hours[dow][hour]
    const hours = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const l of leads) {
      const d = new Date(l.received_at + NAIROBI);
      hours[d.getUTCDay()][d.getUTCHours()]++;
    }
    const lostReasons = [...leadStats((l) => (l.status === "lost" ? l.lost_reason || "no reason given" : undefined))]
      .map(([reason, s]) => ({ reason, leads: s.n })).sort((a, b) => b.leads - a.leads);

    // Posting target vs actual, per team member per day (up to today)
    const lastDay = [to, nairobiDate(Date.now())].sort()[0];
    const days: string[] = [];
    for (let t = dayStart(from); t <= dayStart(lastDay); t += DAY) days.push(nairobiDate(t));
    const checkins = (await ctx.db.query("mkt_checkins").collect()).filter((c) => c.date >= from && c.date <= lastDay);
    const posted = new Map<string, number>();
    for (const p of posts) if (p.employee_id) posted.set(`${p.employee_id}|${p.date}`, (posted.get(`${p.employee_id}|${p.date}`) ?? 0) + 1);
    const checkedIn = new Set(checkins.filter((c) => c.checked_meta_inbox && c.replied_all).map((c) => `${c.employee_id}|${c.date}`));

    const people = team.map((t) => {
      const e = employees.get(t.employee_id);
      const daily = days.map((day) => {
        const n = posted.get(`${t.employee_id}|${day}`) ?? 0;
        return { day, posted: n, met: n >= t.daily_post_target, checked_in: checkedIn.has(`${t.employee_id}|${day}`) };
      });
      const totalPosts = sum(daily, (d) => d.posted);
      const paid = sum(payslips.filter((p) => p.employee_id === t.employee_id), (p) => p.gross);
      return {
        team_id: t._id, employee_id: t.employee_id, name: e?.name ?? "(removed from Staff & Payroll)", target: t.daily_post_target,
        posts: totalPosts, days: daily.length, days_met: daily.filter((d) => d.met).length,
        days_checked_in: daily.filter((d) => d.checked_in).length, daily,
        ...(showPay ? {
          pay_type: e?.pay_type, paid: round(paid), cost_per_post: ratio(paid, totalPosts),
          expected_pay: e?.pay_type === "monthly" && e.pay_rate ? round(e.pay_rate * months.length) : null,
        } : {}),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return {
      from, to, show_pay: showPay, summary, campaigns: campaignRows, ads: adRows, content, sources, hours,
      lost_reasons: lostReasons, people,
      untagged_ads: allAds.filter((a) => !a.product || !a.hook || !a.creative_type).length,
    };
  },
});

// ── Meta ads sync (called by marketingMeta.ts) ──

export const _checkAccess = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => { await requireAccess(ctx, token, M); },
});

/** Saves one batch of Meta insights rows: campaigns and ads by Meta id, spend by ad + day. */
export const _applyMetaRows = internalMutation({
  args: {
    rows: v.array(v.object({
      campaign_id: v.string(), campaign_name: v.string(), ad_id: v.string(), ad_name: v.string(), date: v.string(),
      spend: v.number(), impressions: v.number(), reach: v.number(), clicks: v.number(), messages: v.number(),
    })),
  },
  handler: async (ctx, { rows }) => {
    const campaignIds = new Map<string, Id<"mkt_campaigns">>();
    const adIds = new Map<string, Id<"mkt_ads">>();
    for (const r of rows) {
      let cid = campaignIds.get(r.campaign_id);
      if (!cid) {
        const c = await ctx.db.query("mkt_campaigns").withIndex("by_meta_id", (q) => q.eq("meta_campaign_id", r.campaign_id)).first();
        // Only the name comes from Meta; your status and notes stay as you set them
        if (c) { cid = c._id; if (c.name !== r.campaign_name) await ctx.db.patch(c._id, { name: r.campaign_name }); }
        else cid = await ctx.db.insert("mkt_campaigns", { platform: "meta", name: r.campaign_name, meta_campaign_id: r.campaign_id, status: "active" });
        campaignIds.set(r.campaign_id, cid);
      }
      let aid = adIds.get(r.ad_id);
      if (!aid) {
        const a = await ctx.db.query("mkt_ads").withIndex("by_meta_id", (q) => q.eq("meta_ad_id", r.ad_id)).first();
        // Your product / hook / type tags stay
        if (a) { aid = a._id; if (a.name !== r.ad_name || a.campaign_id !== cid) await ctx.db.patch(a._id, { name: r.ad_name, campaign_id: cid }); }
        else aid = await ctx.db.insert("mkt_ads", { campaign_id: cid, meta_ad_id: r.ad_id, name: r.ad_name });
        adIds.set(r.ad_id, aid);
      }
      const row = {
        campaign_id: cid, ad_id: aid, ad_key: r.ad_id, date: r.date, spend: r.spend,
        impressions: r.impressions, reach: r.reach, clicks: r.clicks, messages: r.messages, source: "meta_api",
      };
      const existing = await ctx.db.query("mkt_ad_spend")
        .withIndex("by_key", (q) => q.eq("campaign_id", cid!).eq("ad_key", r.ad_id).eq("date", r.date)).unique();
      if (existing) await ctx.db.patch(existing._id, row);
      else await ctx.db.insert("mkt_ad_spend", row);
    }
    return { campaigns: campaignIds.size, ads: adIds.size };
  },
});

/** Leads that arrived (e.g. from WhatsApp) before their ad was synced get linked now. */
export const _relinkLeads = internalMutation({
  args: {},
  handler: async (ctx) => {
    let linked = 0;
    for (const l of (await ctx.db.query("mkt_leads").collect()).filter((l) => l.meta_ad_id && !l.ad_id)) {
      const filled = await fillLead(ctx, l, l);
      if (filled.ad_id) {
        await ctx.db.patch(l._id, { ad_id: filled.ad_id, campaign_id: filled.campaign_id, source_type: filled.source_type });
        linked++;
      }
    }
    return linked;
  },
});

// ── WhatsApp (called by http.ts) ──

/**
 * For each incoming WhatsApp message: create a lead, or attach the ad to the customer's open lead.
 * Click-to-WhatsApp ads send the ad id in `referral`, which tags the lead with the exact ad.
 */
export const _captureWhatsApp = internalMutation({
  args: {
    messages: v.array(v.object({
      from: v.string(), name: v.optional(v.string()), text: v.optional(v.string()),
      ad_id: v.optional(v.string()), ctwa_clid: v.optional(v.string()), headline: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { messages }) => {
    let captured = 0;
    for (const m of messages) {
      const phone = normalizePhone(m.from);
      const open = await openLeadFor(ctx, phone);
      if (open) {
        // Already a lead: only update if this message tells us which ad brought them
        if (m.ad_id && !open.meta_ad_id) {
          const { _id, _creationTime, ...patch } = await fillLead(ctx, {
            ...open, meta_ad_id: m.ad_id, ctwa_clid: m.ctwa_clid, referral_headline: m.headline?.slice(0, 200), source_type: "meta_ad",
          }, open);
          await ctx.db.patch(open._id, patch);
          captured++;
        }
        continue;
      }
      const { _id, _creationTime, ...row } = await fillLead(ctx, {
        name: m.name?.slice(0, 120), phone, source_type: m.ad_id ? "meta_ad" : "whatsapp", status: "new", received_at: Date.now(),
        meta_ad_id: m.ad_id, ctwa_clid: m.ctwa_clid, referral_headline: m.headline?.slice(0, 200),
        notes: m.text ? `First message: ${m.text.slice(0, 300)}` : undefined,
      });
      await ctx.db.insert("mkt_leads", row);
      captured++;
    }
    return captured;
  },
});
