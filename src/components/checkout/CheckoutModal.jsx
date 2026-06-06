import { useState, useEffect, useCallback } from "react";
import { X, CreditCard, Smartphone, Shield, CheckCircle2, AlertCircle, Loader2, ChevronRight, ArrowLeft, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

/* ──────── Stripe Card Form (rendered inside <Elements>) ──────── */
function StripeCardForm({ product, paymentType, customerInfo, onSuccess, onError, onBack }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const actualPrice = product.discount_price || product.price;
  const amount = paymentType === "deposit" ? Math.ceil(actualPrice / 2) : actualPrice;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    try {
      // 1. Create PaymentIntent via Edge Function
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/stripe-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "kes",
          product_id: product.id,
          product_name: product.name,
          product_image: product.images?.[0] || null,
          product_price: actualPrice,
          payment_type: paymentType,
          ...customerInfo,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.client_secret) throw new Error(data.error || "Failed to create payment");

      // 2. Confirm card payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: customerInfo.customer_name,
            email: customerInfo.customer_email || undefined,
            phone: customerInfo.customer_phone,
          },
        },
      });

      if (stripeError) throw new Error(stripeError.message);

      if (paymentIntent.status === "succeeded") {
        onSuccess({
          order_id: data.order_id,
          payment_intent_id: paymentIntent.id,
          amount_paid: amount,
        });
      }
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-700">Card Details</label>
        <div className="border-2 border-gray-200 rounded-xl p-4 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#1a1a2e",
                  fontFamily: "'Inter', sans-serif",
                  "::placeholder": { color: "#94a3b8" },
                },
                invalid: { color: "#ef4444" },
              },
              hidePostalCode: true,
            }}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="h-14 px-4 rounded-xl border-gray-200" disabled={processing}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 h-14 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 gap-2"
        >
          {processing ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
          ) : (
            <><CreditCard className="w-5 h-5" /> Pay KSh {amount?.toLocaleString()}</>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <Shield className="w-3.5 h-3.5" />
        <span>Secured by Stripe — Your card details are encrypted</span>
      </div>
    </form>
  );
}

/* ──────── Main Checkout Modal ──────── */
export default function CheckoutModal({ product, onClose }) {
  const [step, setStep] = useState("details"); // details → payment → processing → success → error
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [paymentType, setPaymentType] = useState("full");
  const [customerInfo, setCustomerInfo] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    delivery_address: "",
  });
  const [mpesaState, setMpesaState] = useState({ orderId: null, polling: false, error: null });
  const [result, setResult] = useState(null);

  const actualPrice = product.discount_price || product.price;
  const payAmount = paymentType === "deposit" ? Math.ceil(actualPrice / 2) : actualPrice;
  const balanceAfter = paymentType === "deposit" ? actualPrice - payAmount : 0;

  const set = (k, v) => setCustomerInfo((prev) => ({ ...prev, [k]: v }));

  const isDetailsValid = customerInfo.customer_name.trim() && customerInfo.customer_phone.trim();

  /* ── M-Pesa STK Push ── */
  const handleMpesaPay = async () => {
    setStep("processing");
    setMpesaState({ orderId: null, polling: false, error: null });

    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/mpesa-stk-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: customerInfo.customer_phone,
          amount: payAmount,
          product_id: product.id,
          product_name: product.name,
          product_image: product.images?.[0] || null,
          product_price: actualPrice,
          payment_type: paymentType,
          ...customerInfo,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to initiate M-Pesa payment");

      setMpesaState({ orderId: data.order_id, polling: true, error: null });
    } catch (err) {
      setMpesaState({ orderId: null, polling: false, error: err.message });
      setStep("error");
    }
  };

  /* ── Poll M-Pesa order status ── */
  const pollOrderStatus = useCallback(async () => {
    if (!mpesaState.orderId) return;

    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/check-order-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: mpesaState.orderId }),
      });
      const data = await res.json();

      if (data.order?.payment_status === "paid" || data.order?.payment_status === "partial") {
        setResult({
          order_id: mpesaState.orderId,
          receipt: data.order.mpesa_receipt_number,
          amount_paid: data.order.amount_paid,
        });
        setMpesaState((s) => ({ ...s, polling: false }));
        setStep("success");
      } else if (data.order?.payment_status === "failed") {
        setMpesaState((s) => ({ ...s, polling: false, error: "Payment was cancelled or failed. Please try again." }));
        setStep("error");
      }
    } catch {
      // Silently retry on network errors
    }
  }, [mpesaState.orderId]);

  useEffect(() => {
    if (!mpesaState.polling || !mpesaState.orderId) return;
    const interval = setInterval(pollOrderStatus, 4000);
    const timeout = setTimeout(() => {
      setMpesaState((s) => ({ ...s, polling: false, error: "Payment confirmation timed out. If you completed payment, it will be confirmed shortly." }));
      setStep("error");
    }, 120000); // 2 min timeout
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [mpesaState.polling, mpesaState.orderId, pollOrderStatus]);

  /* ── Stripe success handler ── */
  const handleStripeSuccess = (data) => {
    setResult(data);
    setStep("success");
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ─── */}
        <div className="relative p-5 pb-0">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 pr-8">
            {step === "success" ? "Payment Successful!" : step === "error" ? "Payment Issue" : "Checkout"}
          </h2>
        </div>

        {/* ─── Product Summary (always visible) ─── */}
        {step !== "success" && step !== "error" && (
          <div className="mx-5 mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-2xl flex gap-4 items-center border border-gray-100">
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.name} className="w-20 h-20 object-cover rounded-xl shadow-sm flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">🛋️</div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{product.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{product.category?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {product.discount_price ? (
                  <>
                    <span className="text-lg font-bold text-primary">KSh {product.discount_price?.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 line-through">KSh {product.price?.toLocaleString()}</span>
                  </>
                ) : (
                  <span className="text-lg font-bold text-primary">KSh {product.price?.toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-5 pt-4">
          {/* ══════════════════════════════ STEP: Details ══════════════════════════════ */}
          {step === "details" && (
            <div className="space-y-5">
              {/* Customer Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
                  Your Details
                </h3>
                <Input
                  placeholder="Full Name *"
                  value={customerInfo.customer_name}
                  onChange={(e) => set("customer_name", e.target.value)}
                  className="h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20"
                />
                <Input
                  placeholder="Phone Number (e.g. 0712345678) *"
                  value={customerInfo.customer_phone}
                  onChange={(e) => set("customer_phone", e.target.value)}
                  className="h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20"
                />
                <Input
                  placeholder="Email (optional)"
                  type="email"
                  value={customerInfo.customer_email}
                  onChange={(e) => set("customer_email", e.target.value)}
                  className="h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20"
                />
                <Input
                  placeholder="Delivery Address"
                  value={customerInfo.delivery_address}
                  onChange={(e) => set("delivery_address", e.target.value)}
                  className="h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary/20"
                />
              </div>

              {/* Payment Type */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
                  Payment Amount
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentType("full")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      paymentType === "full"
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-semibold text-sm text-gray-900">Full Payment</p>
                    <p className="text-lg font-bold text-primary mt-1">KSh {actualPrice?.toLocaleString()}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType("deposit")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      paymentType === "deposit"
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-semibold text-sm text-gray-900">50% Deposit</p>
                    <p className="text-lg font-bold text-primary mt-1">KSh {Math.ceil(actualPrice / 2)?.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Balance on delivery</p>
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
                  Payment Method
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("mpesa")}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      paymentMethod === "mpesa"
                        ? "border-green-500 bg-green-50 shadow-md shadow-green-500/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500 mx-auto mb-2 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-white" />
                    </div>
                    <p className="font-semibold text-sm text-gray-900">M-Pesa</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">STK Push</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("stripe")}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      paymentMethod === "stripe"
                        ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-500/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto mb-2 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <p className="font-semibold text-sm text-gray-900">Card</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Visa / Mastercard</p>
                  </button>
                </div>
              </div>

              {/* Summary & Continue */}
              <div className="p-4 bg-gray-50 rounded-2xl space-y-2 border border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Product Price</span>
                  <span className="font-medium">KSh {actualPrice?.toLocaleString()}</span>
                </div>
                {paymentType === "deposit" && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Deposit (50%)</span>
                      <span className="font-medium text-primary">KSh {payAmount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Balance on delivery</span>
                      <span className="font-medium text-amber-600">KSh {balanceAfter?.toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">Pay Now</span>
                  <span className="font-bold text-lg text-primary">KSh {payAmount?.toLocaleString()}</span>
                </div>
              </div>

              <Button
                className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold text-base shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 gap-2"
                disabled={!isDetailsValid}
                onClick={() => {
                  if (paymentMethod === "mpesa") {
                    handleMpesaPay();
                  } else {
                    setStep("payment");
                  }
                }}
              >
                {paymentMethod === "mpesa" ? (
                  <><Smartphone className="w-5 h-5" /> Pay KSh {payAmount?.toLocaleString()} with M-Pesa</>
                ) : (
                  <>Continue to Card Payment <ChevronRight className="w-5 h-5" /></>
                )}
              </Button>
            </div>
          )}

          {/* ══════════════════════════════ STEP: Stripe Card Input ══════════════════════════════ */}
          {step === "payment" && paymentMethod === "stripe" && (
            stripePromise ? (
              <Elements stripe={stripePromise} options={{ appearance: { theme: "stripe", variables: { borderRadius: "12px" } } }}>
                <StripeCardForm
                  product={product}
                  paymentType={paymentType}
                  customerInfo={customerInfo}
                  onSuccess={handleStripeSuccess}
                  onError={() => {}}
                  onBack={() => setStep("details")}
                />
              </Elements>
            ) : (
              <div className="text-center py-8 space-y-3">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
                <p className="text-gray-600 text-sm">Card payments are not configured yet.</p>
                <Button variant="outline" onClick={() => setStep("details")} className="rounded-xl">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                </Button>
              </div>
            )
          )}

          {/* ══════════════════════════════ STEP: Processing (M-Pesa) ══════════════════════════════ */}
          {step === "processing" && (
            <div className="text-center py-10 space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Check Your Phone</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                  An M-Pesa payment prompt has been sent to <strong>{customerInfo.customer_phone}</strong>. Enter your M-Pesa PIN to complete the payment.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Waiting for payment confirmation...</span>
              </div>
              <Button variant="ghost" onClick={() => { setMpesaState((s) => ({ ...s, polling: false })); setStep("details"); }} className="text-gray-500 rounded-xl">
                Cancel & Go Back
              </Button>
            </div>
          )}

          {/* ══════════════════════════════ STEP: Success ══════════════════════════════ */}
          {step === "success" && (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 mx-auto flex items-center justify-center shadow-lg shadow-green-500/30 animate-in zoom-in duration-500">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Payment Successful!</h3>
                <p className="text-gray-500 text-sm">Thank you for your order, {customerInfo.customer_name}!</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-left space-y-3 max-w-xs mx-auto">
                {result?.order_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Order ID</span>
                    <span className="font-mono font-medium text-gray-900 text-xs">{result.order_id.slice(0, 8)}...</span>
                  </div>
                )}
                {result?.receipt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">M-Pesa Receipt</span>
                    <span className="font-mono font-medium text-gray-900">{result.receipt}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="font-bold text-green-700">KSh {(result?.amount_paid || payAmount)?.toLocaleString()}</span>
                </div>
                {paymentType === "deposit" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Balance Due</span>
                    <span className="font-medium text-amber-600">KSh {balanceAfter?.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Truck className="w-4 h-4" />
                <span>We'll contact you shortly to arrange delivery.</span>
              </div>

              <Button
                onClick={onClose}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold text-base shadow-lg shadow-green-500/20"
              >
                Done
              </Button>
            </div>
          )}

          {/* ══════════════════════════════ STEP: Error ══════════════════════════════ */}
          {step === "error" && (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-rose-500 mx-auto flex items-center justify-center shadow-lg shadow-red-500/30">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Payment Issue</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                  {mpesaState.error || "Something went wrong with your payment. Please try again."}
                </p>
              </div>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <Button
                  onClick={() => { setStep("details"); setMpesaState({ orderId: null, polling: false, error: null }); }}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold"
                >
                  Try Again
                </Button>
                <Button variant="ghost" onClick={onClose} className="text-gray-500 rounded-xl">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
