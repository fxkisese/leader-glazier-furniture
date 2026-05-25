import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import ProductCard from "../components/products/ProductCard";
import AddProductModal from "../components/admin/AddProductModal";
import { useAuth } from "@/lib/AuthContext";

const CATEGORIES = [
  { value: "all", label: "All Furniture" },
  { value: "sofas", label: "Sofas" },
  { value: "wardrobes", label: "Wardrobes" },
  { value: "tv-stands", label: "TV Stands" },
  { value: "beds", label: "Beds" },
  { value: "shoe-racks", label: "Shoe Racks" },
  { value: "office-desks", label: "Office Desks" },
  { value: "office-chairs", label: "Office Chairs" },
  { value: "coffee-tables", label: "Coffee Tables" },
  { value: "dining-sets", label: "Dining Sets" },
  { value: "cabinets", label: "Cabinets" },
  { value: "chest-of-drawers", label: "Chest of Drawers" },
  { value: "custom-furniture", label: "Custom Furniture" },
];

export default function Catalogue() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const queryClient = useQueryClient();

  // Parse URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    if (cat) setCategory(cat);
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", category],
    queryFn: () => {
      const filter = { is_published: true };
      if (category !== "all") filter.category = category;
      return base44.entities.Product.filter(filter, "-created_date", 50);
    },
  });

  const filtered = products.filter((p) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.material?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#f8f5ff] to-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <p className="text-gold text-sm font-medium uppercase tracking-widest mb-2">Our Collection</p>
          <h1 className="font-playfair text-3xl lg:text-4xl font-bold text-foreground">Furniture Catalogue</h1>
          <p className="text-muted-foreground mt-2 max-w-lg">Browse our full range of premium furniture for homes and offices.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search furniture..."
              className="pl-10 rounded-xl border-border"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-52 rounded-xl">
              <SlidersHorizontal className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.slice(0, 8).map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${category === c.value ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border hover:border-primary/40 hover:text-primary"}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} onEdit={isAdmin ? (p) => { setEditProduct(p); setShowAddModal(true); } : undefined} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 text-muted-foreground">
            <span className="text-5xl block mb-4">🛋️</span>
            <p className="font-medium text-lg">No products found</p>
            <p className="text-sm mt-1">Try a different category or search term</p>
          </div>
        )}

        {/* Admin Add Button */}
        {isAdmin && (
          <button
            onClick={() => { setEditProduct(null); setShowAddModal(true); }}
            className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
            title="Add New Product"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      {showAddModal && (
        <AddProductModal
          product={editProduct}
          onClose={() => { setShowAddModal(false); setEditProduct(null); }}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ["products"] }); setShowAddModal(false); }}
        />
      )}
    </div>
  );
}