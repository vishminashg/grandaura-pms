import React, { useState, useMemo } from 'react';
import { Reservation, Room } from '../../types/hotel.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { checkInReservation, checkRoomOverlapConflict } from '../../services/pmsService.ts';
import { X, LogIn, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { useDisplayCurrency } from '../../context/DisplayCurrencyContext.tsx';

interface QuickCheckInModalProps {
  initialReservation?: Reservation;
  reservations: Reservation[];
  rooms: Room[];
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickCheckInModal: React.FC<QuickCheckInModalProps> = ({
  initialReservation,
  reservations,
  rooms,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const { formatAmount } = useDisplayCurrency();
  const staffUser = currentUser!;
  const confirmedReservations = useMemo(
    () => reservations.filter((r) => r.status === 'confirmed'),
    [reservations]
  );

  const [selectedResId, setSelectedResId] = useState<string>(
    initialReservation?.id || (confirmedReservations[0]?.id || '')
  );

  const activeRes = useMemo(
    () => reservations.find((r) => r.id === selectedResId),
    [reservations, selectedResId]
  );

  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    activeRes?.assignedRoomId || ''
  );

  const [housekeepingOverride, setHousekeepingOverride] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selectedRoomId if activeRes changes
  React.useEffect(() => {
    if (activeRes?.assignedRoomId) {
      setSelectedRoomId(activeRes.assignedRoomId);
    }
  }, [activeRes]);

  const assignedRoomObj = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId),
    [rooms, selectedRoomId]
  );

  const isRoomDirty =
    assignedRoomObj &&
    assignedRoomObj.housekeepingStatus !== 'clean' &&
    assignedRoomObj.housekeepingStatus !== 'inspected';

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRes || !selectedRoomId) {
      setErrorMsg('Please select a valid reservation and assign a room.');
      return;
    }

    const targetRoom = rooms.find((r) => r.id === selectedRoomId);
    if (!targetRoom) return;

    if (targetRoom.operationalStatus === 'out_of_order') {
      setErrorMsg(`Room ${targetRoom.roomNumber} is currently out of order.`);
      return;
    }

    // Check conflict
    const { hasConflict, conflictingReservation } = checkRoomOverlapConflict(
      targetRoom.id,
      activeRes.checkInDate,
      activeRes.checkOutDate,
      reservations,
      activeRes.id
    );

    if (hasConflict && conflictingReservation) {
      setErrorMsg(
        `Room ${targetRoom.roomNumber} is already reserved by ${conflictingReservation.guestName} during this time.`
      );
      return;
    }

    if (isRoomDirty && !housekeepingOverride) {
      setErrorMsg('This room has not yet been marked Clean or Inspected. Check the override box below to proceed anyway.');
      return;
    }

    setIsSubmitting(true);
    try {
      await checkInReservation(activeRes, targetRoom.id, targetRoom.roomNumber, staffUser);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Check-in failed.');
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
              <LogIn className="w-4 h-4 text-emerald-600" />
              <span>Guest Check-In</span>
            </h2>
            <p className="text-slate-500 mt-0.5">
              Confirm guest identity, room key assignment, and registration
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
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleCheckIn} className="space-y-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Guest Reservation
            </label>
            <select
              value={selectedResId}
              onChange={(e) => setSelectedResId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
            >
              {confirmedReservations.length === 0 ? (
                <option value="">No pending arrivals available</option>
              ) : (
                confirmedReservations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.guestName} ({r.reservationNumber}) · {r.roomType} · Check-in: {r.checkInDate}
                  </option>
                ))
              )}
            </select>
          </div>

          {activeRes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="flex justify-between font-semibold text-slate-900">
                <span>Guest: {activeRes.guestName}</span>
                <span className="font-mono text-[11px]">{activeRes.reservationNumber}</span>
              </div>
              <div className="text-slate-600">
                Dates: {activeRes.checkInDate} to {activeRes.checkOutDate} ({activeRes.numberOfNights} nights)
              </div>
              <div className="text-slate-600">
                Party: {activeRes.adults} Adults, {activeRes.children} Children · Source: {activeRes.bookingSource}
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span>Folio Balance:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatAmount(activeRes.balanceAmount)} (Total: {formatAmount(activeRes.totalAmount)})
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Assign / Confirm Room
            </label>
            <select
              required
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="">-- Choose Room --</option>
              {rooms
                .filter((r) => r.operationalStatus === 'active')
                .map((room) => {
                  const { hasConflict } = checkRoomOverlapConflict(
                    room.id,
                    activeRes?.checkInDate || '',
                    activeRes?.checkOutDate || '',
                    reservations,
                    activeRes?.id
                  );

                  return (
                    <option key={room.id} value={room.id} disabled={hasConflict}>
                      Room {room.roomNumber} ({room.roomType}, Floor {room.floor}) - {room.housekeepingStatus.toUpperCase()}
                      {hasConflict ? ' [OVERLAP CONFLICT]' : ''}
                    </option>
                  );
                })}
            </select>
          </div>

          {/* Housekeeping status warning if not clean */}
          {isRoomDirty && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <div className="flex items-start gap-2 text-amber-800 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Housekeeping Notice: Room {assignedRoomObj?.roomNumber} is currently {assignedRoomObj?.housekeepingStatus.toUpperCase()}.</span>
              </div>
              <p className="text-[11px] text-amber-700">
                Hotel policy recommends rooms be marked 'Clean' or 'Inspected' prior to key handover.
              </p>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={housekeepingOverride}
                  onChange={(e) => setHousekeepingOverride(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span className="font-medium text-slate-800">
                  Supervisor override: Proceed with early check-in
                </span>
              </label>
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
              disabled={isSubmitting || !activeRes || !selectedRoomId}
              className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Checking in...' : 'Complete Check-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
