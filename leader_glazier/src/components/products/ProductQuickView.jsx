import { useState } from "react";
import { X, MessageCircle, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const WHATSAPP = "254700000000";

export default function ProductQuickView({ product, onClose }) {
  const [imgIndex, setImgIndex] = useState(0);
  const images = product.images || [];

  const waMessage = product.whatsapp_message
    || `Hello Craftsman Galore, I'm interested in the *${product.name}* (KSh ${product.price?.toLocaleString()}). Please share more details.`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid md:grid-cols-2">
          {/* Images */}
          <div className="relative aspect-square md:aspect-auto bg-muted rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none overflow-hidden">
            {images[imgIndex] ? (
              <img src={images[imgIndex]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl">🛋️</div>
            )}
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setImgIndex(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? "bg-primary" : "bg-white/60"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{product.category?.replace(/-/g, " ")}</p>
                <h2 className="font-playfair text-xl font-bold text-foreground mt-1">{product.name}</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {product.discount_price ? (
                <>
                  <span className="text-2xl font-bold text-primary">KSh {product.discount_price?.toLocaleString()}</span>
                  <span className="text-base text-muted-foreground line-through">KSh {product.price?.toLocaleString()}</span>
                </>
              ) : (
                <span className="text-2xl font-bold text-primary">KSh {product.price?.toLocaleString()}</span>
              )}
            </div>

            <div className="space-y-2 text-sm">
              {product.material && <div className="flex gap-2"><span className="text-muted-foreground w-28">Material:</span><span className="font-medium">{product.material}</span></div>}
              {product.dimensions && <div className="flex gap-2"><span className="text-muted-foreground w-28">Dimensions:</span><span className="font-medium">{product.dimensions}</span></div>}
              {product.colors && <div className="flex gap-2"><span className="text-muted-foreground w-28">Colors:</span><span className="font-medium">{product.colors}</span></div>}
              {product.seating_capacity && <div className="flex gap-2"><span className="text-muted-foreground w-28">Seats:</span><span className="font-medium">{product.seating_capacity}</span></div>}
              <div className="flex gap-2"><span className="text-muted-foreground w-28">Availability:</span>
                <span className={`font-medium ${product.stock_status === "in-stock" ? "text-green-600" : "text-red-500"}`}>
                  {product.stock_status === "in-stock" ? "In Stock" : product.stock_status === "made-to-order" ? "Made to Order" : "Out of Stock"}
                </span>
              </div>
            </div>

            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed border-t pt-4">{product.description}</p>
            )}

            {product.delivery_note && (
              <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">📦 {product.delivery_note}</p>
            )}

            <div className="flex gap-2 pt-2">
              <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waMessage)}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
                  <MessageCircle className="w-4 h-4" /> Order on WhatsApp
                </Button>
              </a>
              <a href={`tel:+${WHATSAPP}`}>
                <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white px-3">
                  <Phone className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}