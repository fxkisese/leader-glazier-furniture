// Meta Pixel helper. The pixel itself is loaded in index.html ("Home Mall - Pixel").
// Every call is a no-op when the script is blocked (ad blockers, dev without network),
// so tracking can never break a sale.
const CURRENCY = "KES";

export function track(event, params) {
  try {
    if (typeof window.fbq === "function") window.fbq("track", event, params);
  } catch { /* never let analytics interrupt the shopper */ }
}

/** Second and later page views in the single-page app (the first is sent from index.html). */
export function trackPageView() {
  track("PageView");
}

const productParams = (items) => ({
  content_type: "product",
  content_ids: items.map((i) => String(i.id)),
  contents: items.map((i) => ({ id: String(i.id), quantity: i.quantity || 1, item_price: i.discount_price || i.price })),
  currency: CURRENCY,
});

export function trackAddToCart(product, quantity = 1) {
  track("AddToCart", {
    ...productParams([{ ...product, quantity }]),
    content_name: product.name,
    content_category: product.category,
    value: (product.discount_price || product.price) * quantity,
  });
}

export function trackInitiateCheckout(items, value) {
  track("InitiateCheckout", { ...productParams(items), num_items: items.length, value });
}

export function trackPurchase(items, value, orderId) {
  track("Purchase", { ...productParams(items), value, order_id: orderId ? String(orderId) : undefined });
}

/** An enquiry that gives us contact details: custom order, glass quote, contact form. */
export function trackLead(source, value) {
  track("Lead", { content_name: source, currency: CURRENCY, value });
}

/** A tap on a WhatsApp / call link. */
export function trackContact(source) {
  track("Contact", { content_name: source });
}
