import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, ChevronRight, Calculator } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const WHATSAPP = "254110767199";

export default function HeroSection() {
  const { data: allProducts = [] } = useQuery({
    queryKey: ["hero-products-all"],
    queryFn: () => base44.entities.Product.filter({ is_published: true }, "-created_date", 20),
  });

  // Try to use featured products first
  let heroImages = allProducts
    .filter(p => p.is_featured && p.images?.length > 0)
    .map(p => p.images[0]);

  // If no featured products have images, use any recent product with an image
  if (heroImages.length === 0) {
    heroImages = allProducts
      .filter(p => p.images?.length > 0)
      .map(p => p.images[0])
      .slice(0, 6);
  }

  const [currentIndex, setCurrentIndex] = useState(0);

  const fallbackImages = [
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1558997519-83ea9252edc8?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop"
  ];

  const wordplays = [
    "Sofa, so good.",
    "Take a seat, you've earned it.",
    "Wood you believe it?",
    "Table your worries.",
    "We've got your back (and your seat)."
  ];

  const displayImages = heroImages.length > 0 ? heroImages : fallbackImages;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [displayImages.length]);

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
              Kenyan Artisan Craftsmanship & Custom Glass
            </div>
            <h1 className="font-playfair text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Authentic <span className="text-primary">Handcrafted</span> Furniture & <span className="text-gold">Glass Solutions</span> for Kenyan Homes
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-lg">
              Locally sourced and custom handcrafted furniture built by master Kenyan artisans. Get bespoke sofas, wardrobes, dining sets, and instant custom glass quotes with delivery countrywide.
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
                { label: "Handcrafted in Kenya", icon: "✦" },
                { label: "Bespoke Custom Orders", icon: "✦" },
                { label: "Countrywide Delivery", icon: "✦" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-gold text-xs">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Image Shuffler */}
          <div className="relative hidden lg:block h-[600px] w-full rounded-3xl overflow-hidden shadow-2xl bg-[#f8f5ff] border border-primary/10">
            {displayImages.map((src, idx) => (
              <div 
                key={idx}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                {/* Blurred background */}
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110"
                  aria-hidden="true"
                />
                <img
                  src={src}
                  alt="Furniture"
                  className="relative w-full h-full object-contain scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                <div className="absolute bottom-12 left-0 right-0 text-center px-4 animate-fade-up">
                  <p className="text-white font-playfair text-3xl font-bold italic tracking-wide drop-shadow-md bg-black/30 inline-block px-6 py-2 rounded-full backdrop-blur-sm">
                    {wordplays[idx % wordplays.length]}
                  </p>
                </div>
              </div>
            ))}

            {/* Floating card */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl shadow-primary/15 p-4 flex items-center gap-3 border border-border z-20">
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