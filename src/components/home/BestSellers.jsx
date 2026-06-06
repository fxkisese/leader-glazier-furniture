import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ProductCard from "../products/ProductCard";


export default function BestSellers() {
  const { data: products = [] } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => base44.entities.Product.filter({ is_featured: true, is_published: true }, "homepage_order", 6),
  });

  if (products.length === 0) return null;

  return (
    <section className="py-16 lg:py-24 bg-[#f8f5ff]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-gold font-medium text-sm uppercase tracking-widest mb-2">Handpicked for You</p>
            <h2 className="font-playfair text-3xl lg:text-4xl font-bold text-foreground">Best Sellers</h2>
          </div>
          <Link to="/catalogue">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white rounded-full">
              View All Products
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}