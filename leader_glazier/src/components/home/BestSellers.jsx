import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ProductCard from "../products/ProductCard";

const PLACEHOLDER_PRODUCTS = [
  { id: "1", name: "Royal Purple 5-Seater Sofa", category: "sofas", price: 65000, label: "best-seller", images: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop"], material: "Fabric/Velvet", stock_status: "in-stock" },
  { id: "2", name: "Modern TV Stand", category: "tv-stands", price: 18500, label: "new-arrival", images: ["https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400&h=300&fit=crop"], material: "Wood", stock_status: "in-stock" },
  { id: "3", name: "6-Door Wardrobe", category: "wardrobes", price: 45000, images: ["https://images.unsplash.com/photo-1558997519-83ea9252edc8?w=400&h=300&fit=crop"], material: "Wood", stock_status: "in-stock" },
  { id: "4", name: "Executive Office Desk", category: "office-desks", price: 28000, label: "best-seller", images: ["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=300&fit=crop"], material: "Wood/Glass", stock_status: "in-stock" },
  { id: "5", name: "Luxury Bed Frame", category: "beds", price: 38000, images: ["https://images.unsplash.com/photo-1505693314120-0d443867891c?w=400&h=300&fit=crop"], material: "Wood", stock_status: "in-stock" },
  { id: "6", name: "L-Shaped Corner Sofa", category: "sofas", price: 85000, label: "limited-offer", images: ["https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&h=300&fit=crop"], material: "Leather", stock_status: "in-stock" },
];

export default function BestSellers() {
  const { data: products = [] } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => base44.entities.Product.filter({ is_featured: true, is_published: true }, "-created_date", 6),
  });

  const displayProducts = products.length > 0 ? products : PLACEHOLDER_PRODUCTS;

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
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}