import React from 'react';
import { useDisplayCurrency, DISPLAY_CURRENCIES, DisplayCurrencyCode } from '../../context/DisplayCurrencyContext.tsx';
import { Coins } from 'lucide-react';

/**
 * Lets any signed-in staff member choose which currency amounts are shown
 * in throughout the app (this browser only — the hotel's books stay in the
 * base accounting currency regardless of what's picked here).
 */
export const CurrencySelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { displayCurrency, setDisplayCurrency, baseCurrencyCode, ratesReady } = useDisplayCurrency();

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
          <Coins className="w-4 h-4" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900">Display Currency</div>
          <div className="text-[11px] text-slate-500">
            Amounts across the app will show in this currency.
            {baseCurrencyCode !== displayCurrency && (
              <> Accounting stays in <strong className="text-slate-700">{baseCurrencyCode}</strong>.</>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!ratesReady && (
          <span className="text-[10px] text-slate-400 italic">Fetching live rates…</span>
        )}
        <select
          value={displayCurrency}
          onChange={(e) => setDisplayCurrency(e.target.value as DisplayCurrencyCode)}
          className="p-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
        >
          {DISPLAY_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
