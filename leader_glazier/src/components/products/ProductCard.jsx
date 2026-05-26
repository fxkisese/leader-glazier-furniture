import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Eye, Star } from "lucide-react";
import ProductQuickView from "./ProductQuickView";

const LABEL_CONFIG = {
  "new-arrival": { label: "New Arrival", class: "bg-blue-100 text-blue-700" },
  "best-seller": { label: "Best Seller", class: "bg-gold/20 text-amber-700" },
  "limited-offer": { label: "Limited Offer", class: "bg-red-100 text-red-700" },
  "custom-order": { label: "Custom Order", class: "bg-purple-100 text-purple-700" },
};

const WHATSAPP = "254722914819";

export default function ProductCard({ product }) {
  const [showQuickView, setShowQuickView] = useState(false);

  const waMessage = product.whatsapp_message
    || `Hello Craftsman Galore, I'm interested in the *${product.name}* (KSh ${product.price?.toLocaleString()}). Please share more details.`;

  const labelConf = LABEL_CONFIG[product.label];

  return (
    <>
      <div
        className="group bg-white rounded-2xl overflow-hidden border border-border hover:border-primary/20 hover:shadow-xl hover:shadow-primary/8 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
        onClick={() => setShowQuickView(true)}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-4xl">🛋️</span>
            </div>
          )}
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300 flex items-center justify-center">
            <Button
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white text-primary hover:bg-primary hover:text-white rounded-full"
              onClick={() => setShowQuickView(true)}
            >
              <Eye className="w-4 h-4 mr-1" /> Quick View
            </Button>
          </div>
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {labelConf && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${labelConf.class}`}>
                {labelConf.label}
              </span>
            )}
            {product.stock_status === "out-of-stock" && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-200 text-gray-600">
                Sold Out
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {product.category?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </p>
            <h3 className="font-semibold text-foreground leading-snug line-clamp-2">{product.name}</h3>
            {product.material && (
              <p className="text-xs text-muted-foreground mt-1">{product.material}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {product.discount_price ? (
              <>
                <span className="text-lg font-bold text-primary">KSh {product.discount_price?.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground line-through">KSh {product.price?.toLocaleString()}</span>
              </>
            ) : (
              <span className="text-lg font-bold text-primary">KSh {product.price?.toLocaleString()}</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-primary/30 text-primary hover:bg-primary hover:text-white rounded-lg text-xs"
              onClick={() => setShowQuickView(true)}
            >
              View Details
            </Button>
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs gap-1">
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </div>

      {showQuickView && (
        <ProductQuickView product={product} onClose={() => setShowQuickView(false)} />
      )}
    </>
  );
}