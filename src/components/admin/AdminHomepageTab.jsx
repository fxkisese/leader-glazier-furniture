import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Save, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, ErrorState } from "./adminShared";
import AdminHeroMedia from "./AdminHeroMedia";

export default function AdminHomepageTab() {
  const queryClient = useQueryClient();
  const [localOrder, setLocalOrder] = useState({});

  const { data: featuredProducts = [], isLoading, error, refetch } = useQuery({
    queryKey: ["products", "featured-admin"],
    queryFn: () => base44.entities.Product.filter({ is_featured: true }, "homepage_order"),
  });

  // Initialize local state when data loads
  useEffect(() => {
    if (featuredProducts.length > 0) {
      const initial = {};
      featuredProducts.forEach(p => {
        initial[p.id] = p.homepage_order || 0;
      });
      setLocalOrder(initial);
    }
  }, [featuredProducts]);

  const updateOrder = useMutation({
    mutationFn: async (updates) => {
      // Updates is an array of { id, homepage_order }
      const promises = updates.map(u => base44.entities.Product.update(u.id, { homepage_order: u.homepage_order }));
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Homepage order saved");
    },
    onError: (err) => toast.error(`Couldn't save: ${err.message}`),
  });

  const removeFeatured = useMutation({
    mutationFn: (id) => base44.entities.Product.update(id, { is_featured: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Removed from homepage");
    },
    onError: (err) => toast.error(`Couldn't update: ${err.message}`),
  });

  const handleSaveAll = () => {
    const updates = Object.keys(localOrder).map(id => ({
      id,
      homepage_order: parseInt(localOrder[id], 10) || 0
    }));
    updateOrder.mutate(updates);
  };

  const handleOrderChange = (id, val) => {
    setLocalOrder(prev => ({ ...prev, [id]: val }));
  };

  return (
    <div>
      <PageHeader
        title="Homepage"
        description="Set the photos and videos in the big hero slideshow, and the order of featured products. Featured products only fill the hero when no hero media is added."
        actions={
          <Button
            onClick={handleSaveAll}
            disabled={updateOrder.isPending || featuredProducts.length === 0}
            className="bg-obsidian hover:bg-obsidian/90 text-white gap-2"
          >
            <Save className="w-4 h-4" />
            {updateOrder.isPending ? "Saving…" : "Save order"}
          </Button>
        }
      />
      <AdminHeroMedia />
      <h2 className="font-semibold text-obsidian mb-3">Featured products</h2>
      <div className="bg-white rounded-lg border border-black/10 p-2 sm:p-4">
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground font-medium mb-1">No featured products found.</p>
            <p className="text-sm text-muted-foreground/70">Open a product under Products and tick “Feature on homepage”.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground w-24">Order</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Product</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Placement Info</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {featuredProducts.map((p, index) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <Input 
                        type="number" 
                        className="w-20 text-center"
                        value={localOrder[p.id] !== undefined ? localOrder[p.id] : (p.homepage_order || 0)}
                        onChange={(e) => handleOrderChange(p.id, e.target.value)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg">🖼️</div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.category?.replace(/-/g, " ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {index < 4 ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20">Hero Image #{index + 1}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">Featured Grid</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => {
                          if (confirm("Remove this product from the homepage?")) {
                            removeFeatured.mutate(p.id);
                          }
                        }}
                      >
                        <EyeOff className="w-4 h-4 mr-1.5" /> Unfeature
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
