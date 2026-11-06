import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, MessageCircle, Facebook, Instagram, ShoppingCart, Search } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { FEATURES } from "@/lib/features";

const WHATSAPP = "254110767199";

const allNavLinks = [
  { label: "Home",           path: "/" },
  { label: "Furniture",      path: "/catalogue" },
  { label: "Glass & Mirrors",path: "/glass" },
  { label: "Glass Quote",    path: "/quote-calculator" },
  { label: "Custom Orders",  path: "/custom-orders" },
  { label: "Gallery",        path: "/gallery" },
  { label: "About",          path: "/about" },
  { label: "Contact",        path: "/contact" },
];
const navLinks = allNavLinks.filter((l) => FEATURES.glassQuote || l.path !== "/quote-calculator");

export default function Navbar() {
  const [open, setOpen]       = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location              = useLocation();
  const { getCartCount, setIsCartOpen } = useCart();
  const cartCount = getCartCount();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500
        ${scrolled
          ? "bg-obsidian/95 backdrop-blur-md shadow-2xl shadow-black/30"
          : "bg-obsidian"
        }`}
    >
      {/* ── Top bar ───────────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 lg:h-[72px]">

          {/* Logo */}
          <Link to="/" className="flex flex-col leading-tight shrink-0">
            <span
              className="font-heading font-semibold text-silk text-xl lg:text-2xl tracking-tight leading-none"
              style={{ letterSpacing: "-0.01em" }}
            >
              Craftsman Galore
            </span>
            <span className="text-[10px] text-gold font-body font-semibold uppercase tracking-[0.28em]">
              & Furniture
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden xl:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-3.5 py-2 text-[12px] font-body font-semibold uppercase tracking-[0.12em]
                  transition-colors duration-200
                  ${location.pathname === link.path
                    ? "text-gold"
                    : "text-silk/70 hover:text-silk"
                  }`}
              >
                {link.label}
                {location.pathname === link.path && (
                  <span className="absolute bottom-0 left-3.5 right-3.5 h-px bg-gold" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="hidden xl:flex items-center gap-2">
            {/* Socials */}
            <div className="flex items-center gap-1 mr-1 pr-4 border-r border-silk/10">
              <a
                href="https://www.facebook.com/share/1HT1RuZTg7/"
                aria-label="Facebook"
                className="p-2 text-silk/40 hover:text-silk transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/craftsman_galore/"
                aria-label="Instagram"
                className="p-2 text-silk/40 hover:text-silk transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>

            {/* Cart */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-silk/50 hover:text-silk transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span
                  className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center
                    text-[9px] font-bold bg-gold text-obsidian rounded-full"
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* WhatsApp CTA */}
            <a
              href={`https://wa.me/${WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 inline-flex items-center gap-2 h-9 px-5
                bg-[#25D366] hover:bg-[#1ebe5d] text-white
                text-[11px] font-bold uppercase tracking-[0.14em]
                transition-colors duration-200"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>

          {/* Mobile toggle */}
          <div className="xl:hidden flex items-center gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-silk/50 hover:text-silk transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold bg-gold text-obsidian rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="p-2 text-silk/70 hover:text-silk transition-colors"
              aria-label="Menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Category strip (desktop) ───────────────────── */}
      <div className="hidden xl:block border-t border-silk/10">
        <div className="max-w-[1600px] mx-auto px-10">
          <div className="flex items-center gap-8 h-10 overflow-x-auto scrollbar-none">
            {["Sofas", "Wardrobes", "TV Stands", "Beds", "Dining Sets", "Office Furniture", "Mirror Glass", "Shower Glass", "Custom Orders"].map((cat) => (
              <Link
                key={cat}
                to={cat === "Mirror Glass" || cat === "Shower Glass" ? "/glass" : cat === "Custom Orders" ? "/custom-orders" : `/catalogue?category=${cat.toLowerCase().replace(/ /g, "-")}`}
                className="text-[11px] font-bold tracking-[0.14em] uppercase text-silk/50 hover:text-gold transition-colors whitespace-nowrap"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile menu ────────────────────────────────── */}
      {open && (
        <div className="xl:hidden bg-obsidian border-t border-silk/10 px-6 pb-6 pt-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`block px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] transition-colors
                ${location.pathname === link.path
                  ? "text-gold border-l-2 border-gold pl-3"
                  : "text-silk/60 hover:text-silk"
                }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 flex gap-3">
            <a
              href="https://www.facebook.com/share/1HT1RuZTg7/"
              aria-label="Facebook"
              className="p-2 text-silk/40 hover:text-silk transition-colors"
            >
              <Facebook className="w-5 h-5" />
            </a>
            <a
              href="https://www.instagram.com/craftsman_galore/"
              aria-label="Instagram"
              className="p-2 text-silk/40 hover:text-silk transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 py-3
              bg-[#25D366] text-white text-[12px] font-bold uppercase tracking-[0.15em]"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp Us
          </a>
        </div>
      )}
    </header>
  );
}