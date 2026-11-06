import { query, mutation, type QueryCtx } from "./_generated/server";
import type { TableNames } from "./_generated/dataModel";
import { v, type PropertyValidators } from "convex/values";
import { can, type Module } from "./permissions";

/**
 * Checks the session token and that the signed-in account may use one of `modules`.
 * Every business query and mutation calls this, so access is enforced on the server,
 * not just hidden in the menus.
 */
export async function requireAccess(ctx: QueryCtx, token: string, modules: Module | Module[]) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session || session.expires_at < Date.now()) throw new Error("Your session has expired. Please sign in again.");
  const account = await ctx.db.get(session.account_id);
  if (!account || account.active === false) throw new Error("This account is disabled.");
  const list = Array.isArray(modules) ? modules : [modules];
  if (!list.some((m) => can(account.role, m))) throw new Error("You don't have access to this.");
  return account;
}

const optionalAll = (fields: PropertyValidators) =>
  Object.fromEntries(
    Object.entries(fields).map(([k, val]) => [k, (val as any).isOptional === "optional" ? val : v.optional(val as any)]),
  ) as PropertyValidators;

/** Standard list / create / update / remove for a table, all behind `requireAccess`. */
export function crud(table: TableNames, modules: Module | Module[], fields: PropertyValidators) {
  return {
    list: query({
      args: { token: v.string() },
      handler: async (ctx, { token }) => {
        await requireAccess(ctx, token, modules);
        return await ctx.db.query(table).order("desc").collect();
      },
    }),
    create: mutation({
      args: { token: v.string(), ...fields },
      handler: async (ctx, { token, ...data }: any) => {
        await requireAccess(ctx, token, modules);
        return await ctx.db.insert(table, data);
      },
    }),
    update: mutation({
      args: { token: v.string(), id: v.id(table), clear: v.optional(v.array(v.string())), ...optionalAll(fields) },
      handler: async (ctx, { token, id, clear, ...data }: any) => {
        await requireAccess(ctx, token, modules);
        const unset = Object.fromEntries(((clear as string[]) ?? []).map((k) => [k, undefined]));
        await ctx.db.patch(id, { ...unset, ...data });
        return await ctx.db.get(id);
      },
    }),
    remove: mutation({
      args: { token: v.string(), id: v.id(table) },
      handler: async (ctx, { token, id }: any) => {
        await requireAccess(ctx, token, modules);
        await ctx.db.delete(id);
      },
    }),
  };
}
