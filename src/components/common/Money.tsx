import React from 'react';
import { useDisplayCurrency } from '../../context/DisplayCurrencyContext.tsx';

interface MoneyProps {
  /** Amount as stored in the hotel's base accounting currency. */
  amount: number;
  className?: string;
}

/**
 * Renders a stored (base-currency) amount converted into whatever display
 * currency the signed-in staff member has chosen (see the selector on the
 * Dashboard). The underlying stored value never changes — this is purely a
 * rendering convenience so every screen in the app reflects one consistent,
 * staff-chosen currency.
 */
export const Money: React.FC<MoneyProps> = ({ amount, className }) => {
  const { formatAmount } = useDisplayCurrency();
  return <span className={className}>{formatAmount(amount)}</span>;
};
