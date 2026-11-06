import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PRODUCT_CATEGORIES = [
  "sofas",
  "tv-stands",
  "shoe-racks",
  "wardrobes",
  "beds",
  "coffee-tables",
  "dining-sets",
  "office-desks",
  "office-chairs",
  "cabinets",
  "chest-of-drawers",
  "custom-furniture",
];

export const humanize = (s = "") => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const formatKsh = (n) => `KSh ${Number(n || 0).toLocaleString()}`;

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "";

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-obsidian tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Panel({ className = "", children }) {
  return <div className={`bg-white border border-black/10 rounded-lg ${className}`}>{children}</div>;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <p className="font-medium text-obsidian">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const offline = /fetch|network|Failed to fetch/i.test(error?.message || "");
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600" />
      </div>
      <p className="font-medium text-obsidian">
        {offline ? "Can't reach the database" : "Something went wrong"}
      </p>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        {offline
          ? "Check your internet connection and that the Supabase project in your .env settings is active."
          : error?.message || "Unknown error"}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-5 gap-2">
          <RefreshCw className="w-4 h-4" /> Try again
        </Button>
      )}
    </div>
  );
}

const PILL_TONES = {
  gray:   "bg-gray-100 text-gray-700",
  green:  "bg-emerald-50 text-emerald-700",
  amber:  "bg-amber-50 text-amber-700",
  blue:   "bg-sky-50 text-sky-700",
  purple: "bg-violet-50 text-violet-700",
  red:    "bg-red-50 text-red-700",
};

export function Pill({ tone = "gray", children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${PILL_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            value === o.value ? "bg-obsidian text-white" : "bg-white border border-black/10 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 opacity-60">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-black/5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="w-12 h-12 rounded-md bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 bg-muted rounded animate-pulse" />
            <div className="h-3 w-1/5 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
