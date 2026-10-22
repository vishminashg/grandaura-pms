import React, { useEffect, useState } from 'react';
import { getConversionRates, convertAmount, formatMoney } from '../../lib/currency.ts';

interface MultiCurrencyAmountProps {
  /** The amount, denominated in `baseCurrencyCode` (the hotel's accounting currency). */
  amountInBase: number;
  baseCurrencyCode: string;
  /** Which other currencies to show as live-converted equivalents. */
  targets?: string[];
  className?: string;
}

/**
 * Shows small live-converted equivalents next to a base-currency amount —
 * e.g. a bill stored in LKR also shown in USD/EUR so a foreign guest or an
 * OTA can read it in their own currency. Purely a display aid: nothing is
 * ever stored in these converted amounts, and accounting stays in base.
 */
export const MultiCurrencyAmount: React.FC<MultiCurrencyAmountProps> = ({
  amountInBase,
  baseCurrencyCode,
  targets = ['USD', 'EUR'],
  className = '',
}) => {
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getConversionRates(baseCurrencyCode).then((r) => {
      if (!cancelled) setRates(r);
    });
    return () => {
      cancelled = true;
    };
  }, [baseCurrencyCode]);

  const relevantTargets = targets.filter((t) => t !== baseCurrencyCode);
  if (relevantTargets.length === 0) return null;

  return (
    <div className={`text-[11px] text-slate-400 flex flex-wrap gap-x-2 ${className}`}>
      {!rates ? (
        <span className="italic">Fetching live rates…</span>
      ) : (
        relevantTargets.map((code) => {
          const converted = convertAmount(amountInBase, rates, code);
          if (converted === null) return null;
          return (
            <span key={code} className="tabular-nums">
              &asymp; {formatMoney(converted, code)}
            </span>
          );
        })
      )}
    </div>
  );
};
