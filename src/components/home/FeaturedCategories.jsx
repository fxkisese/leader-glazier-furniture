import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useRef } from "react";
import { useInView } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const CATEGORIES_TEMPLATE = [
  {
    label: "Sofas",
    sub: "L-Shaped · 3-Seater · Custom",
    path: "/catalogue?category=sofas",
    categoryId: "sofas",
    span: "large",
  },
  {
    label: "Wardrobes",
    sub: "Built-in · Sliding · Mirrored",
    path: "/catalogue?category=wardrobes",
    categoryId: "wardrobes",
    span: "small",
  },
  {
    label: "TV Stands",
    sub: "Modern · Floating · Storage",
    path: "/catalogue?category=tv-stands",
    categoryId: "tv-stands",
    span: "small",
  },
  {
    label: "Beds",
    sub: "King · Queen · Upholstered",
    path: "/catalogue?category=beds",
    categoryId: "beds",
    span: "medium",
  },
  {
    label: "Glass & Mirrors",
    sub: "Bathroom · Office · Décor",
    path: "/glass",
    categoryId: "glass",
    span: "medium",
  },
  {
    label: "Dining Sets",
    sub: "4–8 Seater · Modern · Classic",
    path: "/catalogue?category=dining-sets",
    categoryId: "dining-sets",
    span: "small",
  },
  {
    label: "Office Furniture",
    sub: "Desks · Chairs · Partitions",
    path: "/catalogue?category=office-desks",
    categoryId: "office-desks",
    span: "small",
  },
  {
    label: "Custom Orders",
    sub: "Your Vision, Crafted to Order",
    path: "/custom-orders",
    categoryId: "custom",
    span: "wide",
    accent: true,
  },
];

function CategoryCard({ cat, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: (index % 4) * 0.08 }}
    >
      <Link to={cat.path} className="group block relative overflow-hidden rounded-2xl">
        {/* Image */}
        <div className="overflow-hidden w-full h-full bg-muted/20">
          {cat.image ? (
            <img
              src={cat.image}
              alt={cat.label}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/5">
              <span className="text-4xl opacity-30">🛋️</span>
            </div>
          )}
        </div>

        {/* Gradient overlay — always present, deepens on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent transition-all duration-500 group-hover:from-black/85 group-hover:via-black/35" />

        {/* Accent tint for custom orders */}
        {cat.accent && (
          <div className="absolute inset-0 bg-primary/30 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-70" />
        )}

        {/* Text */}
        <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
          <p className="text-white/60 text-[10px] uppercase tracking-[0.18em] font-medium mb-1 transition-colors duration-300 group-hover:text-gold">
            {cat.sub}
          </p>
          <h3 className="font-playfair text-white font-bold leading-tight drop-shadow-sm"
            style={{ fontSize: "clamp(1rem, 1.4vw + 0.5rem, 1.35rem)" }}>
            {cat.label}
          </h3>
        </div>

        {/* Hover border glow */}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/0 group-hover:ring-white/20 transition-all duration-500 pointer-events-none" />
      </Link>
    </motion.div>
  );
}

export default function FeaturedCategories() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true });

  const { data: products = [] } = useQuery({
    queryKey: ["category-products"],
    queryFn: () => base44.entities.Product.list("-created_date", 100),
  });

  const { data: glassTypes = [] } = useQuery({
    queryKey: ["category-glass"],
    queryFn: () => base44.entities.GlassType.list("-created_date", 20),
  });

  const categories = CATEGORIES_TEMPLATE.map((cat) => {
    let img = null;
    if (cat.categoryId === "glass") {
      img = glassTypes.find(g => g.image)?.image || null;
    } else if (cat.categoryId === "custom") {
      img = null; // We can leave custom without image and let accent take over
    } else {
      img = products.find(p => p.category === cat.categoryId && p.images?.[0])?.images?.[0] || null;
    }
    return { ...cat, image: img };
  });

  // Split into layout groups
  const [hero, ...rest] = categories;
  const stack = rest.slice(0, 2);   // Wardrobes, TV Stands → right column
  const row2 = rest.slice(2, 4);   // Beds, Mirrors → medium cards
  const row3 = rest.slice(4, 6);   // Dining, Office → small
  const wide = rest[6];             // Custom Orders → full-width banner

  return (
    <section className="py-16 lg:py-24" style={{ background: "#FAF8F6" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-10 lg:mb-14"
        >
          <p className="text-gold font-medium text-xs uppercase tracking-[0.2em] mb-3">Our Collections</p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2 className="font-playfair text-3xl lg:text-4xl font-bold text-foreground leading-tight max-w-sm">
              Designed for<br className="hidden sm:block" /> Every Space
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              Bespoke furniture, glass solutions, and custom orders — proudly handcrafted in Kenya and delivered countrywide.
            </p>
          </div>
        </motion.div>

        {/* ── Row 1: Large hero + 2 stacked smalls ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 mb-3 lg:mb-4">
          {/* Hero — spans 2 cols */}
          <div className="lg:col-span-2 h-[380px] lg:h-[480px]">
            <CategoryCard cat={hero} index={0} />
          </div>
          {/* Right stack */}
          <div className="grid grid-rows-2 gap-3 lg:gap-4 h-[280px] lg:h-[480px]">
            {stack.map((cat, i) => (
              <CategoryCard key={cat.label} cat={cat} index={i + 1} />
            ))}
          </div>
        </div>

        {/* ── Row 2: 2 medium cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-3 lg:mb-4">
          {row2.map((cat, i) => (
            <div key={cat.label} className="h-[260px]">
              <CategoryCard cat={cat} index={i + 3} />
            </div>
          ))}
        </div>

        {/* ── Row 3: 2 small cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-3 lg:mb-4">
          {row3.map((cat, i) => (
            <div key={cat.label} className="h-[220px]">
              <CategoryCard cat={cat} index={i + 5} />
            </div>
          ))}
        </div>

        {/* ── Row 4: Full-width custom orders banner ── */}
        {wide && (
          <div className="h-[200px] lg:h-[240px]">
            <CategoryCard cat={wide} index={7} />
          </div>
        )}
      </div>
    </section>
  );
}