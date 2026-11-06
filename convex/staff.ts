import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAccess } from "./access";
import { ROLES } from "./permissions";

const SESSION_DAYS = 30;
const publicAccount = (a: any) => a && { id: a._id, name: a.name, username: a.username, role: a.role, active: a.active !== false };
const roleArg = v.union(...Object.keys(ROLES).map((r) => v.literal(r)) as [any, any, ...any[]]);

// ── Public ──

/** Whether the first (owner) account has been set up yet. */
export const hasAccounts = query({
  args: {},
  handler: async (ctx) => !!(await ctx.db.query("staff_accounts").first()),
});

/** The signed-in account for a token, or null if the session is missing/expired. */
export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!session || session.expires_at < Date.now()) return null;
    const account = await ctx.db.get(session.account_id);
    return account && account.active !== false ? publicAccount(account) : null;
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (session) await ctx.db.delete(session._id);
  },
});

// ── Team management (CEO) ──

export const listAccounts = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAccess(ctx, token, "team");
    return (await ctx.db.query("staff_accounts").collect()).map(publicAccount);
  },
});

export const updateAccount = mutation({
  args: { token: v.string(), id: v.id("staff_accounts"), name: v.optional(v.string()), role: v.optional(roleArg), active: v.optional(v.boolean()) },
  handler: async (ctx, { token, id, ...changes }) => {
    const me = await requireAccess(ctx, token, "team");
    if (id === me._id && ((changes.role && changes.role !== "ceo") || changes.active === false)) {
      throw new Error("You can't remove your own CEO access. Ask another CEO account to do it.");
    }
    await ctx.db.patch(id, changes);
    if (changes.active === false) await endSessions(ctx, id);
  },
});

export const removeAccount = mutation({
  args: { token: v.string(), id: v.id("staff_accounts") },
  handler: async (ctx, { token, id }) => {
    const me = await requireAccess(ctx, token, "team");
    if (id === me._id) throw new Error("You can't delete your own account.");
    await endSessions(ctx, id);
    await ctx.db.delete(id);
  },
});

async function endSessions(ctx: any, accountId: any) {
  const sessions = await ctx.db.query("sessions").withIndex("by_account", (q: any) => q.eq("account_id", accountId)).collect();
  for (const s of sessions) await ctx.db.delete(s._id);
}

// ── Internal helpers for the password actions in staffNode.ts ──

export const _byUsername = internalQuery({
  args: { username: v.string() },
  handler: async (ctx, { username }) =>
    await ctx.db.query("staff_accounts").withIndex("by_username", (q) => q.eq("username", username)).unique(),
});

export const _caller = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireAccess(ctx, token, ["dashboard", "website", "sales", "costs", "inventory", "customers", "suppliers", "production", "hr", "team", "marketing"]);
    return { id: me._id, role: me.role };
  },
});

export const _insertAccount = internalMutation({
  args: {
    name: v.string(), username: v.string(), password_hash: v.string(), salt: v.string(), role: roleArg,
    onlyIfFirst: v.optional(v.boolean()),
  },
  handler: async (ctx, { onlyIfFirst, ...account }) => {
    if (onlyIfFirst && (await ctx.db.query("staff_accounts").first())) throw new Error("The owner account already exists. Please sign in.");
    const taken = await ctx.db.query("staff_accounts").withIndex("by_username", (q) => q.eq("username", account.username)).unique();
    if (taken) throw new Error("That username is already taken.");
    return await ctx.db.insert("staff_accounts", { ...account, active: true });
  },
});

export const _setPassword = internalMutation({
  args: { id: v.id("staff_accounts"), password_hash: v.string(), salt: v.string() },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    await endSessions(ctx, id);
  },
});

export const _createSession = internalMutation({
  args: { account_id: v.id("staff_accounts"), token: v.string() },
  handler: async (ctx, { account_id, token }) => {
    await ctx.db.insert("sessions", { account_id, token, expires_at: Date.now() + SESSION_DAYS * 86400_000 });
  },
});
