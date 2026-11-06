import { query } from "./_generated/server";
import { v } from "convex/values";
import { crud, requireAccess } from "./access";
import { costLine } from "./schema";

export const { list, create, update, remove } = crud("inventory_items", "inventory", {
  name: v.string(),
  category: v.optional(v.string()),
  product_id: v.optional(v.string()),
  quantity_made: v.optional(v.number()),
  stock_qty: v.optional(v.number()),
  cost_lines: v.optional(v.array(costLine)),
  selling_price: v.optional(v.number()),
  date: v.optional(v.string()),
  notes: v.optional(v.string()),
});

/** What sales staff need to pick an item: name, stock and price — no cost breakdown. */
export const listForSale = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAccess(ctx, token, ["sales", "inventory"]);
    return (await ctx.db.query("inventory_items").order("desc").collect()).map((i) => ({
      _id: i._id, _creationTime: i._creationTime, name: i.name, stock_qty: i.stock_qty,
      selling_price: i.selling_price, product_id: i.product_id,
    }));
  },
});

/** Production cost per unit from a cost sheet, rounded to the cent (same formula as the admin UI). */
export const unitCostOf = (item: { cost_lines?: { quantity: number; unit_cost: number }[]; quantity_made?: number }) => {
  const lines = item.cost_lines ?? [];
  const total = lines.reduce((s, l) => s + Math.round(l.quantity * l.unit_cost * 100) / 100, 0);
  return Math.round((total / Math.max(item.quantity_made || 1, 1)) * 100) / 100;
};
