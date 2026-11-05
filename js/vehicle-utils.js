// js/vehicle-utils.js – shared helpers for vehicle pages.

export const SERVICE_TYPES = [
  { key: "airport", label: "Airport transfer", field: "airportPrice", note: "one way" },
  { key: "halfday", label: "Half-day hire (4 hours)", field: "halfDayPrice", note: "with chauffeur" },
  { key: "fullday", label: "Full-day hire (8 hours)", field: "fullDayPrice", note: "with chauffeur" },
  { key: "custom", label: "Other trip / multi-day", field: null, note: "price on request" }
];

export function servicePrice(vehicle, key) {
  const s = SERVICE_TYPES.find((t) => t.key === key);
  if (!s || !s.field) return 0;
  return Number(vehicle?.[s.field] || 0);
}

// "From" price for hiring the vehicle (airport / half day / full day).
// v.price is the add-on price when the vehicle is chosen for a tour package,
// so it is only used when no hire prices are set.
export function vehicleFromPrice(v) {
  const pick = (list) => list.map((p) => Number(p || 0)).filter((p) => p > 0);
  const hire = pick([v.airportPrice, v.halfDayPrice, v.fullDayPrice]);
  const prices = hire.length ? hire : pick([v.price]);
  return prices.length ? Math.min(...prices) : 0;
}

export function vehicleFeatures(v) {
  if (Array.isArray(v.features) && v.features.length) return v.features.filter(Boolean);
  const base = ["Professional chauffeur", "Air conditioning", "Island-wide service"];
  return base;
}
