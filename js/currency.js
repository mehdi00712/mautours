// js/currency.js
// Currency switcher for the public website.
//
// All prices are stored in euros. The visitor can choose to see them in
// euros (€), Mauritian rupees (Rs) or – when a rate is set in
// Admin → Settings – US dollars ($) and British pounds (£).
//
// Every "€ 120" shown on a page is converted on the fly, so all pages
// (packages, vehicles, cart, account) follow the visitor's choice without
// each page needing its own code. Card payments are always charged in
// rupees by Absa at the Admin → Settings rupee rate.

const STORE_KEY = "mt_currency";
const RATES_KEY = "mt_rates_v1";

export const CURRENCIES = {
  EUR: { symbol: "€", label: "EUR €", name: "Euro" },
  MUR: { symbol: "Rs", label: "MUR Rs", name: "Mauritian rupee" },
  USD: { symbol: "$", label: "USD $", name: "US dollar" },
  GBP: { symbol: "£", label: "GBP £", name: "British pound" }
};

const DEFAULT_RATES = { EUR: 1, MUR: 53 };

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode – ignore */
  }
}

let rates = { ...DEFAULT_RATES, ...(readJson(RATES_KEY) || {}) };

export function getRates() {
  return { ...rates };
}

export function availableCurrencies() {
  return Object.keys(CURRENCIES).filter((c) => Number(rates[c]) > 0);
}

export function getCurrency() {
  let c = "EUR";
  try {
    c = localStorage.getItem(STORE_KEY) || "EUR";
  } catch {
    /* ignore */
  }
  return availableCurrencies().includes(c) ? c : "EUR";
}

// Rupee amount Absa charges for a euro amount (whole rupees, like the server).
export function murAmount(eur) {
  return Math.round(Number(eur || 0) * Number(rates.MUR || DEFAULT_RATES.MUR));
}

function formatNumber(n, maxDecimals) {
  return Number(n).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals });
}

// Format a euro amount in the chosen (or given) currency, e.g. "Rs 38,425".
export function money(eur, currency = getCurrency()) {
  const value = Number(eur || 0);
  if (currency === "EUR") return `€ ${formatNumber(value, 2)}`;
  if (currency === "MUR") return `Rs ${formatNumber(murAmount(value), 0)}`;
  const rate = Number(rates[currency] || 0);
  if (!(rate > 0)) return `€ ${formatNumber(value, 2)}`;
  return `${CURRENCIES[currency].symbol} ${formatNumber(Math.round(value * rate), 0)}`;
}

/* ---------------- automatic conversion of "€ 120" on the page ---------------- */

// "€ 1,234", "€1234.50", "€ 1 234" …
const EURO_RE = /€\s?(\d{1,3}(?:[,   .]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/g;

function parseEuro(text) {
  const t = text.replace(/[   ]/g, "");
  // a separator followed by exactly 1–2 digits at the end is the decimal mark
  const m = t.match(/^(.*?)[.,](\d{1,2})$/);
  if (m) return Number(m[1].replace(/[.,]/g, "") + "." + m[2]);
  return Number(t.replace(/[.,]/g, ""));
}

const originals = new WeakMap(); // text node -> original text (in euros)
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "NOSCRIPT", "CODE"]);

function convertNode(node) {
  const parent = node.parentElement;
  if (!parent || SKIP.has(parent.tagName) || parent.closest("[data-no-convert]")) return;

  let original = originals.get(node);
  // the text was changed by the page itself since we last converted it
  if (original !== undefined && node.__mtConverted !== node.nodeValue) original = undefined;
  if (original === undefined) {
    if (!node.nodeValue.includes("€")) return;
    original = node.nodeValue;
    originals.set(node, original);
  }

  const currency = getCurrency();
  const next = currency === "EUR" ? original : original.replace(EURO_RE, (_, num) => money(parseEuro(num), currency));
  if (node.nodeValue !== next) node.nodeValue = next;
  node.__mtConverted = next;
}

function convertTree(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) return convertNode(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) convertNode(n);
}

let observer = null;

function startObserver() {
  if (observer || !document.body) return;
  observer = new MutationObserver((mutations) => {
    observer.disconnect();
    for (const m of mutations) {
      if (m.type === "characterData") convertNode(m.target);
      else m.addedNodes.forEach((n) => convertTree(n));
    }
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  convertTree(document.body);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function refreshAll() {
  if (observer) observer.disconnect();
  convertTree(document.body);
  if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  document.querySelectorAll("select.nav-currency").forEach((s) => (s.value = getCurrency()));
  document.dispatchEvent(new CustomEvent("mt:currency", { detail: { currency: getCurrency() } }));
}

export function setCurrency(currency) {
  if (!CURRENCIES[currency]) return;
  try {
    localStorage.setItem(STORE_KEY, currency);
  } catch {
    /* ignore */
  }
  refreshAll();
}

export function onCurrencyChange(fn) {
  document.addEventListener("mt:currency", (e) => fn(e.detail.currency));
}

// Rates come from Admin → Settings (siteContent/settings).
export function applySettingsRates(settings = {}) {
  const next = { EUR: 1, MUR: Number(settings.rateMUR) > 0 ? Number(settings.rateMUR) : DEFAULT_RATES.MUR };
  if (Number(settings.rateUSD) > 0) next.USD = Number(settings.rateUSD);
  if (Number(settings.rateGBP) > 0) next.GBP = Number(settings.rateGBP);
  const changed = JSON.stringify(next) !== JSON.stringify(rates);
  rates = next;
  writeJson(RATES_KEY, rates);
  if (changed) {
    buildSwitchers();
    refreshAll();
  }
}

/* ---------------- header switcher ---------------- */

function buildSwitchers() {
  document.querySelectorAll("select.nav-currency").forEach((select) => {
    const current = getCurrency();
    select.innerHTML = availableCurrencies()
      .map((c) => `<option value="${c}"${c === current ? " selected" : ""}>${CURRENCIES[c].label}</option>`)
      .join("");
  });
}

export function createCurrencySwitcher() {
  const wrap = document.createElement("label");
  wrap.className = "nav-currency-wrap";
  wrap.title = "Show prices in";
  wrap.innerHTML = `<span class="sr-only">Currency</span><select class="nav-currency" aria-label="Currency"></select>`;
  const select = wrap.querySelector("select");
  select.addEventListener("change", () => setCurrency(select.value));
  return wrap;
}

export function initCurrency() {
  buildSwitchers();
  if (document.body) startObserver();
  else document.addEventListener("DOMContentLoaded", startObserver, { once: true });
}
