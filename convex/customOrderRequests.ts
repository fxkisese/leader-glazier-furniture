import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("custom_order_requests").order("desc").collect();
  },
});

export const listByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("custom_order_requests")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    customer_name: v.string(),
    phone: v.string(),
    product_type: v.string(),
    measurements: v.optional(v.string()),
    reference_image: v.optional(v.string()),
    preferred_material: v.optional(v.string()),
    budget: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("custom_order_requests", { status: "new", ...args });
  },
});

export const update = mutation({
  args: {
    id: v.id("custom_order_requests"),
    customer_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    product_type: v.optional(v.string()),
    measurements: v.optional(v.string()),
    reference_image: v.optional(v.string()),
    preferred_material: v.optional(v.string()),
    budget: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("custom_order_requests") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
