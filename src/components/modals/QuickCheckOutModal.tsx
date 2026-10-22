import React, { useState, useMemo } from 'react';
import { Reservation, Room, Payment } from '../../types/hotel.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { checkOutReservation, recordPayment } from '../../services/pmsService.ts';
import { X, LogOut, DollarSign, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { useDisplayCurrency } from '../../context/DisplayCurrencyContext.tsx';

interface QuickCheckOutModalProps {
  initialReservation?: Reservation;
  reservations: Reservation[];
  rooms: Room[];
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickCheckOutModal: React.FC<QuickCheckOutModalProps> = ({
  initialReservation,
  reservations,
  rooms,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const { formatAmount } = useDisplayCurrency();
  const staffUser = currentUser!;
  const inHouseGuests = useMemo(
    () => reservations.filter((r) => r.status === 'checked_in'),
    [reservations]
  );

  const [selectedResId, setSelectedResId] = useState<string>(
    initialReservation?.id || (inHouseGuests[0]?.id || '')
  );

  const activeRes = useMemo(
    () => reservations.find((r) => r.id === selectedResId),
    [reservations, selectedResId]
  );

  const assignedRoomObj = useMemo(
    () => rooms.find((r) => r.id === activeRes?.assignedRoomId),
    [rooms, activeRes]
  );

  const [paymentMethod, setPaymentMethod] = useState<Payment['paymentMethod']>('Credit Card');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasOutstandingBalance = activeRes ? activeRes.balanceAmount > 0.01 : false;

  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRes) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      // 1. If balance is due and user submitted, settle payment first
      if (hasOutstandingBalance) {
        await recordPayment(
          {
            reservationId: activeRes.id,
            guestName: activeRes.guestName,
            amount: activeRes.balanceAmount,
            paymentMethod,
            transactionReference: `TXN-CHKOUT-${Date.now().toString().slice(-6)}`,
            notes: 'Folio balance settlement upon checkout',
          },
          staffUser
        );
      }

      // 2. Perform checkout (marks room dirty & creates turnover task)
      await checkOutReservation(activeRes, assignedRoomObj, staffUser);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Check-out failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 text-xs">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <LogOut className="w-4 h-4 text-amber-600" />
              <span>Guest Check-Out & Folio Settlement</span>
            </h2>
            <p className="text-slate-500 mt-0.5">
              Review guest folio, settle outstanding balances, and release room to housekeeping
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

        <form onSubmit={handleCheckOut} className="space-y-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select In-House Guest
            </label>
            <select
              value={selectedResId}
              onChange={(e) => setSelectedResId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
            >
              {inHouseGuests.length === 0 ? (
                <option value="">No in-house guests currently checked in</option>
              ) : (
                inHouseGuests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.guestName} (Room {r.assignedRoomNumber || 'N/A'}) · Due out: {r.checkOutDate} · Bal: {formatAmount(r.balanceAmount)}
                  </option>
                ))
              )}
            </select>
          </div>

          {activeRes && (
            <div className="space-y-3">
              {/* Stay Summary Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>Guest: {activeRes.guestName}</span>
                  <span className="font-mono text-xs">Room {activeRes.assignedRoomNumber || 'N/A'}</span>
                </div>
                <div className="text-slate-600 flex justify-between">
                  <span>Reservation:</span>
                  <span className="font-mono">{activeRes.reservationNumber}</span>
                </div>
                <div className="text-slate-600 flex justify-between">
                  <span>Stay:</span>
                  <span>{activeRes.checkInDate} to {activeRes.checkOutDate} ({activeRes.numberOfNights} nights)</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span>Total Charges Billed:</span>
                  <span className="font-mono font-medium">{formatAmount(activeRes.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Payments Received:</span>
                  <span className="font-mono font-medium">{formatAmount(activeRes.paidAmount)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-sm">
                  <span className={hasOutstandingBalance ? 'text-amber-800' : 'text-emerald-700'}>
                    Outstanding Balance:
                  </span>
                  <span className={`font-mono ${hasOutstandingBalance ? 'text-amber-800' : 'text-emerald-700'}`}>
                    {formatAmount(activeRes.balanceAmount)}
                  </span>
                </div>
              </div>

              {/* Settlement Section if Balance Exists */}
              {hasOutstandingBalance ? (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-3">
                  <div className="font-semibold text-amber-900 flex items-center justify-between">
                    <span>Outstanding Settlement Required</span>
                    <span className="font-mono text-sm">{formatAmount(activeRes.balanceAmount)}</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Process final payment now to settle folio and finalize check-out.
                  </p>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Payment Method
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
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Folio is fully settled ({formatAmount(0)} balance). Ready to finalize checkout.</span>
                </div>
              )}

              {/* Housekeeping Turnover Notice */}
              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
                Notice: Checking out will automatically flag <strong>Room {activeRes.assignedRoomNumber || 'N/A'}</strong> as <strong className="text-amber-700">DIRTY</strong> and assign a turnover cleaning task to housekeeping.
              </div>
            </div>
          )}

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
              disabled={isSubmitting || !activeRes}
              className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
            >
              {isSubmitting
                ? 'Processing...'
                : hasOutstandingBalance
                ? `Settle ${formatAmount(activeRes?.balanceAmount ?? 0)} & Check Out`
                : 'Complete Check-Out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
