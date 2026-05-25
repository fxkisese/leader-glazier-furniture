import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit } from "lucide-react";
import AddGlassModal from "./AddGlassModal";

export default function AdminGlassTab() {
  const [showAdd, setShowAdd] = useState(false);
  const [editGlass, setEditGlass] = useState(null);
  const queryClient = useQueryClient();

  const { data: glassTypes = [] } = useQuery({
    queryKey: ["glass-types"],
    queryFn: () => base44.entities.GlassType.list("-created_date"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-foreground">Glass Types ({glassTypes.length})</h2>
        <Button onClick={() => { setEditGlass(null); setShowAdd(true); }} className="bg-primary text-white gap-2">
          <Plus className="w-4 h-4" /> Add Glass Type
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {glassTypes.map((g) => (
          <div key={g.id} className="bg-white rounded-2xl border border-border overflow-hidden hover:border-primary/20 transition-colors">
            {g.image && <img src={g.image} alt={g.name} className="w-full h-32 object-cover" />}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{g.name}</h3>
                <Badge className={g.is_available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"} variant="secondary">
                  {g.is_available ? "Available" : "N/A"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{g.category?.replace(/-/g, " ")} • {g.thickness}</p>
              <p className="text-lg font-bold text-primary">KSh {g.price_per_sqft?.toLocaleString()}/sq ft</p>
              {g.installation_price && <p className="text-xs text-muted-foreground">Installation: KSh {g.installation_price?.toLocaleString()}</p>}
              <Button size="sm" variant="outline" className="w-full border-primary/30 text-primary gap-1.5"
                onClick={() => { setEditGlass(g); setShowAdd(true); }}>
                <Edit className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>
          </div>
        ))}
        {glassTypes.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground bg-white rounded-2xl border border-border">
            <span className="text-4xl block mb-3">🪟</span>
            <p className="font-medium">No glass types yet</p>
          </div>
        )}
      </div>

      {showAdd && (
        <AddGlassModal
          glass={editGlass}
          onClose={() => { setShowAdd(false); setEditGlass(null); }}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ["glass-types"] }); setShowAdd(false); }}
        />
      )}
    </div>
  );
}