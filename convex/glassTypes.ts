import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("glass_types").order("desc").collect();
  },
});

export const listAvailable = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("glass_types")
      .filter((q) => q.eq(q.field("is_available"), true))
      .order("desc")
      .collect();
  },
});

export const listByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("glass_types")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("glass_types") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    price_per_sqft: v.number(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    thickness: v.optional(v.string()),
    min_order_sqft: v.optional(v.number()),
    installation_price: v.optional(v.number()),
    frame_price_per_sqft: v.optional(v.number()),
    is_available: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("glass_types", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("glass_types"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    price_per_sqft: v.optional(v.number()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    thickness: v.optional(v.string()),
    min_order_sqft: v.optional(v.number()),
    installation_price: v.optional(v.number()),
    frame_price_per_sqft: v.optional(v.number()),
    is_available: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("glass_types") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
