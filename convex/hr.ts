import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { crud, requireAccess } from "./access";
import { employeeFields } from "./schema";

// ── Employees ──
export const { list: listEmployees, create: createEmployee, update: updateEmployee, remove: removeEmployee } =
  crud("employees", "hr", employeeFields);

/** Names only, for assigning production jobs — no pay or ID details. */
export const listEmployeeNames = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAccess(ctx, token, ["production", "hr"]);
    return (await ctx.db.query("employees").collect())
      .filter((e) => e.status !== "left")
      .map((e) => ({ _id: e._id, name: e.name, position: e.position }));
  },
});

// ── Attendance ──
export const listAttendance = query({
  args: { token: v.string(), month: v.string() }, // YYYY-MM
  handler: async (ctx, { token, month }) => {
    await requireAccess(ctx, token, "hr");
    return await ctx.db
      .query("attendance")
      .withIndex("by_date", (q) => q.gte("date", `${month}-01`).lte("date", `${month}-31`))
      .collect();
  },
});

/** Set one employee's status for one day; an empty status clears it. */
export const setAttendance = mutation({
  args: { token: v.string(), employee_id: v.string(), date: v.string(), status: v.string() },
  handler: async (ctx, { token, employee_id, date, status }) => {
    await requireAccess(ctx, token, "hr");
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_employee_date", (q) => q.eq("employee_id", employee_id).eq("date", date))
      .unique();
    if (!status) {
      if (existing) await ctx.db.delete(existing._id);
    } else if (existing) {
      await ctx.db.patch(existing._id, { status });
    } else {
      await ctx.db.insert("attendance", { employee_id, date, status });
    }
  },
});

// ── Payroll ──
export const listPayslips = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAccess(ctx, token, "hr");
    return await ctx.db.query("payslips").order("desc").collect();
  },
});

/**
 * Marks an employee paid for a month: saves the payslip and books the wage cost as an expense,
 * so it comes off net profit. The expense is gross pay minus deductions — advances were cash
 * that already went out, but they're still part of the wage cost.
 */
export const payPayslip = mutation({
  args: {
    token: v.string(),
    employee_id: v.string(),
    employee_name: v.string(),
    month: v.string(),
    pay_type: v.string(),
    days_worked: v.optional(v.number()),
    base_pay: v.number(),
    piece_pay: v.number(),
    bonuses: v.number(),
    advances: v.number(),
    deductions: v.number(),
    gross: v.number(),
    net: v.number(),
    paid_date: v.string(),
    payment_method: v.optional(v.string()),
  },
  handler: async (ctx, { token, ...slip }) => {
    await requireAccess(ctx, token, "hr");
    const already = (await ctx.db.query("payslips").withIndex("by_month", (q) => q.eq("month", slip.month)).collect())
      .some((p) => p.employee_id === slip.employee_id);
    if (already) throw new Error(`${slip.employee_name} has already been paid for ${slip.month}.`);
    const wageCost = Math.round((slip.gross - slip.deductions) * 100) / 100;
    const expenseId = await ctx.db.insert("expenses", {
      description: `Wages — ${slip.employee_name} (${slip.month})`,
      amount: wageCost,
      category: "wages",
      date: slip.paid_date,
    });
    return await ctx.db.insert("payslips", { ...slip, expense_id: expenseId });
  },
});

/** Undo a payment: removes the payslip and its wages expense. */
export const removePayslip = mutation({
  args: { token: v.string(), id: v.id("payslips") },
  handler: async (ctx, { token, id }) => {
    await requireAccess(ctx, token, "hr");
    const slip = await ctx.db.get(id);
    if (!slip) return;
    const expenseId = slip.expense_id && ctx.db.normalizeId("expenses", slip.expense_id);
    if (expenseId && (await ctx.db.get(expenseId))) await ctx.db.delete(expenseId);
    await ctx.db.delete(id);
  },
});
