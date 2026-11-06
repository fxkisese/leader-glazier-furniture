// WhatsApp Cloud API webhook: turns incoming chats into marketing leads, tagged with the ad
// they came from (click-to-WhatsApp ads). Only works if the business number is on the
// WhatsApp Cloud API, not the WhatsApp Business phone app.
//
// Convex environment variables:
//   WHATSAPP_VERIFY_TOKEN  any string; type the same one in Meta's webhook setup
//   WHATSAPP_APP_SECRET    your Meta app secret, used to check each delivery really came from Meta
// Webhook URL for Meta: https://<deployment>.convex.site/whatsapp-webhook  (subscribe to "messages")
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

async function validSignature(raw: string, header: string | null, secret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7);
  // Constant-time comparison
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

// Meta's one-time verification handshake
http.route({
  path: "/whatsapp-webhook",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    const url = new URL(req.url);
    const expected = process.env.WHATSAPP_VERIFY_TOKEN;
    const ok = !!expected && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === expected;
    return ok ? new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 }) : new Response("forbidden", { status: 403 });
  }),
});

http.route({
  path: "/whatsapp-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    // Refuse everything until the app secret is set, so nobody can inject fake leads
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret) return new Response("not configured", { status: 503 });
    const raw = await req.text();
    if (!(await validSignature(raw, req.headers.get("x-hub-signature-256"), secret))) {
      return new Response("bad signature", { status: 401 });
    }
    let body: any;
    try { body = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

    const messages: any[] = [];
    for (const entry of body?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value;
        if (!value?.messages?.length) continue; // delivery/read statuses etc.
        const names = new Map<string, string>((value.contacts ?? []).map((c: any) => [c.wa_id, c.profile?.name]));
        for (const msg of value.messages) {
          if (!msg?.from) continue;
          const ref = msg.referral;
          const fromAd = ref?.source_type === "ad" && ref?.source_id;
          messages.push({
            from: String(msg.from),
            ...(names.get(msg.from) ? { name: String(names.get(msg.from)) } : {}),
            ...(msg.text?.body ? { text: String(msg.text.body) } : {}),
            ...(fromAd ? { ad_id: String(ref.source_id) } : {}),
            ...(ref?.ctwa_clid ? { ctwa_clid: String(ref.ctwa_clid) } : {}),
            ...(ref?.headline ? { headline: String(ref.headline) } : {}),
          });
        }
      }
    }
    const captured = messages.length ? await ctx.runMutation(internal.marketing._captureWhatsApp, { messages }) : 0;
    // Always answer 200 quickly, or Meta retries the delivery
    return new Response(JSON.stringify({ ok: true, captured }), { headers: { "Content-Type": "application/json" } });
  }),
});

export default http;
