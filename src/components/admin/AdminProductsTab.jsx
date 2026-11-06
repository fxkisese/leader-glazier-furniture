import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Eye, EyeOff, Search, Package, Star } from "lucide-react";
import AddProductModal from "./AddProductModal";
import { toast } from "sonner";
import {
  PageHeader, Panel, EmptyState, ErrorState, ListSkeleton, FilterChips, Pill,
  PRODUCT_CATEGORIES, humanize, formatKsh,
} from "./adminShared";

const needsPrice = (p) => !(Number(p.price) > 0);

export default function AdminProductsTab() {
  const [modal, setModal] = useState(null); // null | "new" | product
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, error, refetch } = useQuery({
    queryKey: ["products", "admin-all"],
    queryFn: () => base44.entities.Product.list("-created_date", 500),
  });

  const togglePublish = useMutation({
    mutationFn: (p) => base44.entities.Product.update(p.id, { is_published: !p.is_published }),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(p.is_published ? `“${p.name}” is now live` : `“${p.name}” hidden from the website`);
    },
    onError: (err) => toast.error(`Couldn't update: ${err.message}`),
  });

  const onTogglePublish = (p) => {
    if (!p.is_published && needsPrice(p)) {
      toast.error("Add a price before publishing.");
      setModal(p);
      return;
    }
    togglePublish.mutate(p);
  };

  const counts = useMemo(() => ({
    all: products.length,
    live: products.filter((p) => p.is_published).length,
    draft: products.filter((p) => !p.is_published).length,
    price: products.filter(needsPrice).length,
  }), [products]);

  const filtered = products.filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (status === "live" && !p.is_published) return false;
    if (status === "draft" && p.is_published) return false;
    if (status === "price" && !needsPrice(p)) return false;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Products"
        description="Everything in your furniture catalogue. Drafts are hidden from customers until you publish them."
        actions={
          <Button onClick={() => setModal("new")} className="bg-obsidian hover:bg-obsidian/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Add product
          </Button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between mb-4">
        <FilterChips
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "live", label: "Live", count: counts.live },
            { value: "draft", label: "Drafts", count: counts.draft },
            ...(counts.price ? [{ value: "price", label: "Missing price", count: counts.price }] : []),
          ]}
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All categories</option>
            {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
          </select>
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="pl-9 h-9 bg-white" />
          </div>
        </div>
      </div>

      <Panel className="overflow-hidden">
        {isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products yet"
              description="Add your first product, or use Bulk Upload to add many photos at once."
              action={<Button onClick={() => setModal("new")} className="bg-obsidian text-white gap-2"><Plus className="w-4 h-4" /> Add product</Button>}
            />
          ) : (
            <EmptyState icon={Search} title="No matching products" description="Try a different search or filter." />
          )
        ) : (
          <ul className="divide-y divide-black/5">
            <li className="hidden md:grid grid-cols-[1fr_150px_130px_140px_96px] gap-4 px-5 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Product</span><span>Category</span><span>Price</span><span>Status</span><span className="text-right">Actions</span>
            </li>
            {filtered.map((p) => (
              <li key={p.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_150px_130px_140px_96px] gap-x-4 gap-y-1 items-center px-5 py-3 hover:bg-muted/30 transition-colors">
                <button onClick={() => setModal(p)} className="flex items-center gap-3 min-w-0 text-left">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt="" className="w-12 h-12 rounded-md object-cover border border-black/10 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-muted-foreground" /></div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-obsidian truncate flex items-center gap-1.5">
                      {p.name}
                      {p.is_featured && <Star className="w-3.5 h-3.5 fill-gold text-gold shrink-0" aria-label="Featured on homepage" />}
                    </p>
                    <p className="text-xs text-muted-foreground md:hidden">{humanize(p.category || "")} · {needsPrice(p) ? "No price" : formatKsh(p.price)}</p>
                  </div>
                </button>
                <span className="hidden md:block text-sm text-muted-foreground">{humanize(p.category || "—")}</span>
                <span className="hidden md:block text-sm font-medium">
                  {needsPrice(p) ? <span className="text-amber-600">Not set</span> : formatKsh(p.discount_price || p.price)}
                </span>
                <span className="hidden md:flex flex-wrap gap-1">
                  {p.is_published ? <Pill tone="green">Live</Pill> : <Pill>Draft</Pill>}
                  {p.stock_status && p.stock_status !== "in-stock" && <Pill tone="amber">{humanize(p.stock_status)}</Pill>}
                </span>
                <div className="flex justify-end gap-1 row-span-2 md:row-span-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Edit" onClick={() => setModal(p)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={p.is_published ? "Hide from website" : "Publish"}
                    title={p.is_published ? "Hide from website" : "Publish"}
                    disabled={togglePublish.isPending && togglePublish.variables?.id === p.id}
                    onClick={() => onTogglePublish(p)}
                  >
                    {p.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {modal && (
        <AddProductModal
          product={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ["products"] }); setModal(null); }}
        />
      )}
    </div>
  );
}
