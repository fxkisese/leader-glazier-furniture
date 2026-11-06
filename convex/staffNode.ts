"use node";
// Password handling runs in Node so it can use scrypt. Passwords are never stored or returned —
// only a salted scrypt hash.
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const hash = (password: string, salt: string) => scryptSync(password, salt, 64).toString("hex");

const checkPassword = (password: string) => {
  if (password.length < 8) throw new Error("Passwords must be at least 8 characters.");
};

const normalize = (username: string) => username.trim().toLowerCase();

async function startSession(ctx: any, accountId: any) {
  const token = randomBytes(32).toString("hex");
  await ctx.runMutation(internal.staff._createSession, { account_id: accountId, token });
  return token;
}

export const login = action({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, { username, password }): Promise<string> => {
    const account: any = await ctx.runQuery(internal.staff._byUsername, { username: normalize(username) });
    const ok =
      account &&
      account.active !== false &&
      timingSafeEqual(Buffer.from(hash(password, account.salt), "hex"), Buffer.from(account.password_hash, "hex"));
    if (!ok) throw new Error("Wrong username or password.");
    return await startSession(ctx, account._id);
  },
});

/** First-time setup: creates the CEO account. Refused once any account exists. */
export const setupOwner = action({
  args: { name: v.string(), username: v.string(), password: v.string() },
  handler: async (ctx, { name, username, password }): Promise<string> => {
    checkPassword(password);
    const salt = randomBytes(16).toString("hex");
    const id = await ctx.runMutation(internal.staff._insertAccount, {
      name: name.trim(), username: normalize(username), password_hash: hash(password, salt), salt, role: "ceo", onlyIfFirst: true,
    });
    return await startSession(ctx, id);
  },
});

export const createAccount = action({
  args: { token: v.string(), name: v.string(), username: v.string(), password: v.string(), role: v.string() },
  handler: async (ctx, { token, name, username, password, role }) => {
    const caller: any = await ctx.runQuery(internal.staff._caller, { token });
    if (caller.role !== "ceo") throw new Error("Only the CEO can add staff accounts.");
    checkPassword(password);
    const salt = randomBytes(16).toString("hex");
    await ctx.runMutation(internal.staff._insertAccount, {
      name: name.trim(), username: normalize(username), password_hash: hash(password, salt), salt, role: role as any,
    });
  },
});

/** CEO resets anyone's password; everyone else can only change their own. Signs that account out everywhere. */
export const setPassword = action({
  args: { token: v.string(), id: v.id("staff_accounts"), password: v.string() },
  handler: async (ctx, { token, id, password }) => {
    const caller: any = await ctx.runQuery(internal.staff._caller, { token });
    if (caller.role !== "ceo" && caller.id !== id) throw new Error("You can only change your own password.");
    checkPassword(password);
    const salt = randomBytes(16).toString("hex");
    await ctx.runMutation(internal.staff._setPassword, { id, password_hash: hash(password, salt), salt });
  },
});
