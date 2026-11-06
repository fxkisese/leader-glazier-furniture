import { query, mutation, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { crud, requireAccess } from "./access";
import { can } from "./permissions";
import { unitCostOf } from "./inventory";
import { costLine } from "./schema";

// ────────── Sales ──────────
// Sales linked to an inventory item take their quantity out of stock (and put it back if the
// sale is deleted or changed), so stock on hand always matches what has been sold.
// Staff without "costs" access (e.g. Sales) never see production costs: the server fills the
// cost in from the cost sheet and strips it from what they read back.
const saleFields = {
  product_id: v.optional(v.string()),
  product_name: v.optional(v.string()),
  inventory_item_id: v.optional(v.string()),
  customer_id: v.optional(v.string()),
  quantity: v.optional(v.number()),
  unit_price: v.optional(v.number()),
  unit_cost: v.optional(v.number()),
  cost_lines: v.optional(v.array(costLine)),
  cost_batch: v.optional(v.number()),
  amount: v.optional(v.number()),
  amount_paid: v.optional(v.number()),
  date: v.optional(v.string()),
  customer_name: v.optional(v.string()),
  customer_phone: v.optional(v.string()),
  payment_method: v.optional(v.string()),
  status: v.optional(v.string()),
  notes: v.optional(v.string()),
};

const COST_FIELDS = ["unit_cost", "cost_lines", "cost_batch"] as const;

const getItem = async (ctx: MutationCtx, itemId: string | undefined) => {
  const id = itemId ? ctx.db.normalizeId("inventory_items", itemId) : null;
  return id ? await ctx.db.get(id) : null;
};

/** The item's cost per unit plus a copy of its cost sheet, so the breakdown survives later edits. */
const costsFromItem = (item: Doc<"inventory_items">) => ({
  unit_cost: unitCostOf(item),
  cost_lines: item.cost_lines,
  cost_batch: Math.max(item.quantity_made || 1, 1),
});

const adjustStock = async (ctx: MutationCtx, itemId: string | undefined, delta: number) => {
  if (!delta) return;
  const item = await getItem(ctx, itemId);
  if (item) await ctx.db.patch(item._id, { stock_qty: (item.stock_qty ?? 0) + delta });
};

export const listSales = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireAccess(ctx, token, ["sales", "costs"]);
    const rows = await ctx.db.query("sales").order("desc").collect();
    return can(me.role, "costs") ? rows : rows.map(({ unit_cost, cost_lines, cost_batch, ...rest }) => rest);
  },
});

export const createSale = mutation({
  args: { token: v.string(), ...saleFields },
  handler: async (ctx, { token, ...args }) => {
    const me = await requireAccess(ctx, token, "sales");
    if (!can(me.role, "costs")) {
      COST_FIELDS.forEach((k) => delete args[k]);
      const item = await getItem(ctx, args.inventory_item_id);
      if (item) Object.assign(args, costsFromItem(item));
    }
    await adjustStock(ctx, args.inventory_item_id, -(args.quantity ?? 1));
    return await ctx.db.insert("sales", args);
  },
});

export const updateSale = mutation({
  args: { token: v.string(), id: v.id("sales"), ...saleFields, clear: v.optional(v.array(v.string())) },
  handler: async (ctx, { token, id, clear, ...fields }) => {
    const me = await requireAccess(ctx, token, "sales");
    const before = await ctx.db.get(id);
    if (!before) throw new Error("Sale not found");
    let toClear = clear ?? [];
    if (!can(me.role, "costs")) {
      COST_FIELDS.forEach((k) => delete fields[k]);
      toClear = toClear.filter((k) => !(COST_FIELDS as readonly string[]).includes(k));
      const itemChanged = (fields.inventory_item_id ?? (toClear.includes("inventory_item_id") ? undefined : before.inventory_item_id)) !== before.inventory_item_id;
      if (itemChanged) {
        const item = await getItem(ctx, fields.inventory_item_id);
        if (item) Object.assign(fields, costsFromItem(item));
        else toClear.push(...COST_FIELDS);
      }
    }
    const unset = Object.fromEntries(toClear.map((k) => [k, undefined]));
    await ctx.db.patch(id, { ...unset, ...fields });
    const after = (await ctx.db.get(id))!;
    // Return the old quantity to stock, then take the new one out
    await adjustStock(ctx, before.inventory_item_id, before.quantity ?? 1);
    await adjustStock(ctx, after.inventory_item_id, -(after.quantity ?? 1));
    return after;
  },
});

export const removeSale = mutation({
  args: { token: v.string(), id: v.id("sales") },
  handler: async (ctx, { token, id }) => {
    await requireAccess(ctx, token, "sales");
    const sale = await ctx.db.get(id);
    if (sale) await adjustStock(ctx, sale.inventory_item_id, sale.quantity ?? 1);
    await ctx.db.delete(id);
  },
});

// ────────── Credit Customers ──────────
export const listCreditCustomers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("credit_customers").order("desc").collect();
  },
});

export const createCreditCustomer = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    total_credit: v.optional(v.number()),
    amount_paid: v.optional(v.number()),
    balance: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("credit_customers", args);
  },
});

export const updateCreditCustomer = mutation({
  args: {
    id: v.id("credit_customers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    total_credit: v.optional(v.number()),
    amount_paid: v.optional(v.number()),
    balance: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
    return await ctx.db.get(id);
  },
});

export const removeCreditCustomer = mutation({
  args: { id: v.id("credit_customers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ────────── Expenses ──────────
export const { list: listExpenses, create: createExpense, update: updateExpense, remove: removeExpense } =
  crud("expenses", "costs", {
    description: v.string(),
    amount: v.number(),
    category: v.optional(v.string()),
    date: v.optional(v.string()),
    notes: v.optional(v.string()),
  });

// ────────── Accessories ──────────
export const listAccessories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("accessories").order("desc").collect();
  },
});

export const createAccessory = mutation({
  args: {
    name: v.string(),
    category: v.optional(v.string()),
    price: v.optional(v.number()),
    unit: v.optional(v.string()),
    stock_qty: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("accessories", args);
  },
});

export const updateAccessory = mutation({
  args: {
    id: v.id("accessories"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    price: v.optional(v.number()),
    unit: v.optional(v.string()),
    stock_qty: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
    return await ctx.db.get(id);
  },
});

export const removeAccessory = mutation({
  args: { id: v.id("accessories") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ────────── Standard Sizes ──────────
export const listStandardSizes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("standard_sizes").order("desc").collect();
  },
});

export const createStandardSize = mutation({
  args: {
    glass_type_id: v.optional(v.string()),
    label: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("standard_sizes", args);
  },
});

export const removeStandardSize = mutation({
  args: { id: v.id("standard_sizes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
