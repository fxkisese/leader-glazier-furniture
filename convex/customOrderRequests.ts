import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { recordWebsiteLead } from "./marketing";

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
    // Where the visitor came from (ad links carry utm_* tags); used for marketing, not stored on the request
    utm_source: v.optional(v.string()),
    utm_medium: v.optional(v.string()),
    utm_campaign: v.optional(v.string()),
  },
  handler: async (ctx, { utm_source, utm_medium, utm_campaign, ...args }) => {
    const id = await ctx.db.insert("custom_order_requests", { status: "new", ...args });
    await recordWebsiteLead(ctx, {
      name: args.customer_name, phone: args.phone, product_interest: args.product_type,
      notes: "Custom order request from the website", utm_source, utm_medium, utm_campaign,
    });
    return id;
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
