import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
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

function CategoryCard({ cat, index, height }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [currentIdx, setCurrentIdx] = useState(0);

  const images = cat.images || [];

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % images.length);
    }, 4500 + index * 400);
    return () => clearInterval(timer);
  }, [images.length, index]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: (index % 4) * 0.07 }}
      className="h-full"
    >
      <Link
        to={cat.path}
        className="group block relative overflow-hidden h-full"
        style={{ height }}
      >
        {/* Images */}
        <div className="relative w-full h-full bg-[#2B211B]">
          {images.map((imgSrc, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out
                ${idx === currentIdx ? "opacity-100 z-10" : "opacity-0 z-0"}`}
            >
              <img
                src={imgSrc}
                alt={cat.label}
                className="w-full h-full object-cover transition-transform [transition-duration:1200ms] ease-out group-hover:scale-110"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 z-20
          bg-gradient-to-t from-black/80 via-black/20 to-black/30
          group-hover:from-black/90 group-hover:via-black/35 transition-all duration-500"
        />

        {/* Accent tint for custom orders */}
        {cat.accent && (
          <div className="absolute inset-0 z-20 bg-[#2B211B]/40 mix-blend-multiply
            group-hover:bg-[#B07A45]/15 transition-colors duration-700" />
        )}

        {/* Category badge */}
        <span className="absolute top-4 left-4 z-30 text-[9px] uppercase tracking-[0.3em]
          text-white/80 bg-black/30 backdrop-blur-sm px-2.5 py-1">
          {cat.sub}
        </span>

        {/* Text */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-5
          translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
          <h3
            className="font-heading text-silk font-light drop-shadow-sm leading-tight"
            style={{ fontSize: "clamp(1.1rem, 1.8vw + 0.4rem, 1.5rem)" }}
          >
            {cat.label}
          </h3>
          <div className="mt-2 h-px bg-silk/0 group-hover:bg-gold transition-colors duration-500 w-8" />
        </div>

        {/* Ring hover */}
        <div className="absolute inset-0 z-30 ring-1 ring-white/0
          group-hover:ring-white/15 transition-all duration-500 pointer-events-none" />
      </Link>
    </motion.div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

export default function FeaturedCategories() {
  const headerRef    = useRef(null);
  const headerInView = useInView(headerRef, { once: true });

  const { data: products = [] } = useQuery({
    queryKey: ["category-products"],
    queryFn:  () => base44.entities.Product.list("-created_date", 100),
  });

  const { data: glassTypes = [] } = useQuery({
    queryKey: ["category-glass"],
    queryFn:  () => base44.entities.GlassType.list("-created_date", 20),
  });

  const categories = CATEGORIES_TEMPLATE.map((cat) => {
    let imgs = [];
    if (cat.categoryId === "glass") {
      imgs = glassTypes.map((g) => g.image).filter(Boolean);
    } else if (cat.categoryId === "custom") {
      imgs = [];
    } else {
      const matching = products.filter((p) => p.category === cat.categoryId && p.images?.length > 0);
      imgs = matching.flatMap((p) => p.images).filter(Boolean);
    }
    return { ...cat, images: imgs };
  });

  const [hero, ...rest] = categories;
  const stack = rest.slice(0, 2);
  const row2  = rest.slice(2, 4);
  const row3  = rest.slice(4, 6);
  const wide  = rest[6];

  return (
    <section className="py-20 lg:py-32 bg-[#FBF8F3]">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">

        {/* Section header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14"
        >
          <div className="max-w-2xl">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-8 h-px bg-[#B07A45]" />
              <p className="text-[11px] uppercase tracking-[0.35em] text-[#B07A45] font-semibold">
                Our Collections
              </p>
            </div>
            <h2
              className="font-heading font-light text-obsidian leading-[1.1] tracking-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)" }}
            >
              Designed for<br />
              <span className="italic font-light text-[#8A7A6B]">every space</span>
            </h2>
          </div>

          <Link
            to="/catalogue"
            className="hidden md:inline-flex items-center gap-2 text-[12px] uppercase
              tracking-[0.2em] text-obsidian hover:text-[#B07A45] transition-colors duration-300"
          >
            View All Products →
          </Link>
        </motion.div>

        {/* Row 1 — Large hero (2 cols) + 2 stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 mb-3 lg:mb-4">
          <div className="lg:col-span-2 h-[380px] lg:h-[500px]">
            <CategoryCard cat={hero} index={0} />
          </div>
          <div className="grid grid-rows-2 gap-3 lg:gap-4 h-[280px] lg:h-[500px]">
            {stack.map((cat, i) => (
              <CategoryCard key={cat.label} cat={cat} index={i + 1} />
            ))}
          </div>
        </div>

        {/* Row 2 — 2 medium cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-3 lg:mb-4">
          {row2.map((cat, i) => (
            <div key={cat.label} className="h-[260px]">
              <CategoryCard cat={cat} index={i + 3} />
            </div>
          ))}
        </div>

        {/* Row 3 — 2 small cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-3 lg:mb-4">
          {row3.map((cat, i) => (
            <div key={cat.label} className="h-[220px]">
              <CategoryCard cat={cat} index={i + 5} />
            </div>
          ))}
        </div>

        {/* Row 4 — Full-width custom orders banner */}
        {wide && (
          <div className="h-[200px] lg:h-[240px]">
            <CategoryCard cat={wide} index={7} />
          </div>
        )}
      </div>
    </section>
  );
}