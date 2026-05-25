import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

const WHATSAPP = "254722914819";

const STATUS_COLORS = {
  new: "bg-amber-50 text-amber-700",
  contacted: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function AdminQuotesTab() {
  const queryClient = useQueryClient();

  const { data: quotes = [] } = useQuery({
    queryKey: ["quote-requests"],
    queryFn: () => base44.entities.QuoteRequest.list("-created_date", 50),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.QuoteRequest.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["quote-requests"] }); toast.success("Status updated"); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-foreground">Quote Requests ({quotes.length})</h2>
        <Badge className="bg-primary/10 text-primary">{quotes.filter((q) => q.status === "new").length} new</Badge>
      </div>

      <div className="space-y-3">
        {quotes.map((q) => (
          <div key={q.id} className="bg-white rounded-2xl border border-border p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{q.glass_type_name}</h3>
                  <Badge className={STATUS_COLORS[q.status]} variant="secondary">{q.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {q.width} × {q.height} {q.unit} • {q.area_sqft?.toFixed(1)} sq ft • Qty: {q.quantity}
                </p>
                <p className="text-sm">
                  {q.include_installation && <span className="text-muted-foreground mr-2">✓ Installation</span>}
                  {q.include_frame && <span className="text-muted-foreground mr-2">✓ Frame</span>}
                  {q.include_delivery && <span className="text-muted-foreground">✓ Delivery{q.delivery_location ? ` — ${q.delivery_location}` : ""}</span>}
                </p>
                <p className="font-semibold text-primary text-lg">KSh {q.estimated_total?.toLocaleString()}</p>
                {(q.customer_name || q.phone) && (
                  <p className="text-sm text-muted-foreground">{q.customer_name} {q.phone && `• ${q.phone}`}</p>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <Select value={q.status} onValueChange={(v) => updateStatus.mutate({ id: q.id, status: v })}>
                  <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["new", "contacted", "completed", "cancelled"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {q.phone && (
                  <a href={`https://wa.me/${q.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, regarding your glass quote for ${q.glass_type_name} — estimated KSh ${q.estimated_total?.toLocaleString()}. Let's confirm details.`)}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white px-3 h-9">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
        {quotes.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-white rounded-2xl border border-border">
            <span className="text-4xl block mb-3">📋</span>
            <p className="font-medium">No quote requests yet</p>
          </div>
        )}
      </div>
    </div>
  );
}