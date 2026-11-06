import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("reviews").order("desc").collect();
  },
});

export const listFeatured = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("reviews")
      .withIndex("by_is_featured", (q) => q.eq("is_featured", true))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    customer_name: v.string(),
    rating: v.number(),
    comment: v.string(),
    product_type: v.optional(v.string()),
    is_featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reviews", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("reviews"),
    customer_name: v.optional(v.string()),
    rating: v.optional(v.number()),
    comment: v.optional(v.string()),
    product_type: v.optional(v.string()),
    is_featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
