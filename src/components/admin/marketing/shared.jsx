// Lists, period maths and small pieces shared by the Marketing screens.
// The lists only drive dropdowns — edit them freely.
import { useQueryClient } from "@tanstack/react-query";

export const BRANCHES = ["Kyumbi (Machakos Junction)", "Tena Estate (Whitehouse Footbridge)"];

export const PRODUCTS = [
  "sofa", "bed", "wardrobe", "shoe rack", "dining set", "coffee table", "tv stand",
  "dressing table", "chest of drawers", "office furniture", "kitchen cabinets",
  "glass / mirrors", "shower cubicle", "custom order", "other",
];

export const HOOKS = [
  "build process", "before/after", "price offer", "customer testimonial",
  "showroom tour", "product showcase", "delivery / installation",
  "behind the scenes", "educational tip", "other",
];

export const FORMATS = ["video", "photo", "carousel", "reel", "status", "other"];
export const POST_PLATFORMS = ["instagram", "facebook", "tiktok", "whatsapp_status", "youtube", "other"];
export const AD_PLATFORMS = ["meta", "tiktok", "google", "other"];
export const CAMPAIGN_STATUSES = ["active", "paused", "ended"];
export const LEAD_SOURCES = ["meta_ad", "organic_post", "whatsapp", "walk_in", "referral", "google", "website", "tiktok", "other"];
export const LEAD_STATUSES = ["new", "contacted", "quoted", "visited", "won", "lost"];
export const LOST_REASONS = ["too expensive", "no reply", "bought elsewhere", "just browsing", "delivery too far", "timeline too long", "other"];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const label = (s) => (s || "").replace(/_/g, " ");
export const cap = (s) => label(s).replace(/^\w/, (c) => c.toUpperCase());

export const STATUS_TONE = { new: "blue", contacted: "purple", quoted: "amber", visited: "amber", won: "green", lost: "red" };

// ── Dates (Nairobi, UTC+3) ──
const NAIROBI = 3 * 3_600_000;
export const nairobiDate = (ms = Date.now()) => new Date(ms + NAIROBI).toISOString().slice(0, 10);
export const nairobiTime = (ms = Date.now()) => new Date(ms + NAIROBI).toISOString().slice(11, 16);
/** "2026-11-07" + "14:30" → ms */
export const toMs = (date, time = "12:00") => Date.parse(`${date}T${time || "12:00"}:00+03:00`);

export const MKT_PERIODS = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-30", label: "Last 30 days" },
  { value: "this-year", label: "This year" },
];

export function periodRange(period) {
  const today = nairobiDate();
  const [y, m] = today.split("-").map(Number);
  const pad = (n) => String(n).padStart(2, "0");
  if (period === "last-month") {
    const [ly, lm] = m === 1 ? [y - 1, 12] : [y, m - 1];
    const last = new Date(Date.UTC(ly, lm, 0)).getUTCDate();
    return { from: `${ly}-${pad(lm)}-01`, to: `${ly}-${pad(lm)}-${pad(last)}` };
  }
  if (period === "last-30") return { from: nairobiDate(Date.now() - 29 * 86_400_000), to: today };
  if (period === "this-year") return { from: `${y}-01-01`, to: today };
  return { from: `${y}-${pad(m)}-01`, to: today };
}

/** Invalidate every marketing query after a change. */
export function useRefreshMarketing() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["mkt"] });
}

export const ksh = (n) => (n == null ? "—" : `KSh ${Math.round(Number(n) || 0).toLocaleString("en-KE")}`);
export const roasText = (r) => (r == null ? "—" : `${r.toFixed(1)}×`);
export const pct = (r) => (r == null ? "—" : `${r}%`);

// ── Small display pieces ──

/** Horizontal bar list: rows = [{ key, label, value, display }] */
export function BarList({ rows, empty = "No data yet" }) {
  if (!rows?.length) return <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>;
  const max = Math.max(...rows.map((r) => Number(r.value) || 0), 1);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.key ?? r.label} className="grid grid-cols-[minmax(90px,150px)_1fr_auto] gap-3 items-center text-sm">
          <span className="truncate capitalize" title={r.label}>{label(r.label)}</span>
          <span className="h-2.5 rounded-full bg-muted overflow-hidden">
            <span className="block h-full rounded-full bg-gold" style={{ width: `${((Number(r.value) || 0) / max) * 100}%` }} />
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{r.display ?? r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Simple table: columns = [{ key, title, num, render }] */
export function DataTable({ columns, rows, empty = "Nothing here yet", rowClass }) {
  if (!rows?.length) return <p className="text-sm text-muted-foreground py-8 text-center">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-black/10">
            {columns.map((c) => <th key={c.key} className={`font-medium px-3 py-2 whitespace-nowrap ${c.num ? "text-right" : "text-left"}`}>{c.title}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {rows.map((r, i) => (
            <tr key={r.id ?? r.key ?? i} className={rowClass ? rowClass(r) : ""}>
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 align-top ${c.num ? "text-right tabular-nums whitespace-nowrap" : ""}`}>
                  {c.render ? c.render(r) : r[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SectionTitle({ title, sub, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-black/10">
      <div>
        <h3 className="font-semibold text-sm text-obsidian">{title}</h3>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Options({ values, empty = "—" }) {
  return (
    <>
      <option value="">{empty}</option>
      {values.map((v) => <option key={v} value={v}>{cap(v)}</option>)}
    </>
  );
}
