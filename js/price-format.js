// js/price-format.js
// Shared price labels so every package shows its price clearly
// (Tourism Authority: packages must show applicable prices, all taxes included).

export function formatPackagePrice(trip = {}) {
  const price = Number(trip.price || 0);
  const type = trip.priceType || "";

  if (price <= 0 || type === "Custom Quote") return "Custom Quote";

  const amount = `€ ${price.toLocaleString()}`;

  if (type === "Fixed") return amount;
  if (type === "Vehicle Based") return `From ${amount} + vehicle`;
  return `From ${amount}`;
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
