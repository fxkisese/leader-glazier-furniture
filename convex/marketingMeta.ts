// Pulls daily spend / clicks / WhatsApp chats per ad from the Meta Marketing API.
//
// Convex environment variables (Dashboard → Settings → Environment Variables, or `npx convex env set`):
//   META_ACCESS_TOKEN   long-lived System User token with ads_read
//   META_AD_ACCOUNT_ID  e.g. act_1234567890
//   META_API_VERSION    optional, default v23.0
//
// Runs every morning from crons.ts, and on demand from Marketing → Campaigns & Ads → "Sync Meta ads now".
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { nairobiDate } from "./marketing";

const MESSAGE_ACTIONS = [
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.total_messaging_connection",
];

const countMessages = (actions: { action_type: string; value: string }[] = []) => {
  for (const type of MESSAGE_ACTIONS) {
    const hit = actions.find((a) => a.action_type === type);
    if (hit) return Number(hit.value) || 0;
  }
  return 0;
};

const configured = () => !!(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID);

async function sync(ctx: ActionCtx, range: { days?: number; since?: string; until?: string }) {
  const token = process.env.META_ACCESS_TOKEN;
  const account = process.env.META_AD_ACCOUNT_ID;
  const version = process.env.META_API_VERSION || "v23.0";
  if (!token || !account) {
    throw new Error("Meta isn't connected yet. Set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID in the Convex dashboard.");
  }
  // Meta keeps adjusting the last day or two, so the default re-pulls 3 days
  const DAY = 86_400_000;
  const since = range.since || nairobiDate(Date.now() - (Math.max(1, range.days ?? 3) - 1) * DAY);
  const until = range.until || nairobiDate(Date.now());

  const params = new URLSearchParams({
    level: "ad",
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    fields: "campaign_id,campaign_name,ad_id,ad_name,spend,impressions,reach,clicks,actions",
    limit: "500",
    access_token: token,
  });
  let url: string | null = `https://graph.facebook.com/${version}/${account}/insights?${params}`;
  const rows: any[] = [];
  while (url) {
    const res: Response = await fetch(url);
    const data: any = await res.json();
    if (!res.ok) throw new Error(`Meta API error: ${data?.error?.message ?? res.statusText}`);
    rows.push(...(data.data ?? []));
    url = data.paging?.next ?? null;
  }

  const clean = rows.map((r) => ({
    campaign_id: String(r.campaign_id), campaign_name: String(r.campaign_name ?? "Untitled campaign"),
    ad_id: String(r.ad_id), ad_name: String(r.ad_name ?? "Untitled ad"), date: String(r.date_start),
    spend: Number(r.spend) || 0, impressions: Number(r.impressions) || 0, reach: Number(r.reach) || 0,
    clicks: Number(r.clicks) || 0, messages: countMessages(r.actions),
  }));
  let campaigns = 0, ads = 0;
  for (let i = 0; i < clean.length; i += 200) {
    const res = await ctx.runMutation(internal.marketing._applyMetaRows, { rows: clean.slice(i, i + 200) });
    campaigns = Math.max(campaigns, res.campaigns);
    ads += res.ads;
  }
  const linked = await ctx.runMutation(internal.marketing._relinkLeads, {});
  return { since, until, rows: clean.length, campaigns, ads, leads_linked: linked };
}

/** "Sync Meta ads now" button. `days` re-pulls that many days; since/until backfills a range. */
export const syncNow = action({
  args: { token: v.string(), days: v.optional(v.number()), since: v.optional(v.string()), until: v.optional(v.string()) },
  handler: async (ctx, { token, ...range }) => {
    await ctx.runQuery(internal.marketing._checkAccess, { token });
    return await sync(ctx, range);
  },
});

/** Whether the Meta credentials are set, so the screen can say so. */
export const status = action({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await ctx.runQuery(internal.marketing._checkAccess, { token });
    return { meta_connected: configured(), whatsapp_connected: !!(process.env.WHATSAPP_APP_SECRET && process.env.WHATSAPP_VERIFY_TOKEN) };
  },
});

/** Daily scheduled run; quietly does nothing until Meta is connected. */
export const scheduledSync = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!configured()) return null;
    return await sync(ctx, { days: 3 });
  },
});
