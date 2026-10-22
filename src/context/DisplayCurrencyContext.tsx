import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { DisplayCurrencyCode, DISPLAY_CURRENCIES, getConversionRates, convertAmount, formatMoney } from '../lib/currency.ts';

const STORAGE_KEY = 'grandaura_pms_display_currency';

interface DisplayCurrencyContextType {
  /** The currency every staff member sees amounts rendered in, this browser only. */
  displayCurrency: DisplayCurrencyCode;
  setDisplayCurrency: (code: DisplayCurrencyCode) => void;
  /** The hotel's real accounting currency — everything is stored in this currency regardless of display. */
  baseCurrencyCode: string;
  /** True once live conversion rates have loaded for the current base currency. */
  ratesReady: boolean;
  /** Converts an amount stored in the base currency into the selected display currency (or null if rates aren't ready / unsupported). */
  convert: (amountInBase: number) => number | null;
  /** Formats an amount stored in the base currency as a string in the selected display currency, falling back to the base currency if conversion isn't available yet. */
  formatAmount: (amountInBase: number) => string;
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextType | undefined>(undefined);

export const DisplayCurrencyProvider: React.FC<{ baseCurrencyCode: string; children: React.ReactNode }> = ({
  baseCurrencyCode,
  children,
}) => {
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrencyCode>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'USD' || saved === 'EUR' || saved === 'LKR' || saved === 'GBP' || saved === 'INR') {
        return saved as DisplayCurrencyCode;
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — fall through to default
    }
    return 'LKR';
  });

  const [rates, setRates] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRates(null);
    getConversionRates(baseCurrencyCode).then((r) => {
      if (!cancelled) setRates(r);
    });
    return () => {
      cancelled = true;
    };
  }, [baseCurrencyCode]);

  const setDisplayCurrency = useCallback((code: DisplayCurrencyCode) => {
    setDisplayCurrencyState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore — this is just a per-viewer convenience
    }
  }, []);

  const convert = useCallback(
    (amountInBase: number): number | null => {
      if (!rates) return null;
      if (displayCurrency === baseCurrencyCode) return amountInBase;
      return convertAmount(amountInBase, rates, displayCurrency);
    },
    [rates, displayCurrency, baseCurrencyCode]
  );

  const formatAmount = useCallback(
    (amountInBase: number): string => {
      const converted = convert(amountInBase);
      if (converted === null) {
        // Rates not ready yet (or unsupported pair) — show the true base-currency amount rather than nothing.
        return formatMoney(amountInBase, baseCurrencyCode);
      }
      return formatMoney(converted, displayCurrency);
    },
    [convert, displayCurrency, baseCurrencyCode]
  );

  const value = useMemo(
    () => ({
      displayCurrency,
      setDisplayCurrency,
      baseCurrencyCode,
      ratesReady: rates !== null,
      convert,
      formatAmount,
    }),
    [displayCurrency, setDisplayCurrency, baseCurrencyCode, rates, convert, formatAmount]
  );

  return <DisplayCurrencyContext.Provider value={value}>{children}</DisplayCurrencyContext.Provider>;
};

export const useDisplayCurrency = (): DisplayCurrencyContextType => {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) {
    throw new Error('useDisplayCurrency must be used within a DisplayCurrencyProvider');
  }
  return ctx;
};

export { DISPLAY_CURRENCIES };
export type { DisplayCurrencyCode };
