import React, { useState } from 'react';
import { Reservation, Invoice, Payment } from '../../types/hotel.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { recordPayment } from '../../services/pmsService.ts';
import { X, CreditCard, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

interface PaymentModalProps {
  reservation: Reservation;
  invoice?: Invoice | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  reservation,
  invoice,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const staffUser = currentUser!;
  const maxDue = invoice ? invoice.balanceAmount : reservation.balanceAmount;

  const [amount, setAmount] = useState<number>(Number(maxDue.toFixed(2)));
  const [paymentMethod, setPaymentMethod] = useState<Payment['paymentMethod']>('Credit Card');
  const [transactionReference, setTransactionReference] = useState(
    `TXN-${Date.now().toString().slice(-6)}`
  );
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg('Payment amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await recordPayment(
        {
          reservationId: reservation.id,
          invoiceId: invoice?.id,
          guestName: reservation.guestName,
          amount: Number(amount),
          paymentMethod,
          transactionReference,
          notes,
        },
        staffUser
      );
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Payment processing failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-xs">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Record Folio Payment</span>
            </h2>
            <p className="text-slate-500 mt-0.5">
              Post payment against {reservation.guestName} ({reservation.reservationNumber})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="flex justify-between font-semibold text-slate-900">
              <span>Outstanding Due:</span>
              <span className="font-mono text-sm text-amber-800">
                ${maxDue.toFixed(2)}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>Total Stay Charges:</span>
              <span className="font-mono">${reservation.totalAmount.toFixed(2)}</span>
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>Previously Paid:</span>
              <span className="font-mono text-emerald-700 font-medium">
                ${reservation.paidAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Payment Amount ($) *
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={maxDue + 500}
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-slate-300 rounded-lg font-mono text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Cash">Cash</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Digital Wallet">Digital Wallet</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Transaction Ref #
              </label>
              <input
                type="text"
                required
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Internal Payment Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Front desk terminal slip #4912, cash drawer, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Recording...' : `Record Payment ($${amount.toFixed(2)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
