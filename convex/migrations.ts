import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Tables whose documents may hold file URLs (e.g. product images, hero media).
const TABLES_WITH_FILE_URLS = [
  "products",
  "hero_media",
  "gallery_items",
  "glass_types",
  "site_settings",
  "reviews",
  "custom_order_requests",
] as const;

const STORAGE_URL = /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.convex\.cloud\/api\/storage\/([0-9a-f-]+)$/;

/**
 * One-off fix after importing data from another deployment.
 *
 * Stored file URLs embed the source deployment's host and internal file id,
 * so they keep pointing at the old deployment. `mapping` maps those old
 * internal ids to `_storage` document ids (which the import preserves), and
 * each URL is regenerated against this deployment.
 *
 * Internal only — run from the CLI:
 *   npx convex run --prod migrations:rewriteStorageUrls "$(cat mapping.json)"
 */
export const rewriteStorageUrls = internalMutation({
  args: { mapping: v.record(v.string(), v.string()) },
  handler: async (ctx, { mapping }) => {
    const cache = new Map<string, string | null>();
    const missing = new Set<string>();

    const resolve = async (value: string): Promise<string> => {
      const match = STORAGE_URL.exec(value);
      if (!match) return value;
      const storageId = mapping[match[1]];
      if (!storageId) {
        missing.add(match[1]);
        return value;
      }
      if (!cache.has(storageId)) {
        cache.set(storageId, await ctx.storage.getUrl(storageId as Id<"_storage">));
      }
      return cache.get(storageId) ?? value;
    };

    const rewrite = async (value: unknown): Promise<unknown> => {
      if (typeof value === "string") return resolve(value);
      if (Array.isArray(value)) return Promise.all(value.map(rewrite));
      if (value && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) out[k] = await rewrite(v);
        return out;
      }
      return value;
    };

    let updated = 0;
    for (const table of TABLES_WITH_FILE_URLS) {
      for (const doc of await ctx.db.query(table).collect()) {
        const patch: Record<string, unknown> = {};
        for (const [field, value] of Object.entries(doc)) {
          if (field.startsWith("_")) continue;
          const next = await rewrite(value);
          if (JSON.stringify(next) !== JSON.stringify(value)) patch[field] = next;
        }
        if (Object.keys(patch).length) {
          await ctx.db.patch(doc._id, patch as never);
          updated++;
        }
      }
    }

    return { updated, missing: [...missing] };
  },
});
