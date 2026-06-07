import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, MessageCircle, Facebook, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP = "254110767199";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "Furniture", path: "/catalogue" },
  { label: "Glass & Mirrors", path: "/glass" },
  { label: "Glass Quote", path: "/quote-calculator" },
  { label: "Custom Orders", path: "/custom-orders" },
  { label: "Gallery", path: "/gallery" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-md shadow-primary/5" : "bg-white/80 backdrop-blur-sm"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link to="/" className="flex flex-col leading-tight">
            <span className="font-playfair font-bold text-primary text-lg lg:text-xl tracking-tight">Craftsman Galore</span>
            <span className="text-xs text-gold font-inter font-medium tracking-widest uppercase">& Furniture</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:text-primary hover:bg-accent/60 ${location.pathname === link.path ? "text-primary bg-accent/60" : "text-foreground/70"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-3 mr-2 border-r border-border pr-4">
              <a href="#" aria-label="Facebook" className="text-foreground/50 hover:text-primary transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="#" aria-label="Instagram" className="text-foreground/50 hover:text-primary transition-colors"><Instagram className="w-4 h-4" /></a>
              <a href="#" aria-label="Twitter" className="text-foreground/50 hover:text-primary transition-colors"><Twitter className="w-4 h-4" /></a>
            </div>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-2 rounded-full">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
            </a>

          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-white border-t border-border px-4 pb-4 pt-2 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === link.path ? "text-primary bg-accent" : "text-foreground/70 hover:text-primary hover:bg-accent/50"}`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-4 pt-2 pb-2 justify-center border-b border-border/50 mb-2">
            <a href="#" aria-label="Facebook" className="p-2 text-foreground/50 hover:text-primary transition-colors"><Facebook className="w-5 h-5" /></a>
            <a href="#" aria-label="Instagram" className="p-2 text-foreground/50 hover:text-primary transition-colors"><Instagram className="w-5 h-5" /></a>
            <a href="#" aria-label="Twitter" className="p-2 text-foreground/50 hover:text-primary transition-colors"><Twitter className="w-5 h-5" /></a>
          </div>
          <div className="flex gap-2 pt-2">
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
            </a>

          </div>
        </div>
      )}
    </header>
  );
}