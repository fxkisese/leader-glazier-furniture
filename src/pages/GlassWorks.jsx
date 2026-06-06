import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Calculator, MessageCircle, CheckCircle2 } from "lucide-react";
import AddGlassModal from "../components/admin/AddGlassModal";
import { useAuth } from "@/lib/AuthContext";

const WHATSAPP = "254722914819";

const SAMPLE_GLASS = [
  { id: "1", name: "Mirror Glass", category: "mirror", price_per_sqft: 700, thickness: "4mm, 6mm", description: "Full-length mirrors, bathroom mirrors, decorative wall mirrors.", image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop", is_available: true },
  { id: "2", name: "Toughened Glass", category: "toughened", price_per_sqft: 850, thickness: "6mm, 8mm, 10mm, 12mm", description: "Ideal for doors, table tops, partitions, and shower enclosures.", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop", is_available: true },
  { id: "3", name: "Frosted Glass", category: "frosted", price_per_sqft: 650, thickness: "4mm, 6mm", description: "Privacy glass for bathrooms, office doors, and decorative panels.", image: "https://images.unsplash.com/photo-1549187774-b4e9b0445b41?w=400&h=300&fit=crop", is_available: true },
  { id: "4", name: "Clear Float Glass", category: "clear", price_per_sqft: 450, thickness: "3mm, 4mm, 5mm, 6mm", description: "Standard clear glass for windows, display cabinets, and picture frames.", image: "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=400&h=300&fit=crop", is_available: true },
  { id: "5", name: "Office Partition Glass", category: "office-partition", price_per_sqft: 950, thickness: "8mm, 10mm", description: "Modern glass partitions for offices, boardrooms, and reception areas.", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop", is_available: true },
  { id: "6", name: "Shower Glass", category: "shower", price_per_sqft: 1100, thickness: "8mm, 10mm, 12mm", description: "Frameless and semi-frameless shower enclosures and panels.", image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop", is_available: true },
  { id: "7", name: "Tinted Glass", category: "tinted", price_per_sqft: 600, thickness: "4mm, 6mm", description: "Grey, bronze, and blue tints for windows and facades.", image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&h=300&fit=crop", is_available: true },
  { id: "8", name: "Decorative Glass", category: "decorative", price_per_sqft: 800, thickness: "4mm, 6mm", description: "Patterned and etched glass for doors, cabinets, and feature walls.", image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=400&h=300&fit=crop", is_available: true },
];

export default function GlassWorks() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [showAddModal, setShowAddModal] = useState(false);
  const [editGlass, setEditGlass] = useState(null);
  const queryClient = useQueryClient();

  const { data: glassTypes = [] } = useQuery({
    queryKey: ["glass-types"],
    queryFn: () => base44.entities.GlassType.list("-created_date"),
  });

  const display = glassTypes.length > 0 ? glassTypes : SAMPLE_GLASS;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#f8f5ff] to-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <p className="text-gold text-sm font-medium uppercase tracking-widest mb-2">Glass Solutions</p>
          <h1 className="font-playfair text-3xl lg:text-4xl font-bold text-foreground">Glass & Mirror Works</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">Professional glass cutting, mirror installation, and glazier services. Selected, cut to size, and delivered countrywide in Kenya. Select any glass type to get an instant quote.</p>
          <div className="flex gap-3 mt-6">
            <Link to="/quote-calculator">
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-full gap-2">
                <Calculator className="w-4 h-4" /> Calculate Quote
              </Button>
            </Link>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white rounded-full gap-2">
                <MessageCircle className="w-4 h-4" /> Ask on WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {display.map((glass) => (
            <div
              key={glass.id}
              className="bg-white rounded-2xl overflow-hidden border border-border hover:border-primary/20 hover:shadow-xl hover:shadow-primary/8 transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                {glass.image ? (
                  <img src={glass.image} alt={glass.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🪟</div>
                )}
                <div className="absolute top-3 right-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${glass.is_available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {glass.is_available ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{glass.category?.replace(/-/g, " ")}</p>
                  <h3 className="font-semibold text-foreground mt-1">{glass.name}</h3>
                  {glass.thickness && <p className="text-xs text-muted-foreground mt-0.5">Thickness: {glass.thickness}</p>}
                </div>
                {glass.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{glass.description}</p>}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs text-muted-foreground">Price per sq ft</p>
                    <p className="text-lg font-bold text-primary">KSh {glass.price_per_sqft?.toLocaleString()}</p>
                  </div>
                  <Link to={`/quote-calculator?glass=${encodeURIComponent(glass.name)}`}>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-white rounded-lg text-xs gap-1">
                      <Calculator className="w-3 h-3" /> Get Quote
                    </Button>
                  </Link>
                </div>
                {isAdmin && (
                  <Button size="sm" variant="outline" className="w-full text-xs border-primary/30 text-primary" onClick={() => { setEditGlass(glass); setShowAddModal(true); }}>
                    Edit
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Admin Add Button */}
        {isAdmin && (
          <button
            onClick={() => { setEditGlass(null); setShowAddModal(true); }}
            className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
            title="Add Glass Type"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      {showAddModal && (
        <AddGlassModal
          glass={editGlass}
          onClose={() => { setShowAddModal(false); setEditGlass(null); }}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ["glass-types"] }); setShowAddModal(false); }}
        />
      )}
    </div>
  );
}