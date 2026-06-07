import { Link } from "react-router-dom";
import { Phone, MessageCircle, MapPin, Mail, Facebook, Instagram, Twitter } from "lucide-react";

const WHATSAPP = "254110767199";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div>
              <h3 className="font-playfair font-bold text-2xl text-white">Craftsman Galore</h3>
              <p className="text-gold text-sm font-medium tracking-widest uppercase">& Furniture</p>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Bespoke handcrafted furniture and professional glass solutions, proudly built by local Kenyan artisans and delivered countrywide.
            </p>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
              <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
            </a>
          </div>

          {/* Furniture */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white text-sm uppercase tracking-wider">Furniture</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              {["Sofas", "Wardrobes", "TV Stands", "Beds", "Office Furniture", "Shoe Racks", "Coffee Tables", "Dining Sets"].map(item => (
                <li key={item}>
                  <Link to="/catalogue" className="hover:text-gold transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Glass */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white text-sm uppercase tracking-wider">Glass & Mirrors</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              {["Mirror Glass", "Toughened Glass", "Frosted Glass", "Shower Glass", "Office Partitions", "Table-top Glass", "Window Glass"].map(item => (
                <li key={item}>
                  <Link to="/glass" className="hover:text-gold transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
            <Link to="/quote-calculator" className="inline-block text-gold text-sm font-medium hover:underline">→ Get Glass Quote</Link>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white text-sm uppercase tracking-wider">Contact Us</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 shrink-0 text-gold" />
                <span>+254 110 767 199</span>
              </li>
              <li className="flex items-start gap-2">
                <MessageCircle className="w-4 h-4 mt-0.5 shrink-0 text-gold" />
                <span>WhatsApp: +254 110 767 199</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gold" />
                <span>Nairobi & Machakos, Kenya (Countrywide Delivery)</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 shrink-0 text-gold" />
                <span>furniture@craftsmangalore.homes</span>
              </li>
            </ul>
            <div className="pt-4 border-t border-white/10 mt-4">
              <h4 className="font-semibold text-white text-sm uppercase tracking-wider mb-3">Follow Us</h4>
              <div className="flex gap-4">
                <a href="https://www.facebook.com/share/1HT1RuZTg7/" aria-label="Facebook" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-primary-foreground/70 hover:bg-gold hover:text-primary transition-all">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href="https://www.instagram.com/craftsman_galore/" aria-label="Instagram" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-primary-foreground/70 hover:bg-gold hover:text-primary transition-all">
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-primary-foreground/50">
          <p>© 2026 Craftsman Galore. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/about" className="hover:text-gold transition-colors">About</Link>
            <Link to="/contact" className="hover:text-gold transition-colors">Contact</Link>
            <Link to="/gallery" className="hover:text-gold transition-colors">Gallery</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}