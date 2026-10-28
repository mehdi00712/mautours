// js/price-format.js
// Shared price labels so every package shows its price clearly
// (Tourism Authority: packages must show applicable prices, all taxes included).

export function formatPackagePrice(trip = {}) {
  const price = Number(trip.price || 0);
  const type = trip.priceType || "";

  if (price <= 0 || type === "Custom Quote") return "Custom Quote";

  const unit = { person: " per person", couple: " per couple", booking: "" }[trip.priceUnit] || "";
  const amount = `€ ${price.toLocaleString()}${unit}`;

  if (type === "Fixed") return amount;
  if (type === "Vehicle Based") return `From ${amount} + vehicle`;
  return `From ${amount}`;
}

// Only allow redirects to pages on this site (prevents open-redirect abuse).
export function safeRedirect(value, fallback = "my-bookings.html") {
  const v = String(value || "");
  return /^[a-z0-9-]+\.html(\?[^#]*)?(#.*)?$/i.test(v) ? v : fallback;
}

export function activityPriceLabel(activities, name) {
  const list = Array.isArray(activities) ? activities : [];
  const match = list.find(
    (a) => typeof a === "object" && String(a?.name || "").trim() === name
  );
  const price = Number(match?.price || 0);

  return price > 0 ? `+ € ${price.toLocaleString()}` : "Price on request";
}

export const TAX_NOTE = "All taxes included · no hidden costs";

// Branded placeholder image (navy + gold) for packages without a photo.
function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrapTitle(text, max = 24, lines = 3) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const out = [];
  let line = "";

  words.forEach((word) => {
    if ((line + " " + word).trim().length > max && line) {
      out.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  });

  if (line) out.push(line);
  if (out.length > lines) {
    out.length = lines;
    out[lines - 1] = out[lines - 1].replace(/\s*\S*$/, "") + "…";
  }
  return out;
}

export function placeholderImage(title = "", category = "") {
  const lines = wrapTitle(title);
  const startY = 250 - (lines.length - 1) * 28;

  const titleSvg = lines
    .map(
      (l, i) =>
        `<text x="60" y="${startY + i * 56}" font-family="Georgia, serif" font-size="46" font-weight="700" fill="#ffffff">${xmlEscape(l)}</text>`
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#071827"/><stop offset="1" stop-color="#13314d"/></linearGradient>
<radialGradient id="r" cx="0.85" cy="0.1" r="0.6"><stop offset="0" stop-color="#c9a227" stop-opacity="0.35"/><stop offset="1" stop-color="#c9a227" stop-opacity="0"/></radialGradient>
</defs>
<rect width="800" height="500" fill="url(#g)"/><rect width="800" height="500" fill="url(#r)"/>
<path d="M0 410 C 160 370, 300 450, 460 405 S 700 360, 800 395 L800 500 L0 500 Z" fill="#c9a227" fill-opacity="0.16"/>
<path d="M0 445 C 180 410, 320 480, 500 440 S 720 405, 800 430 L800 500 L0 500 Z" fill="#c9a227" fill-opacity="0.22"/>
<text x="60" y="110" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="4" fill="#c9a227">${xmlEscape(String(category || "MAURITIUS").toUpperCase())}</text>
<rect x="60" y="128" width="60" height="3" fill="#c9a227"/>
${titleSvg}
<text x="60" y="470" font-family="Georgia, serif" font-size="22" fill="#ffffff" fill-opacity="0.8">Mautour Holidays</text>
</svg>`;

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export function packageImage(trip = {}) {
  return trip.imageUrl || placeholderImage(trip.title, trip.category);
}
