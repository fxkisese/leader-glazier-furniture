import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Step 1: Ask Convex for an upload URL
 * Call this from the client, then PUT the file to the returned URL.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Step 2: After uploading, call this to get the permanent public URL.
 */
export const getFileUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    return { file_url: url };
  },
});
