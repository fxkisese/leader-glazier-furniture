import { useState } from "react";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/CartContext";
import CheckoutModal from "../checkout/CheckoutModal";

export default function CartSidebar() {
  const { cartItems, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  if (!isCartOpen) return null;

  const totalAmount = getCartTotal();

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-[200] flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-5 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Your Cart
          </h2>
          <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-gray-300" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Your cart is empty</p>
                <p className="text-sm text-gray-500 mt-1">Looks like you haven't added anything yet.</p>
              </div>
              <Button onClick={() => setIsCartOpen(false)} variant="outline" className="mt-4 rounded-xl">
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => {
                const itemPrice = item.discount_price || item.price || 0;
                return (
                  <div key={item.id} className="flex gap-4 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt={item.name} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                    ) : (
                      <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                        🛋️
                      </div>
                    )}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 pr-2">{item.name}</h3>
                        <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 -m-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-primary font-semibold text-sm mt-1">KSh {itemPrice.toLocaleString()}</p>
                      
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-5 bg-gray-50 border-t border-gray-100 space-y-4">
            <div className="flex justify-between items-center text-lg font-bold text-gray-900">
              <span>Total</span>
              <span className="text-primary">KSh {totalAmount.toLocaleString()}</span>
            </div>
            <Button 
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-white font-semibold text-base shadow-lg shadow-primary/20 gap-2"
            >
              Proceed to Checkout <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {isCheckoutOpen && (
        <CheckoutModal 
          cartItems={cartItems} 
          onClose={() => setIsCheckoutOpen(false)} 
        />
      )}
    </>
  );
}
