import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, ChevronRight, Calculator } from "lucide-react";

const WHATSAPP = "254722914819";

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-[#f8f5ff] via-white to-[#f0ebff]">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text */}
          <div className="space-y-8 animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-gold rounded-full" />
              Nairobi's Premium Furniture & Glass Specialists
            </div>
            <h1 className="font-playfair text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Premium Furniture,{" "}
              <span className="text-primary">Sofas</span> &{" "}
              <span className="text-gold">Glass Solutions</span> for Modern Spaces
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-lg">
              Shop quality sofas, wardrobes, TV stands, office furniture, and custom pieces. 
              Calculate glass prices instantly and request quotes online.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/catalogue">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 gap-2 shadow-lg shadow-primary/20">
                  Browse Furniture <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/quote-calculator">
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white rounded-full px-8 gap-2">
                  <Calculator className="w-4 h-4" /> Glass Quote
                </Button>
              </Link>
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6 gap-2">
                  <MessageCircle className="w-4 h-4" /> WhatsApp Us
                </Button>
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-6 pt-2">
              {[
                { label: "Premium Products", icon: "✦" },
                { label: "Custom Orders", icon: "✦" },
                { label: "Glass Experts", icon: "✦" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-gold text-xs">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Image grid */}
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden aspect-[4/5] shadow-xl shadow-primary/10">
                  <img
                    src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=500&fit=crop"
                    alt="Premium Sofa"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden aspect-square shadow-lg shadow-primary/10">
                  <img
                    src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=300&h=300&fit=crop"
                    alt="Interior"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="rounded-2xl overflow-hidden aspect-square shadow-lg shadow-primary/10">
                  <img
                    src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop"
                    alt="Glass Mirror"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden aspect-[4/5] shadow-xl shadow-primary/10">
                  <img
                    src="https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=400&h=500&fit=crop"
                    alt="Wardrobe"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
            </div>

            {/* Floating card */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl shadow-primary/15 p-4 flex items-center gap-3 border border-border">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Instant</p>
                <p className="text-sm font-semibold text-foreground">Glass Quote</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}