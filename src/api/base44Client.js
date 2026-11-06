/**
 * Convex compatibility shim — replaces the old Supabase base44Client.
 *
 * USAGE (unchanged from before):
 *   import { base44 } from '@/api/base44Client';
 *   const products = await base44.entities.Product.list();
 *   const newProduct = await base44.entities.Product.create({ ... });
 *
 * Image upload (unchanged interface):
 *   const { file_url } = await base44.integrations.Core.UploadFile({ file });
 *
 * This module uses the Convex HTTP client (ConvexHttpClient) so it works
 * seamlessly in async/await contexts without needing React hooks.
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.warn(
    "[base44/Convex] VITE_CONVEX_URL is not set. " +
      "Add it to your .env.local file and restart the dev server."
  );
}

const client = new ConvexHttpClient(convexUrl || "");

// Convex docs use _id/_creationTime; the UI expects id/created_at (old Supabase shape).
const normalize = (row) =>
  row && typeof row === "object" && row._id
    ? { ...row, id: row._id, created_at: row.created_at ?? new Date(row._creationTime).toISOString() }
    : row;

// Convex validators reject null for optional fields and unknown keys like id/_id.
const clean = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([k, v]) => v !== null && v !== undefined && !["id", "_id", "_creationTime", "created_at"].includes(k)
    )
  );

// ─────────────────────────────────────────────────────────
// Thin wrapper that maps the old Base44 entity API surface
// to Convex queries/mutations.
// ─────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {import("convex/server").FunctionReference} opts.listQuery
 * @param {import("convex/server").FunctionReference} opts.createMutation
 * @param {import("convex/server").FunctionReference} opts.updateMutation
 * @param {import("convex/server").FunctionReference} opts.removeMutation
 * @param {import("convex/server").FunctionReference} [opts.filterQuery]
 */
const makeEntity = ({ listQuery, createMutation, updateMutation, removeMutation, filterQuery, auth }) => {
  // Business entities need the signed-in staff token on every call
  const withAuth = (args) => (auth ? { ...args, token: getStaffToken() } : args);
  const ops = {
  /**
   * list()  →  all rows, newest first
   */
  list: async () => {
    return (await client.query(listQuery, withAuth({}))).map(normalize);
  },

  /**
   * get(id)  →  single row, or null if it no longer exists
   */
  get: async (id) => {
    const rows = await client.query(listQuery, withAuth({}));
    return normalize(rows.find((r) => r._id === id)) ?? null;
  },

  /**
   * filter(filters)  →  rows matching key/value pairs.
   * Convex doesn't have a generic filter query, so we list all
   * and filter client-side (acceptable for small datasets).
   * For hot paths you can swap this for a dedicated index query.
   */
  filter: async (filters = {}) => {
    const query = filterQuery || listQuery;
    const rows = (await client.query(query, withAuth({}))).map(normalize);
    if (!filters || Object.keys(filters).length === 0) return rows;
    return rows.filter((row) =>
      Object.entries(filters).every(([k, v]) => row[k] === v)
    );
  },

  /**
   * create(data)  →  new document
   */
  create: async (data) => {
    const id = await client.mutation(createMutation, withAuth(clean(data)));
    // Convex mutations return the inserted id; fetch the full doc.
    if (typeof id === "string") {
      // Re-list and find by _id (cheapest approach without a getById fn)
      const all = await client.query(listQuery, withAuth({}));
      return normalize(all.find((r) => r._id === id) ?? { _id: id, ...data });
    }
    return normalize(id); // some mutations return the doc directly
  },

  /**
   * update(id, data)  →  updated document. Pass `clear` to unset fields
   * (only for mutations that accept a `clear` arg, e.g. products.update).
   */
  update: async (id, data, clear) => {
    const args = { id, ...clean(data) };
    if (clear?.length) args.clear = clear;
    return normalize(await client.mutation(updateMutation, withAuth(args)));
  },

  /**
   * delete(id)
   */
  delete: async (id) => {
    return await client.mutation(removeMutation, withAuth({ id }));
  },
  };
  // Turn Convex error dumps into readable messages
  return Object.fromEntries(Object.entries(ops).map(([k, fn]) => [k, (...a) => call(() => fn(...a))]));
};

// ─────────────────────────────────────────────────────────
// Staff sign-in. The session token lives in localStorage and is sent
// with every business call; the server checks it and the account's role.
// ─────────────────────────────────────────────────────────
const TOKEN_KEY = "cg-staff-token";
export const getStaffToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
};
const setStaffToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
};

// Convex wraps thrown errors as "[Request ID: …] Server Error Uncaught Error: <message> at handler…"
const friendly = (err) => {
  const m = /Uncaught Error: (.*?)(?:\s+at |\n|$)/s.exec(err?.message || "");
  return new Error(m ? m[1] : err?.message || "Something went wrong");
};
const call = async (fn) => { try { return await fn(); } catch (e) { throw friendly(e); } };

export const staffApi = {
  hasAccounts: () => call(() => client.query(api.staff.hasAccounts, {})),
  me: () => (getStaffToken() ? call(() => client.query(api.staff.me, { token: getStaffToken() })) : Promise.resolve(null)),
  login: async (username, password) => setStaffToken(await call(() => client.action(api.staffNode.login, { username, password }))),
  setupOwner: async (name, username, password) =>
    setStaffToken(await call(() => client.action(api.staffNode.setupOwner, { name, username, password }))),
  logout: async () => {
    const token = getStaffToken();
    setStaffToken("");
    if (token) await client.mutation(api.staff.logout, { token }).catch(() => {});
  },
  listAccounts: () => call(() => client.query(api.staff.listAccounts, { token: getStaffToken() })),
  createAccount: (data) => call(() => client.action(api.staffNode.createAccount, { token: getStaffToken(), ...data })),
  updateAccount: (id, changes) => call(() => client.mutation(api.staff.updateAccount, { token: getStaffToken(), id, ...changes })),
  removeAccount: (id) => call(() => client.mutation(api.staff.removeAccount, { token: getStaffToken(), id })),
  setPassword: (id, password) => call(() => client.action(api.staffNode.setPassword, { token: getStaffToken(), id, password })),
};

// One-off business calls that don't fit the entity shape
const authed = (fn, args = {}) => call(() => fn({ ...args, token: getStaffToken() }));
export const businessApi = {
  inventoryForSale: async () => (await authed((a) => client.query(api.inventory.listForSale, a))).map(normalize),
  employeeNames: async () => (await authed((a) => client.query(api.hr.listEmployeeNames, a))).map(normalize),
  attendance: async (month) => (await authed((a) => client.query(api.hr.listAttendance, a), { month })).map(normalize),
  setAttendance: (employee_id, date, status) => authed((a) => client.mutation(api.hr.setAttendance, a), { employee_id, date, status }),
  payslips: async () => (await authed((a) => client.query(api.hr.listPayslips, a))).map(normalize),
  payPayslip: (slip) => authed((a) => client.mutation(api.hr.payPayslip, a), slip),
  removePayslip: (id) => authed((a) => client.mutation(api.hr.removePayslip, a), { id }),
};

// Marketing: reports, pickers and the Meta sync
export const marketingApi = {
  report: (from, to) => authed((a) => client.query(api.marketing.report, a), { from, to }),
  employees: async () => (await authed((a) => client.query(api.marketing.employeeOptions, a))).map(normalize),
  sales: async () => (await authed((a) => client.query(api.marketing.saleOptions, a))).map(normalize),
  checkins: async (date) => (await authed((a) => client.query(api.marketing.listCheckins, a), { date })).map(normalize),
  setCheckin: (employee_id, date, flags) => authed((a) => client.mutation(api.marketing.setCheckin, a), { employee_id, date, ...flags }),
  syncMeta: (days = 3) => authed((a) => client.action(api.marketingMeta.syncNow, a), { days }),
  status: () => authed((a) => client.action(api.marketingMeta.status, a)),
};

// ─────────────────────────────────────────────────────────
// Entity map — mirrors the old base44.entities surface
// ─────────────────────────────────────────────────────────
export const base44 = {
  auth: {
    // This site uses password-gated admin — no user auth needed.
    me: async () => null,
    getSession: async () => null,
    signOut: async () => true,
  },

  entities: {
    Product: makeEntity({
      listQuery: api.products.list,
      createMutation: api.products.create,
      updateMutation: api.products.update,
      removeMutation: api.products.remove,
    }),

    GlassType: makeEntity({
      listQuery: api.glassTypes.list,
      createMutation: api.glassTypes.create,
      updateMutation: api.glassTypes.update,
      removeMutation: api.glassTypes.remove,
    }),

    QuoteRequest: makeEntity({
      listQuery: api.quoteRequests.list,
      createMutation: api.quoteRequests.create,
      updateMutation: api.quoteRequests.update,
      removeMutation: api.quoteRequests.remove,
    }),

    CustomOrderRequest: makeEntity({
      listQuery: api.customOrderRequests.list,
      createMutation: api.customOrderRequests.create,
      updateMutation: api.customOrderRequests.update,
      removeMutation: api.customOrderRequests.remove,
    }),

    GalleryItem: makeEntity({
      listQuery: api.galleryItems.list,
      createMutation: api.galleryItems.create,
      updateMutation: api.galleryItems.update,
      removeMutation: api.galleryItems.remove,
    }),

    // alias kept for backwards compat
    GalleryProject: makeEntity({
      listQuery: api.galleryItems.list,
      createMutation: api.galleryItems.create,
      updateMutation: api.galleryItems.update,
      removeMutation: api.galleryItems.remove,
    }),

    HeroMedia: makeEntity({
      listQuery: api.heroMedia.list,
      createMutation: api.heroMedia.create,
      updateMutation: api.heroMedia.update,
      removeMutation: api.heroMedia.remove,
    }),

    Review: makeEntity({
      listQuery: api.reviews.list,
      createMutation: api.reviews.create,
      updateMutation: api.reviews.update,
      removeMutation: api.reviews.remove,
    }),

    SiteSetting: makeEntity({
      listQuery: api.siteSettings.list,
      createMutation: api.siteSettings.create,
      updateMutation: api.siteSettings.update,
      removeMutation: api.siteSettings.update, // no dedicated remove for settings
    }),

    Order: makeEntity({
      listQuery: api.orders.list,
      createMutation: api.orders.update, // orders are created by the payment backend, not the admin
      updateMutation: api.orders.update,
      removeMutation: api.orders.remove,
      auth: true,
    }),

    Sale: makeEntity({
      listQuery: api.admin.listSales,
      createMutation: api.admin.createSale,
      updateMutation: api.admin.updateSale,
      removeMutation: api.admin.removeSale,
      auth: true,
    }),

    InventoryItem: makeEntity({
      listQuery: api.inventory.list,
      createMutation: api.inventory.create,
      updateMutation: api.inventory.update,
      removeMutation: api.inventory.remove,
      auth: true,
    }),

    Customer: makeEntity({
      listQuery: api.customers.list,
      createMutation: api.customers.create,
      updateMutation: api.customers.update,
      removeMutation: api.customers.remove,
      auth: true,
    }),

    Supplier: makeEntity({
      listQuery: api.suppliers.list,
      createMutation: api.suppliers.create,
      updateMutation: api.suppliers.update,
      removeMutation: api.suppliers.remove,
      auth: true,
    }),

    Purchase: makeEntity({
      listQuery: api.purchases.list,
      createMutation: api.purchases.create,
      updateMutation: api.purchases.update,
      removeMutation: api.purchases.remove,
      auth: true,
    }),

    PayEntry: makeEntity({
      listQuery: api.payEntries.list,
      createMutation: api.payEntries.create,
      updateMutation: api.payEntries.update,
      removeMutation: api.payEntries.remove,
      auth: true,
    }),

    ProductionJob: makeEntity({
      listQuery: api.productionJobs.list,
      createMutation: api.productionJobs.create,
      updateMutation: api.productionJobs.update,
      removeMutation: api.productionJobs.remove,
      auth: true,
    }),

    Employee: makeEntity({
      listQuery: api.hr.listEmployees,
      createMutation: api.hr.createEmployee,
      updateMutation: api.hr.updateEmployee,
      removeMutation: api.hr.removeEmployee,
      auth: true,
    }),

    CreditCustomer: makeEntity({
      listQuery: api.admin.listCreditCustomers,
      createMutation: api.admin.createCreditCustomer,
      updateMutation: api.admin.updateCreditCustomer,
      removeMutation: api.admin.removeCreditCustomer,
    }),

    Expense: makeEntity({
      listQuery: api.admin.listExpenses,
      createMutation: api.admin.createExpense,
      updateMutation: api.admin.updateExpense,
      removeMutation: api.admin.removeExpense,
      auth: true,
    }),

    MktCampaign: makeEntity({
      listQuery: api.marketing.listCampaigns,
      createMutation: api.marketing.createCampaign,
      updateMutation: api.marketing.updateCampaign,
      removeMutation: api.marketing.removeCampaign,
      auth: true,
    }),
    MktAd: makeEntity({
      listQuery: api.marketing.listAds,
      createMutation: api.marketing.createAd,
      updateMutation: api.marketing.updateAd,
      removeMutation: api.marketing.removeAd,
      auth: true,
    }),
    MktSpend: makeEntity({
      listQuery: api.marketing.listSpend,
      createMutation: api.marketing.createSpend,
      updateMutation: api.marketing.updateSpend,
      removeMutation: api.marketing.removeSpend,
      auth: true,
    }),
    MktPost: makeEntity({
      listQuery: api.marketing.listPosts,
      createMutation: api.marketing.createPost,
      updateMutation: api.marketing.updatePost,
      removeMutation: api.marketing.removePost,
      auth: true,
    }),
    MktLead: makeEntity({
      listQuery: api.marketing.listLeads,
      createMutation: api.marketing.createLead,
      updateMutation: api.marketing.updateLead,
      removeMutation: api.marketing.removeLead,
      auth: true,
    }),
    MktTeam: makeEntity({
      listQuery: api.marketing.listTeam,
      createMutation: api.marketing.createTeam,
      updateMutation: api.marketing.updateTeam,
      removeMutation: api.marketing.removeTeam,
      auth: true,
    }),

    Accessory: makeEntity({
      listQuery: api.admin.listAccessories,
      createMutation: api.admin.createAccessory,
      updateMutation: api.admin.updateAccessory,
      removeMutation: api.admin.removeAccessory,
    }),

    StandardSize: makeEntity({
      listQuery: api.admin.listStandardSizes,
      createMutation: api.admin.createStandardSize,
      updateMutation: api.admin.updateStandardSize || api.admin.createStandardSize,
      removeMutation: api.admin.removeStandardSize,
    }),
  },

  integrations: {
    Core: {
      /**
       * Upload a file to Convex Storage.
       * Interface identical to the old Supabase version:
       *   const { file_url } = await base44.integrations.Core.UploadFile({ file });
       */
      UploadFile: async ({ file }) => {
        if (!file) throw new Error("No file provided");

        // 1. Get a short-lived upload URL from Convex
        const uploadUrl = await client.mutation(api.fileStorage.generateUploadUrl, {});

        // 2. PUT the file bytes to that URL
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Convex upload failed: ${text}`);
        }

        const { storageId } = await res.json();

        // 3. Exchange the storageId for a permanent public URL
        const result = await client.mutation(api.fileStorage.getFileUrl, { storageId });
        return result; // { file_url: "https://..." }
      },
    },
  },
};
