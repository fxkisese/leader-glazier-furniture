/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as admin from "../admin.js";
import type * as customOrderRequests from "../customOrderRequests.js";
import type * as customers from "../customers.js";
import type * as fileStorage from "../fileStorage.js";
import type * as galleryItems from "../galleryItems.js";
import type * as glassTypes from "../glassTypes.js";
import type * as heroMedia from "../heroMedia.js";
import type * as hr from "../hr.js";
import type * as inventory from "../inventory.js";
import type * as payEntries from "../payEntries.js";
import type * as permissions from "../permissions.js";
import type * as productionJobs from "../productionJobs.js";
import type * as products from "../products.js";
import type * as purchases from "../purchases.js";
import type * as quoteRequests from "../quoteRequests.js";
import type * as reviews from "../reviews.js";
import type * as siteSettings from "../siteSettings.js";
import type * as staff from "../staff.js";
import type * as staffNode from "../staffNode.js";
import type * as suppliers from "../suppliers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  admin: typeof admin;
  customOrderRequests: typeof customOrderRequests;
  customers: typeof customers;
  fileStorage: typeof fileStorage;
  galleryItems: typeof galleryItems;
  glassTypes: typeof glassTypes;
  heroMedia: typeof heroMedia;
  hr: typeof hr;
  inventory: typeof inventory;
  payEntries: typeof payEntries;
  permissions: typeof permissions;
  productionJobs: typeof productionJobs;
  products: typeof products;
  purchases: typeof purchases;
  quoteRequests: typeof quoteRequests;
  reviews: typeof reviews;
  siteSettings: typeof siteSettings;
  staff: typeof staff;
  staffNode: typeof staffNode;
  suppliers: typeof suppliers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
