import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Meta ad spend, every day at 06:00 Nairobi (03:00 UTC). Does nothing until Meta is connected.
crons.daily("sync Meta ads", { hourUTC: 3, minuteUTC: 0 }, internal.marketingMeta.scheduledSync);

export default crons;
