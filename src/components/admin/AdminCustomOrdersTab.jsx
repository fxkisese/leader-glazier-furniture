import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const STATUS_COLORS = {
  new: "bg-amber-50 text-amber-700",
  reviewed: "bg-blue-50 text-blue-700",
  quoted: "bg-purple-50 text-purple-700",
  "in-progress": "bg-indigo-50 text-indigo-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function AdminCustomOrdersTab() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["custom-orders"],
    queryFn: () => base44.entities.CustomOrderRequest.list("-created_date", 50),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.CustomOrderRequest.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["custom-orders"] }); toast.success("Updated"); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-foreground">Custom Orders ({orders.length})</h2>
        <Badge className="bg-primary/10 text-primary">{orders.filter((o) => o.status === "new").length} new</Badge>
      </div>

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{o.product_type}</h3>
                    <Badge className={STATUS_COLORS[o.status]} variant="secondary">{o.status}</Badge>
                  </div>
                  <p className="font-medium text-foreground">{o.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{o.phone} {o.location && `• ${o.location}`}</p>
                  {o.budget && <p className="text-sm">Budget: <span className="font-medium">{o.budget}</span></p>}
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <Select value={o.status} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}>
                    <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["new", "reviewed", "quoted", "in-progress", "completed", "cancelled"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-9 border-border px-3" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  {o.phone && (
                    <a href={`https://wa.me/${o.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${o.customer_name}, thank you for your custom order request for ${o.product_type}. We'd like to discuss the details with you.`)}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white px-3 h-9">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {expanded === o.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-3 text-sm">
                  {o.measurements && <div><span className="text-muted-foreground">Measurements: </span><span>{o.measurements}</span></div>}
                  {o.preferred_material && <div><span className="text-muted-foreground">Material: </span><span>{o.preferred_material}</span></div>}
                  {o.description && <div><span className="text-muted-foreground">Description: </span><span>{o.description}</span></div>}
                  {o.reference_image && (
                    <div>
                      <p className="text-muted-foreground mb-1">Reference Image:</p>
                      <img src={o.reference_image} alt="Reference" className="w-40 h-32 rounded-xl object-cover border border-border" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-white rounded-2xl border border-border">
            <span className="text-4xl block mb-3">✨</span>
            <p className="font-medium">No custom orders yet</p>
          </div>
        )}
      </div>
    </div>
  );
}