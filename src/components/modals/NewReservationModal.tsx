import React, { useState, useMemo, useEffect } from 'react';
import { Room, Reservation, RoomType, BookingSource, Payment, HotelSettings } from '../../types/hotel.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  createReservation,
  checkRoomOverlapConflict,
} from '../../services/pmsService.ts';
import { format, addDays, differenceInDays } from 'date-fns';
import { X, Calendar, User, Bed, DollarSign, AlertCircle, ShieldAlert } from 'lucide-react';

interface NewReservationModalProps {
  rooms: Room[];
  reservations: Reservation[];
  settings: HotelSettings;
  onClose: () => void;
  onSuccess: (resId: string) => void;
}

export const NewReservationModal: React.FC<NewReservationModalProps> = ({
  rooms,
  reservations,
  settings,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const staffUser = currentUser!;
  const today = format(new Date(), 'yyyy-MM-dd');
  const defaultDeparture = format(addDays(new Date(), 2), 'yyyy-MM-dd');

  // Form State
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestIdProof, setGuestIdProof] = useState('');
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(defaultDeparture);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomType, setRoomType] = useState<RoomType>('Double');
  const [assignedRoomId, setAssignedRoomId] = useState<string>('');
  const [customRate, setCustomRate] = useState<number>(140);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [bookingSource, setBookingSource] = useState<BookingSource>('Direct / Walk-in');
  const [specialRequests, setSpecialRequests] = useState('');

  // Initial Payment options
  const [initialPaymentType, setInitialPaymentType] = useState<'none' | 'full' | 'custom'>('none');
  const [customPaymentAmount, setCustomPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<Payment['paymentMethod']>('Credit Card');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-update rate default when room type changes
  useEffect(() => {
    const matchingRoom = rooms.find((r) => r.roomType === roomType);
    if (matchingRoom) {
      setCustomRate(matchingRoom.baseNightlyRate);
    }
  }, [roomType, rooms]);

  // Compute stay calculations
  const { numberOfNights, subtotal, taxAmount, totalAmount } = useMemo(() => {
    const nights = Math.max(1, differenceInDays(new Date(checkOutDate), new Date(checkInDate)));
    const sub = Number((nights * customRate).toFixed(2));
    const tax = Number((sub * (settings.taxRatePercent / 100)).toFixed(2));
    const total = Number(Math.max(0, sub + tax - discountAmount).toFixed(2));
    return {
      numberOfNights: nights,
      subtotal: sub,
      taxAmount: tax,
      totalAmount: total,
    };
  }, [checkInDate, checkOutDate, customRate, discountAmount, settings.taxRatePercent]);

  // Filter available rooms for the chosen dates and type
  const availableRoomsList = useMemo(() => {
    return rooms
      .filter((r) => r.operationalStatus === 'active')
      .map((room) => {
        const { hasConflict, conflictingReservation } = checkRoomOverlapConflict(
          room.id,
          checkInDate,
          checkOutDate,
          reservations
        );
        return {
          room,
          hasConflict,
          conflictingReservation,
        };
      });
  }, [rooms, reservations, checkInDate, checkOutDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (checkOutDate <= checkInDate) {
      setErrorMessage('Check-out date must be strictly after check-in date.');
      return;
    }

    if (assignedRoomId) {
      const target = availableRoomsList.find((item) => item.room.id === assignedRoomId);
      if (target?.hasConflict) {
        setErrorMessage(
          `Room ${target.room.roomNumber} has a date conflict with an existing active booking. Please select another room or leave unassigned.`
        );
        return;
      }
    }

    let initialPayment = 0;
    if (initialPaymentType === 'full') {
      initialPayment = totalAmount;
    } else if (initialPaymentType === 'custom') {
      initialPayment = Math.min(totalAmount, customPaymentAmount);
    }

    setIsSubmitting(true);
    try {
      const selectedRoom = rooms.find((r) => r.id === assignedRoomId);
      const resId = await createReservation(
        {
          guestName,
          guestEmail,
          guestPhone,
          guestIdProof,
          checkInDate,
          checkOutDate,
          adults,
          children,
          roomType,
          assignedRoomId: selectedRoom?.id,
          assignedRoomNumber: selectedRoom?.roomNumber,
          numberOfRooms: 1,
          ratePerNight: customRate,
          numberOfNights,
          discountAmount,
          taxAmount,
          totalAmount,
          initialPayment,
          paymentMethod: initialPayment > 0 ? paymentMethod : undefined,
          bookingSource,
          specialRequests,
        },
        staffUser
      );

      onSuccess(resId);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to create reservation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 my-8 space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Create New Guest Reservation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Input guest stay details, verify room availability, and calculate folio charges
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Guest Information */}
          <div className="space-y-3">
            <span className="font-semibold text-slate-800 tracking-wide block">
              1. Guest Information
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Primary Guest Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alexander Hamilton"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Contact Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. guest@company.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  ID / Passport Number
                </label>
                <input
                  type="text"
                  placeholder="Passport / State ID #"
                  value={guestIdProof}
                  onChange={(e) => setGuestIdProof(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Stay Dates & Room Selection */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <span className="font-semibold text-slate-800 tracking-wide block">
              2. Stay Duration & Room Category
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Check-In Date *
                </label>
                <input
                  type="date"
                  required
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Check-Out Date *
                </label>
                <input
                  type="date"
                  required
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Room Type *
                </label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value as RoomType)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                >
                  <option value="Single">Single ($95 - $115)</option>
                  <option value="Double">Double ($140 - $175)</option>
                  <option value="Twin">Twin ($135 - $165)</option>
                  <option value="Deluxe">Deluxe ($210 - $240)</option>
                  <option value="Suite">Suite ($320 - $360)</option>
                  <option value="Family room">Family room ($260 - $290)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Assign Specific Room
                </label>
                <select
                  value={assignedRoomId}
                  onChange={(e) => setAssignedRoomId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">-- Assign Later at Check-In --</option>
                  {availableRoomsList
                    .sort((a, b) => a.room.roomNumber.localeCompare(b.room.roomNumber, undefined, { numeric: true }))
                    .map(({ room, hasConflict }) => (
                      <option
                        key={room.id}
                        value={room.id}
                        disabled={hasConflict}
                      >
                        Room {room.roomNumber} ({room.roomType}, Floor {room.floor})
                        {hasConflict ? ' [UNAVAILABLE / OVERLAP]' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Adults
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={adults}
                    onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Children
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={children}
                    onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Booking Channel / Source
                </label>
                <select
                  value={bookingSource}
                  onChange={(e) => setBookingSource(e.target.value as BookingSource)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Direct / Walk-in">Direct / Walk-in</option>
                  <option value="Website">Website</option>
                  <option value="Booking.com">Booking.com</option>
                  <option value="Expedia">Expedia</option>
                  <option value="Phone / Email">Phone / Email</option>
                  <option value="Corporate">Corporate</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing & Rate Calculation */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <span className="font-semibold text-slate-800 tracking-wide block">
              3. Rate Breakdown & Folio Charges
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Agreed Rate per Night ($)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={customRate}
                  onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Discount Amount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Calculated Breakdown Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Stay Duration:</span>
                <span className="font-semibold">{numberOfNights} night{numberOfNights > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between">
                <span>Room Charges ({numberOfNights} × ${customRate.toFixed(2)}):</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & Hotel Surcharge ({settings.taxRatePercent}%):</span>
                <span className="font-mono">${taxAmount.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200 text-sm">
                <span>Total Folio Amount:</span>
                <span className="font-mono">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Deposit & Advance Payment */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <span className="font-semibold text-slate-800 tracking-wide block">
              4. Payment / Deposit Options
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setInitialPaymentType('none')}
                className={`p-2 border rounded-lg text-center font-medium transition-colors ${
                  initialPaymentType === 'none'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                No Deposit
              </button>
              <button
                type="button"
                onClick={() => setInitialPaymentType('full')}
                className={`p-2 border rounded-lg text-center font-medium transition-colors ${
                  initialPaymentType === 'full'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Prepay Full (${totalAmount.toFixed(2)})
              </button>
              <button
                type="button"
                onClick={() => setInitialPaymentType('custom')}
                className={`p-2 border rounded-lg text-center font-medium transition-colors ${
                  initialPaymentType === 'custom'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Custom Deposit
              </button>
            </div>

            {initialPaymentType !== 'none' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                {initialPaymentType === 'custom' && (
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">
                      Deposit Amount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={totalAmount}
                      value={customPaymentAmount}
                      onChange={(e) => setCustomPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
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
            )}
          </div>

          {/* Special Requests */}
          <div className="pt-2">
            <label className="block text-slate-600 mb-1 font-medium">
              Special Requests & Guest Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Early check-in requested, high floor, anniversary celebration..."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
