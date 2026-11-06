import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("quote_requests").order("desc").collect();
  },
});

export const listByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quote_requests")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    glass_type_name: v.string(),
    width: v.number(),
    height: v.number(),
    unit: v.string(),
    estimated_total: v.number(),
    customer_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    glass_type_id: v.optional(v.string()),
    area_sqft: v.optional(v.number()),
    quantity: v.optional(v.number()),
    include_installation: v.optional(v.boolean()),
    include_frame: v.optional(v.boolean()),
    include_delivery: v.optional(v.boolean()),
    delivery_location: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quote_requests", { status: "new", ...args });
  },
});

export const update = mutation({
  args: {
    id: v.id("quote_requests"),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    customer_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    glass_type_name: v.optional(v.string()),
    glass_type_id: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    unit: v.optional(v.string()),
    area_sqft: v.optional(v.number()),
    quantity: v.optional(v.number()),
    include_installation: v.optional(v.boolean()),
    include_frame: v.optional(v.boolean()),
    include_delivery: v.optional(v.boolean()),
    delivery_location: v.optional(v.string()),
    estimated_total: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("quote_requests") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
