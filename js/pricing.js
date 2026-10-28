// Mautour Holidays – price calculator (GENERATED: edit build/pricing_core.js, not this file).
// The same code runs in the browser (cart) and in Cloud Functions (checkout),
// so the amount charged is exactly the amount the customer sees.

const PRICE_UNITS = {
  person: "per person",
  couple: "per couple",
  booking: "per booking"
};

function roundMoney(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function unitQuantity(unit, people) {
  const p = Math.max(1, Math.floor(Number(people || 1)));
  if (unit === "person") return p;
  if (unit === "couple") return Math.ceil(p / 2);
  return 1;
}

// Optional activities: the unit is read from the activity name, e.g.
// "Eco Rider (per person)", "Undersea walk (per adult)", "... (per couple)".
function activityUnit(name) {
  const n = String(name || "").toLowerCase();
  if (/per\s+(person|adult|pax|guest)/.test(n)) return "person";
  if (/per\s+couple/.test(n)) return "couple";
  return "booking";
}

function isPurchasablePackage(trip) {
  return Boolean(trip) && trip.active !== false && trip.priceType !== "Custom Quote" && Number(trip.price || 0) > 0;
}

const VEHICLE_SERVICES = {
  airport: { label: "Airport transfer", field: "airportPrice" },
  halfday: { label: "Half-day hire (4 hours)", field: "halfDayPrice" },
  fullday: { label: "Full-day hire (8 hours)", field: "fullDayPrice" }
};

// item: { type:"package", people, activities:[names], vehicleId }   trip: package doc   vehicle: vehicle doc|null
function pricePackageItem(item, trip, vehicle) {
  if (!isPurchasablePackage(trip)) {
    return { ok: false, error: "This package is priced on request – please ask us on WhatsApp." };
  }

  const people = Math.max(1, Math.floor(Number(item.people || 1)));
  const unit = PRICE_UNITS[trip.priceUnit] ? trip.priceUnit : "person";
  const qty = unitQuantity(unit, people);
  const base = roundMoney(Number(trip.price) * qty);

  const lines = [
    { label: `${trip.title} – € ${roundMoney(trip.price)} ${PRICE_UNITS[unit]}${qty > 1 ? ` × ${qty}` : ""}`, amount: base }
  ];

  const tripActivities = Array.isArray(trip.activities) ? trip.activities : [];
  const chosen = Array.isArray(item.activities) ? item.activities : [];

  for (const name of chosen) {
    const match = tripActivities.find((a) => a && typeof a === "object" && String(a.name || "").trim() === String(name).trim());
    const price = Number(match?.price || 0);
    if (!match || price <= 0) {
      return { ok: false, error: `"${name}" is priced on request and cannot be paid online.` };
    }
    const aUnit = activityUnit(match.name);
    const aQty = unitQuantity(aUnit, people);
    lines.push({ label: `${match.name}${aQty > 1 ? ` × ${aQty}` : ""}`, amount: roundMoney(price * aQty) });
  }

  if (item.vehicleId) {
    if (!vehicle || vehicle.active === false) return { ok: false, error: "The selected vehicle is no longer available." };
    const vPrice = Number(vehicle.price || 0);
    if (vPrice > 0) lines.push({ label: `Vehicle: ${vehicle.name}`, amount: roundMoney(vPrice) });
  }

  const total = roundMoney(lines.reduce((s, l) => s + l.amount, 0));
  return { ok: true, people, unit, lines, total };
}

// item: { type:"vehicle", service }   vehicle: vehicle doc
function priceVehicleItem(item, vehicle) {
  if (!vehicle || vehicle.active === false) return { ok: false, error: "This vehicle is not available." };
  const service = VEHICLE_SERVICES[item.service];
  if (!service) return { ok: false, error: "This trip type is priced on request – please ask us on WhatsApp." };
  const price = Number(vehicle[service.field] || 0);
  if (!(price > 0)) return { ok: false, error: "This trip type is priced on request – please ask us on WhatsApp." };
  return {
    ok: true,
    lines: [{ label: `${vehicle.name} – ${service.label}`, amount: roundMoney(price) }],
    total: roundMoney(price)
  };
}

export { PRICE_UNITS, VEHICLE_SERVICES, roundMoney, unitQuantity, activityUnit, isPurchasablePackage, pricePackageItem, priceVehicleItem };
