/**
 * Lightweight live currency-conversion helper.
 *
 * The hotel's accounting base currency (HotelSettings.baseCurrencyCode,
 * typically "LKR") is what every stored amount is denominated in — nothing
 * about that changes here. This module only drives a DISPLAY-ONLY
 * conversion so that a guest can see the same bill quoted in their own
 * currency (foreign guests in USD/EUR, OTAs that pay in USD, etc.) while
 * the hotel's own books stay entirely in the base currency.
 *
 * Rates are fetched from a free, keyless FX API and cached in memory for
 * the lifetime of the page session (refreshed at most once per hour) so
 * repeated renders don't refetch on every keystroke.
 */

export type DisplayCurrencyCode = 'LKR' | 'USD' | 'EUR' | 'GBP' | 'INR';

export const DISPLAY_CURRENCIES: { code: DisplayCurrencyCode; label: string }[] = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'LKR', label: 'Sri Lankan Rupee' },
  { code: 'INR', label: 'Indian Rupee' },
];

interface RateCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

let cache: RateCache | null = null;
const ONE_HOUR_MS = 60 * 60 * 1000;

// Conservative fallback rates (approximate, LKR-based) used only if the
// live lookup fails (offline, API down, etc.) so the UI never breaks.
const FALLBACK_RATES_FROM_LKR: Record<string, number> = {
  LKR: 1,
  USD: 1 / 300,
  EUR: 1 / 325,
  GBP: 1 / 380,
  INR: 1 / 3.6,
};

async function fetchLiveRates(baseCurrency: string): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.result === 'success' && data.rates) {
      return data.rates as Record<string, number>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns a rates table keyed by ISO currency code, where 1 unit of
 * `baseCurrency` equals `rates[code]` units of that code. Cached for up to
 * an hour; falls back to static approximate rates if the live fetch fails.
 */
export async function getConversionRates(baseCurrency: string): Promise<Record<string, number>> {
  const now = Date.now();
  if (cache && cache.base === baseCurrency && now - cache.fetchedAt < ONE_HOUR_MS) {
    return cache.rates;
  }

  const live = await fetchLiveRates(baseCurrency);
  if (live) {
    cache = { base: baseCurrency, rates: live, fetchedAt: now };
    return live;
  }

  // Fallback: only have LKR-based approximations; derive others via LKR.
  if (baseCurrency === 'LKR') {
    return FALLBACK_RATES_FROM_LKR;
  }
  const lkrPerBase = 1 / (FALLBACK_RATES_FROM_LKR[baseCurrency] || 1);
  const derived: Record<string, number> = {};
  for (const [code, perLkr] of Object.entries(FALLBACK_RATES_FROM_LKR)) {
    derived[code] = perLkr * lkrPerBase;
  }
  return derived;
}

export function convertAmount(
  amountInBase: number,
  rates: Record<string, number>,
  targetCode: string
): number | null {
  const rate = rates[targetCode];
  if (!rate) return null;
  return amountInBase * rate;
}

export function formatMoney(amount: number, code: string): string {
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', LKR: 'Rs ', INR: '₹' };
  const symbol = symbols[code] || `${code} `;
  return `${symbol}${amount.toFixed(2)}`;
}
