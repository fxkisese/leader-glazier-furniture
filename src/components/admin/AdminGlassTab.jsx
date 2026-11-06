import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Layers } from "lucide-react";
import AddGlassModal from "./AddGlassModal";
import { PageHeader, Panel, EmptyState, ErrorState, Pill, formatKsh, humanize } from "./adminShared";

export default function AdminGlassTab() {
  const [modal, setModal] = useState(null); // null | "new" | glass type
  const queryClient = useQueryClient();

  const { data: glassTypes = [], isLoading, error, refetch } = useQuery({
    queryKey: ["glass-types"],
    queryFn: () => base44.entities.GlassType.list("-created_date"),
  });

  return (
    <div>
      <PageHeader
        title="Glass Types"
        description="Prices here power the instant glass quote calculator on the website."
        actions={
          <Button onClick={() => setModal("new")} className="bg-obsidian hover:bg-obsidian/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Add glass type
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 rounded-lg bg-white border border-black/10 animate-pulse" />)}
        </div>
      ) : error ? (
        <Panel><ErrorState error={error} onRetry={refetch} /></Panel>
      ) : glassTypes.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Layers}
            title="No glass types yet"
            description="Add the glass you sell so customers can get instant quotes."
            action={<Button onClick={() => setModal("new")} className="bg-obsidian text-white gap-2"><Plus className="w-4 h-4" /> Add glass type</Button>}
          />
        </Panel>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {glassTypes.map((g) => (
            <button
              key={g.id}
              onClick={() => setModal(g)}
              className="text-left bg-white rounded-lg border border-black/10 overflow-hidden hover:border-obsidian/30 hover:shadow-sm transition-all group"
            >
              {g.image ? (
                <img src={g.image} alt={g.name} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-muted flex items-center justify-center"><Layers className="w-8 h-8 text-muted-foreground" /></div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-obsidian">{g.name}</h3>
                  {g.is_available ? <Pill tone="green">Available</Pill> : <Pill>Unavailable</Pill>}
                </div>
                <p className="text-xs text-muted-foreground">{humanize(g.category || "")}{g.thickness && ` · ${g.thickness}`}</p>
                <div className="flex items-end justify-between pt-1">
                  <div>
                    <p className="text-lg font-semibold text-obsidian">{formatKsh(g.price_per_sqft)}<span className="text-xs font-normal text-muted-foreground"> / sq ft</span></p>
                    {g.installation_price > 0 && <p className="text-xs text-muted-foreground">Installation {formatKsh(g.installation_price)}</p>}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-obsidian"><Edit className="w-3.5 h-3.5" /> Edit</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {modal && (
        <AddGlassModal
          glass={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ["glass-types"] }); setModal(null); }}
        />
      )}
    </div>
  );
}
