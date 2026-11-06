import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("site_settings").collect();
  },
});

export const getFirst = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("site_settings").first();
    return settings;
  },
});

export const create = mutation({
  args: {
    business_name: v.string(),
    whatsapp_number: v.string(),
    phone_number: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    delivery_policy: v.optional(v.string()),
    delivery_base_price: v.optional(v.number()),
    installation_base_price: v.optional(v.number()),
    hero_tagline: v.optional(v.string()),
    about_text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("site_settings", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("site_settings"),
    business_name: v.optional(v.string()),
    whatsapp_number: v.optional(v.string()),
    phone_number: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    delivery_policy: v.optional(v.string()),
    delivery_base_price: v.optional(v.number()),
    installation_base_price: v.optional(v.number()),
    hero_tagline: v.optional(v.string()),
    about_text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
    return await ctx.db.get(id);
  },
});
