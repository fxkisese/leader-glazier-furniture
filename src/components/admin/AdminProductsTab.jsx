import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import AddProductModal from "./AddProductModal";
import { toast } from "sonner";

export default function AdminProductsTab() {
  const [showAdd, setShowAdd] = useState(false);
  const [editProd, setEditProd] = useState(null);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "admin-all"],
    queryFn: () => base44.entities.Product.list("-created_date", 100),
  });

  const togglePublish = useMutation({
    mutationFn: (p) => base44.entities.Product.update(p.id, { is_published: !p.is_published }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); toast.success("Updated"); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-foreground">Furniture Products ({products.length})</h2>
        <Button onClick={() => { setEditProd(null); setShowAdd(true); }} className="bg-primary text-white gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-border" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Product</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Price</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">🛋️</div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">{p.name}</p>
                          {p.label && <Badge variant="secondary" className="text-xs mt-0.5">{p.label.replace(/-/g, " ")}</Badge>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground capitalize">{p.category?.replace(/-/g, " ")}</td>
                    <td className="p-4 font-medium">KSh {p.price?.toLocaleString()}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <Badge className={p.stock_status === "in-stock" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} variant="secondary">
                          {p.stock_status?.replace(/-/g, " ")}
                        </Badge>
                        {!p.is_published && <Badge variant="outline" className="text-xs">Draft</Badge>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary hover:text-white h-8 w-8 p-0"
                          onClick={() => { setEditProd(p); setShowAdd(true); }}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="border-border text-muted-foreground hover:bg-muted h-8 w-8 p-0"
                          onClick={() => togglePublish.mutate(p)}>
                          {p.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {products.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <span className="text-4xl block mb-3">🛋️</span>
              <p className="font-medium">No products yet</p>
              <p className="text-sm">Click "Add Product" to get started</p>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <AddProductModal
          product={editProd}
          onClose={() => { setShowAdd(false); setEditProd(null); }}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ["products"] }); setShowAdd(false); }}
        />
      )}
    </div>
  );
}