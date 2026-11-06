import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Phone, ChevronDown, Star } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, EmptyState, ErrorState, ListSkeleton, FilterChips, Pill, formatDate, humanize } from "./adminShared";

const STATUSES = [
  { value: "new", tone: "amber" },
  { value: "reviewed", tone: "blue" },
  { value: "quoted", tone: "purple" },
  { value: "in-progress", tone: "blue" },
  { value: "completed", tone: "green" },
  { value: "cancelled", tone: "gray" },
];
const toneOf = (s) => STATUSES.find((x) => x.value === s)?.tone || "gray";
const isOpen = (o) => !["completed", "cancelled"].includes(o.status);

export default function AdminCustomOrdersTab() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("open");

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ["custom-orders"],
    queryFn: () => base44.entities.CustomOrderRequest.list("-created_date", 200),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.CustomOrderRequest.update(id, { status }),
    onSuccess: (o) => { queryClient.invalidateQueries({ queryKey: ["custom-orders"] }); toast.success(`Marked as ${humanize(o.status).toLowerCase()}`); },
    onError: (err) => toast.error(`Couldn't update: ${err.message}`),
  });

  const filtered = orders.filter((o) => (filter === "all" ? true : filter === "open" ? isOpen(o) : o.status === filter));

  return (
    <div>
      <PageHeader title="Custom Requests" description="Bespoke furniture requests from the Custom Orders page. Click a request to see measurements and the reference photo." />

      <div className="mb-4">
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: "Open", count: orders.filter(isOpen).length },
            { value: "new", label: "New", count: orders.filter((o) => o.status === "new").length },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
            { value: "all", label: "All", count: orders.length },
          ]}
        />
      </div>

      <Panel className="overflow-hidden">
        {isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Star} title={orders.length ? "Nothing here" : "No custom requests yet"} description={orders.length ? "No requests match this filter." : "Requests appear here when customers submit the custom order form."} />
        ) : (
          <ul className="divide-y divide-black/5">
            {filtered.map((o) => {
              const open = expanded === o.id;
              return (
                <li key={o.id}>
                  <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                    <button onClick={() => setExpanded(open ? null : o.id)} className="flex-1 min-w-0 text-left space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-obsidian">{o.product_type}</h3>
                        <Pill tone={toneOf(o.status)}>{humanize(o.status || "new")}</Pill>
                        <span className="text-xs text-muted-foreground">{formatDate(o.created_at)}</span>
                      </div>
                      <p className="text-sm text-obsidian">
                        {o.customer_name} <span className="text-muted-foreground">· {o.phone}{o.location && ` · ${o.location}`}</span>
                      </p>
                      {o.budget && <p className="text-sm text-muted-foreground">Budget: <span className="text-obsidian font-medium">{o.budget}</span></p>}
                    </button>
                    <div className="flex gap-2 items-center">
                      <Select value={o.status || "new"} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}>
                        <SelectTrigger className="w-36 h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{humanize(s.value)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {o.phone && (
                        <>
                          <a href={`tel:${o.phone}`} aria-label="Call customer">
                            <Button size="icon" variant="outline" className="h-9 w-9"><Phone className="w-4 h-4" /></Button>
                          </a>
                          <a
                            aria-label="WhatsApp customer"
                            href={`https://wa.me/${o.phone.replace(/\D/g, "").replace(/^0/, "254")}?text=${encodeURIComponent(`Hello ${o.customer_name || ""}, thank you for your custom order request for ${o.product_type}. We'd like to discuss the details with you.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="icon" className="h-9 w-9 bg-[#25D366] hover:bg-[#1ebe5d] text-white"><MessageCircle className="w-4 h-4" /></Button>
                          </a>
                        </>
                      )}
                      <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={open ? "Hide details" : "Show details"} onClick={() => setExpanded(open ? null : o.id)}>
                        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
                      </Button>
                    </div>
                  </div>

                  {open && (
                    <div className="px-5 pb-5 grid md:grid-cols-[1fr_auto] gap-5 text-sm">
                      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 bg-muted/40 rounded-md p-4">
                        {[
                          ["Measurements", o.measurements],
                          ["Preferred material", o.preferred_material],
                          ["Budget", o.budget],
                          ["Location", o.location],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <dt className="text-xs text-muted-foreground">{k}</dt>
                            <dd className="text-obsidian">{v || "—"}</dd>
                          </div>
                        ))}
                        {o.description && (
                          <div className="sm:col-span-2">
                            <dt className="text-xs text-muted-foreground">Description</dt>
                            <dd className="text-obsidian whitespace-pre-line">{o.description}</dd>
                          </div>
                        )}
                      </dl>
                      {o.reference_image && (
                        <a href={o.reference_image} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={o.reference_image} alt="Customer reference" className="w-full md:w-56 h-40 rounded-md object-cover border border-black/10" />
                          <span className="text-xs text-muted-foreground mt-1 block">Reference photo · click to enlarge</span>
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
