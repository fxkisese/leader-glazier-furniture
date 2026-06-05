import { useState } from "react";
import { X, MessageCircle, Phone, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const WHATSAPP = "254700000000";

export default function ProductQuickView({ product, onClose }) {
  const [imgIndex, setImgIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const images = product.images || [];

  const waMessage = product.whatsapp_message
    || `Hello Craftsman Galore, I'm interested in the *${product.name}* (KSh ${product.price?.toLocaleString()}). Please share more details.`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-5xl w-[95vw] md:h-[80vh] max-h-[95vh] flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Images Section (Half Screen Height Mobile, Half Screen Width Desktop) */}
        <div className="relative w-full md:w-1/2 h-[50vh] md:h-full bg-muted/30 flex-shrink-0 flex items-center justify-center p-4">
          {images[imgIndex] ? (
            <img 
              src={images[imgIndex]} 
              alt={product.name} 
              className="w-full h-full object-contain cursor-zoom-in drop-shadow-sm transition-transform hover:scale-[1.02] duration-300" 
              onClick={() => setIsFullscreen(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🛋️</div>
          )}
          
          {/* Close button for mobile overlaid on image */}
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full md:hidden shadow-sm">
            <X className="w-5 h-5 text-gray-800" />
          </button>

          {images.length > 1 && (
            <>
              <button onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center hover:bg-white transition-all hover:scale-105 text-gray-800">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center hover:bg-white transition-all hover:scale-105 text-gray-800">
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {images.map((_, i) => (
                  <button key={i} onClick={() => setImgIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === imgIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Details Section (Scrollable independently) */}
        <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col h-full overflow-y-auto">
          {/* Desktop Close Button */}
          <div className="hidden md:flex justify-end mb-2">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors text-gray-500 hover:text-gray-800">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6 flex-grow">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-primary/80 uppercase tracking-widest">{product.category?.replace(/-/g, " ")}</p>
                {product.is_featured && <Badge variant="secondary" className="bg-gold/20 text-amber-800 text-[10px]">FEATURED</Badge>}
              </div>
              <h2 className="font-playfair text-2xl md:text-4xl font-bold text-foreground leading-tight">{product.name}</h2>
            </div>

            <div className="flex items-end gap-3 pb-4 border-b border-border">
              {product.discount_price ? (
                <>
                  <span className="text-3xl md:text-4xl font-bold text-primary">KSh {product.discount_price?.toLocaleString()}</span>
                  <span className="text-lg md:text-xl text-muted-foreground line-through mb-1">KSh {product.price?.toLocaleString()}</span>
                </>
              ) : (
                <span className="text-3xl md:text-4xl font-bold text-primary">KSh {product.price?.toLocaleString()}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
              {product.material && (
                <div>
                  <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">Material</span>
                  <span className="font-medium text-foreground flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary"/> {product.material}</span>
                </div>
              )}
              {product.dimensions && (
                <div>
                  <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">Dimensions</span>
                  <span className="font-medium text-foreground flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary"/> {product.dimensions}</span>
                </div>
              )}
              {product.colors && (
                <div>
                  <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">Colors</span>
                  <span className="font-medium text-foreground flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary"/> {product.colors}</span>
                </div>
              )}
              {product.seating_capacity && (
                <div>
                  <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">Seating</span>
                  <span className="font-medium text-foreground flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary"/> {product.seating_capacity}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/30">
                <div className={`w-2 h-2 rounded-full ${product.stock_status === "in-stock" ? "bg-green-500 animate-pulse" : product.stock_status === "made-to-order" ? "bg-amber-500" : "bg-red-500"}`} />
                <span className={`text-sm font-semibold ${product.stock_status === "in-stock" ? "text-green-700" : product.stock_status === "made-to-order" ? "text-amber-700" : "text-red-700"}`}>
                  {product.stock_status === "in-stock" ? "In Stock & Ready" : product.stock_status === "made-to-order" ? "Made to Order" : "Currently Unavailable"}
                </span>
              </div>
            </div>

            {product.description && (
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed bg-muted/10 p-4 rounded-2xl">
                {product.description}
              </p>
            )}

            {product.delivery_note && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3">
                <span className="text-xl">📦</span>
                <p className="text-sm text-primary font-medium">{product.delivery_note}</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white">
            <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waMessage)}`} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button className="w-full bg-[#25D366] hover:bg-[#1ebd5b] text-white h-14 text-base font-semibold shadow-lg shadow-[#25D366]/20 gap-2 rounded-xl transition-transform hover:-translate-y-0.5">
                <MessageCircle className="w-5 h-5" /> Order on WhatsApp
              </Button>
            </a>
            <a href={`tel:+${WHATSAPP}`} className="sm:w-20">
              <Button variant="outline" className="w-full h-14 border-primary/30 text-primary hover:bg-primary hover:text-white rounded-xl shadow-sm">
                <Phone className="w-5 h-5" />
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Fullscreen Zoom Overlay */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setIsFullscreen(false)}
        >
          <button 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
          >
            <X className="w-6 h-6" />
          </button>
          
          <img 
            src={images[imgIndex]} 
            alt={product.name} 
            className="max-w-[95vw] max-h-[95vh] object-contain select-none" 
          />

          {images.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); setImgIndex((i) => (i - 1 + images.length) % images.length); }}
                className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setImgIndex((i) => (i + 1) % images.length); }}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}