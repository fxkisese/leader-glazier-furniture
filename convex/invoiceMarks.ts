import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAccess } from "./access";

// Stamp, signature and signer name for PDF invoices, shared by every device staff sign in on.
// Kept as data in the database (not file storage), so they never sit at a public URL.

const MODULES = ["sales", "website"] as const; // whoever can open an invoice
const KINDS = ["stamp", "signature", "signer"];
const MAX_CHARS = 900_000; // Convex documents max out at 1 MB

export const get = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAccess(ctx, token, [...MODULES]);
    const rows = await ctx.db.query("invoice_marks").collect();
    const by = Object.fromEntries(rows.map((r) => [r.kind, r]));
    const asset = (kind: string) => (by[kind] ? { data: by[kind].data, w: by[kind].w ?? 0, h: by[kind].h ?? 0 } : null);
    return { stamp: asset("stamp"), signature: asset("signature"), signer: by.signer?.data ?? "" };
  },
});

/** Save one mark. Pass no `data` (or an empty signer) to remove it. */
export const set = mutation({
  args: { token: v.string(), kind: v.string(), data: v.optional(v.string()), w: v.optional(v.number()), h: v.optional(v.number()) },
  handler: async (ctx, { token, kind, data, w, h }) => {
    await requireAccess(ctx, token, [...MODULES]);
    if (!KINDS.includes(kind)) throw new Error("Unknown invoice mark");
    if (data && data.length > MAX_CHARS) throw new Error("That image is too large - try a smaller or tighter photo");
    if (data && kind !== "signer" && !data.startsWith("data:image/")) throw new Error("Not an image");

    const existing = await ctx.db.query("invoice_marks").withIndex("by_kind", (q) => q.eq("kind", kind)).collect();
    for (const row of existing.slice(1)) await ctx.db.delete(row._id); // tidy any duplicates
    const row = existing[0];
    if (!data) {
      if (row) await ctx.db.delete(row._id);
      return;
    }
    if (row) await ctx.db.patch(row._id, { data, w, h });
    else await ctx.db.insert("invoice_marks", { kind, data, w, h });
  },
});
