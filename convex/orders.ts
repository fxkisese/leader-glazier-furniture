// Website orders. Staff with "website" access can view and update them; creating them is left to
// the payment backend (currently not connected — see supabase/functions for the old M-Pesa / Stripe flow).
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAccess } from "./access";
import { orderFields } from "./schema";

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAccess(ctx, token, ["website", "sales"]);
    return await ctx.db.query("orders").order("desc").take(500);
  },
});

const editable = Object.fromEntries(Object.entries(orderFields).map(([k, val]) => [k, (val as any).isOptional === "optional" ? val : v.optional(val as any)]));

export const update = mutation({
  args: { token: v.string(), id: v.id("orders"), ...editable },
  handler: async (ctx, { token, id, ...changes }) => {
    await requireAccess(ctx, token, "website");
    await ctx.db.patch(id, changes as any);
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("orders") },
  handler: async (ctx, { token, id }) => {
    await requireAccess(ctx, token, "website");
    await ctx.db.delete(id);
  },
});
