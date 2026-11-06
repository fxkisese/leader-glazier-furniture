import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const fields = {
  type: v.optional(v.string()),
  url: v.optional(v.string()),
  poster: v.optional(v.string()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  eyebrow: v.optional(v.string()),
  title: v.optional(v.string()),
  subtitle: v.optional(v.string()),
  order: v.optional(v.number()),
  is_active: v.optional(v.boolean()),
};

// Hero slides in display order
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("hero_media").collect();
    return rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a._creationTime - b._creationTime);
  },
});

export const create = mutation({
  args: { ...fields, type: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("hero_media", { is_active: true, ...args });
  },
});

export const update = mutation({
  args: { id: v.id("hero_media"), ...fields },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("hero_media") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
