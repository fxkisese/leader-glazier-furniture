// Remembers which ad or link brought a visitor (utm_* tags on the URL) for 30 days,
// so an enquiry they send later can be credited to that campaign in Marketing.
const KEY = "cg-attribution";
const DAYS = 30;
const FIELDS = ["utm_source", "utm_medium", "utm_campaign"];

/** Call once when the site loads. The latest tagged visit wins. */
export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const tags = Object.fromEntries(FIELDS.map((k) => [k, params.get(k)]).filter(([, v]) => v));
    // Facebook/Instagram add fbclid even without utm tags
    if (!tags.utm_source && params.get("fbclid")) tags.utm_source = "facebook";
    if (Object.keys(tags).length) localStorage.setItem(KEY, JSON.stringify({ ...tags, at: Date.now() }));
  } catch { /* storage blocked: nothing to remember */ }
}

/** The remembered tags (only utm_* keys), or {} if none or expired. */
export function getAttribution() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!saved || Date.now() - saved.at > DAYS * 86_400_000) return {};
    return Object.fromEntries(FIELDS.filter((k) => saved[k]).map((k) => [k, String(saved[k]).slice(0, 120)]));
  } catch {
    return {};
  }
}
