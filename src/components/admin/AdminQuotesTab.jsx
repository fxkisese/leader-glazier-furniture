import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Phone, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, EmptyState, ErrorState, ListSkeleton, FilterChips, Pill, formatKsh, formatDate, humanize } from "./adminShared";

const STATUSES = [
  { value: "new", tone: "amber" },
  { value: "contacted", tone: "blue" },
  { value: "completed", tone: "green" },
  { value: "cancelled", tone: "gray" },
];
const toneOf = (s) => STATUSES.find((x) => x.value === s)?.tone || "gray";

export default function AdminQuotesTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("open");

  const { data: quotes = [], isLoading, error, refetch } = useQuery({
    queryKey: ["quote-requests"],
    queryFn: () => base44.entities.QuoteRequest.list("-created_date", 200),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.QuoteRequest.update(id, { status }),
    onSuccess: (q) => { queryClient.invalidateQueries({ queryKey: ["quote-requests"] }); toast.success(`Marked as ${q.status}`); },
    onError: (err) => toast.error(`Couldn't update: ${err.message}`),
  });

  const isOpen = (q) => q.status === "new" || q.status === "contacted";
  const filtered = quotes.filter((q) => (filter === "all" ? true : filter === "open" ? isOpen(q) : q.status === filter));

  return (
    <div>
      <PageHeader title="Glass Quotes" description="Estimates customers generated with the online glass calculator. Contact them to confirm measurements." />

      <div className="mb-4">
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: "Open", count: quotes.filter(isOpen).length },
            { value: "new", label: "New", count: quotes.filter((q) => q.status === "new").length },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
            { value: "all", label: "All", count: quotes.length },
          ]}
        />
      </div>

      <Panel className="overflow-hidden">
        {isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={MessageSquare} title={quotes.length ? "Nothing here" : "No glass quotes yet"} description={quotes.length ? "No quotes match this filter." : "Quotes appear here when customers use the glass calculator."} />
        ) : (
          <ul className="divide-y divide-black/5">
            {filtered.map((q) => (
              <li key={q.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-obsidian">{q.glass_type_name}</h3>
                    <Pill tone={toneOf(q.status)}>{humanize(q.status || "new")}</Pill>
                    <span className="text-xs text-muted-foreground">{formatDate(q.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {q.width} × {q.height} {q.unit} · {Number(q.area_sqft || 0).toFixed(1)} sq ft · Qty {q.quantity || 1}
                    {q.include_installation && " · Installation"}
                    {q.include_frame && " · Frame"}
                    {q.include_delivery && ` · Delivery${q.delivery_location ? ` to ${q.delivery_location}` : ""}`}
                  </p>
                  {(q.customer_name || q.phone) && (
                    <p className="text-sm text-obsidian">{q.customer_name}{q.customer_name && q.phone && " · "}{q.phone}</p>
                  )}
                </div>
                <p className="font-semibold text-obsidian md:w-32 md:text-right">{formatKsh(q.estimated_total)}</p>
                <div className="flex gap-2 items-center">
                  <Select value={q.status || "new"} onValueChange={(v) => updateStatus.mutate({ id: q.id, status: v })}>
                    <SelectTrigger className="w-36 h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{humanize(s.value)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {q.phone && (
                    <>
                      <a href={`tel:${q.phone}`} aria-label="Call customer">
                        <Button size="icon" variant="outline" className="h-9 w-9"><Phone className="w-4 h-4" /></Button>
                      </a>
                      <a
                        aria-label="WhatsApp customer"
                        href={`https://wa.me/${q.phone.replace(/\D/g, "").replace(/^0/, "254")}?text=${encodeURIComponent(`Hello${q.customer_name ? ` ${q.customer_name}` : ""}, regarding your glass quote for ${q.glass_type_name} — estimated ${formatKsh(q.estimated_total)}. Let's confirm the details.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="icon" className="h-9 w-9 bg-[#25D366] hover:bg-[#1ebe5d] text-white"><MessageCircle className="w-4 h-4" /></Button>
                      </a>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
