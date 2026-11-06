import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("products").order("desc").collect();
  },
});

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("products")
      .withIndex("by_is_published", (q) => q.eq("is_published", true))
      .order("desc")
      .collect();
  },
});

export const listFeatured = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("products")
      .withIndex("by_is_featured", (q) => q.eq("is_featured", true))
      .order("desc")
      .collect();
  },
});

export const listByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    price: v.number(),
    subcategory: v.optional(v.string()),
    discount_price: v.optional(v.number()),
    description: v.optional(v.string()),
    material: v.optional(v.string()),
    dimensions: v.optional(v.string()),
    colors: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    stock_status: v.optional(v.string()),
    label: v.optional(v.string()),
    is_featured: v.optional(v.boolean()),
    is_published: v.optional(v.boolean()),
    whatsapp_message: v.optional(v.string()),
    delivery_note: v.optional(v.string()),
    seating_capacity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("products", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    price: v.optional(v.number()),
    subcategory: v.optional(v.string()),
    discount_price: v.optional(v.number()),
    description: v.optional(v.string()),
    material: v.optional(v.string()),
    dimensions: v.optional(v.string()),
    colors: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    stock_status: v.optional(v.string()),
    label: v.optional(v.string()),
    is_featured: v.optional(v.boolean()),
    is_published: v.optional(v.boolean()),
    whatsapp_message: v.optional(v.string()),
    delivery_note: v.optional(v.string()),
    seating_capacity: v.optional(v.string()),
    // Field names to unset (e.g. removing a sale price)
    clear: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, clear, ...fields } = args;
    const unset = Object.fromEntries((clear ?? []).map((k) => [k, undefined]));
    await ctx.db.patch(id, { ...unset, ...fields });
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
