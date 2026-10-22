import React, { useState, useMemo } from 'react';
import { Reservation, Room, ReservationStatus, BookingSource } from '../../types/hotel.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { Money } from '../common/Money.tsx';
import {
  checkOutReservation,
  cancelReservation,
  assignRoomToReservation,
  checkRoomOverlapConflict,
} from '../../services/pmsService.ts';
import { format } from 'date-fns';
import { DateRangeCalendar } from '../common/DateRangeCalendar.tsx';
import {
  Search,
  Filter,
  Plus,
  LogIn,
  LogOut,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Calendar,
  User,
  Bed,
  DoorOpen,
} from 'lucide-react';

interface ReservationManagementViewProps {
  reservations: Reservation[];
  rooms: Room[];
  onOpenNewReservation: () => void;
  onOpenQuickCheckIn: (res: Reservation) => void;
  onOpenQuickCheckOut: (res: Reservation) => void;
  onOpenFolio: (res: Reservation) => void;
  onOpenPaymentModal: (res: Reservation) => void;
}

export const ReservationManagementView: React.FC<ReservationManagementViewProps> = ({
  reservations,
  rooms,
  onOpenNewReservation,
  onOpenQuickCheckIn,
  onOpenQuickCheckOut,
  onOpenFolio,
  onOpenPaymentModal,
}) => {
  const { currentUser, can } = useAuth();
  const { showSuccess, showError } = useToast();
  const staffUser = currentUser!;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'past' | 'custom'>('all');
  const [customRangeStart, setCustomRangeStart] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [customRangeEnd, setCustomRangeEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Room Assignment Modal state
  const [assigningRes, setAssigningRes] = useState<Reservation | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const filteredReservations = useMemo(() => {
    return reservations.filter((res) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = res.guestName.toLowerCase().includes(q);
        const matchResNo = res.reservationNumber.toLowerCase().includes(q);
        const matchEmail = res.guestEmail.toLowerCase().includes(q);
        const matchPhone = res.guestPhone.toLowerCase().includes(q);
        const matchRoom = (res.assignedRoomNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchResNo && !matchEmail && !matchPhone && !matchRoom) {
          return false;
        }
      }

      // Status
      if (selectedStatus !== 'all' && res.status !== selectedStatus) return false;

      // Source
      if (selectedSource !== 'all' && res.bookingSource !== selectedSource) return false;

      // Date
      if (dateFilter === 'today') {
        const isArrivingToday = res.checkInDate === todayStr;
        const isDepartingToday = res.checkOutDate === todayStr;
        const isInHouse = res.status === 'checked_in';
        if (!isArrivingToday && !isDepartingToday && !isInHouse) return false;
      } else if (dateFilter === 'upcoming') {
        if (res.checkInDate < todayStr && res.status !== 'checked_in') return false;
      } else if (dateFilter === 'past') {
        if (res.checkOutDate >= todayStr && res.status !== 'checked_out') return false;
      } else if (dateFilter === 'custom') {
        // Include any reservation whose stay overlaps the chosen custom range at all.
        const overlaps = res.checkInDate <= customRangeEnd && res.checkOutDate >= customRangeStart;
        if (!overlaps) return false;
      }

      return true;
    });
  }, [
    reservations,
    searchQuery,
    selectedStatus,
    selectedSource,
    dateFilter,
    todayStr,
    customRangeStart,
    customRangeEnd,
  ]);

  const handleOpenAssignModal = (res: Reservation) => {
    setAssigningRes(res);
    setSelectedRoomId(res.assignedRoomId || '');
    setAssignmentError(null);
  };

  const handleSaveRoomAssignment = async () => {
    if (!assigningRes || !selectedRoomId) return;

    const targetRoom = rooms.find((r) => r.id === selectedRoomId);
    if (!targetRoom) return;

    // Check overlap conflict
    const { hasConflict, conflictingReservation } = checkRoomOverlapConflict(
      selectedRoomId,
      assigningRes.checkInDate,
      assigningRes.checkOutDate,
      reservations,
      assigningRes.id
    );

    if (hasConflict && conflictingReservation) {
      setAssignmentError(
        `Room ${targetRoom.roomNumber} is already reserved by ${conflictingReservation.guestName} (${conflictingReservation.checkInDate} to ${conflictingReservation.checkOutDate}). Please choose a different room.`
      );
      return;
    }

    try {
      await assignRoomToReservation(
        assigningRes.id,
        assigningRes.reservationNumber,
        targetRoom.id,
        targetRoom.roomNumber,
        staffUser
      );
      showSuccess(`Room ${targetRoom.roomNumber} assigned to ${assigningRes.guestName} (${assigningRes.reservationNumber}).`);
      setAssigningRes(null);
    } catch (err) {
      console.error(err);
      setAssignmentError('Failed to assign room.');
      showError('Failed to assign room. Please try again.');
    }
  };

  const handleCancelBooking = async (res: Reservation) => {
    if (!can('manage_reservations')) return;
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel reservation ${res.reservationNumber} for ${res.guestName}?`
    );
    if (!confirmCancel) return;

    try {
      await cancelReservation(res.id, res.reservationNumber, 'Cancelled by staff request', staffUser);
      showSuccess(`Reservation ${res.reservationNumber} cancelled.`);
    } catch (err) {
      console.error(err);
      showError(`Failed to cancel reservation ${res.reservationNumber}.`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Reservation Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Bookings, guest stays, room assignments, and folio balances
          </p>
        </div>

        {can('manage_reservations') && (
          <button
            onClick={onOpenNewReservation}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Reservation</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search guest name, RES#, email, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In (In-House)</option>
              <option value="checked_out">Checked Out</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Booking Source */}
          <div>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">All Sources</option>
              <option value="Direct / Walk-in">Direct / Walk-in</option>
              <option value="Website">Website</option>
              <option value="Booking.com">Booking.com</option>
              <option value="Expedia">Expedia</option>
              <option value="Phone / Email">Phone / Email</option>
              <option value="Corporate">Corporate</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">All Dates</option>
              <option value="today">Today's Activity</option>
              <option value="upcoming">Upcoming & Active</option>
              <option value="past">Past Stays</option>
              <option value="custom">Custom Range… (Calendar)</option>
            </select>
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="pt-2 border-t border-slate-100 max-w-sm">
            <DateRangeCalendar
              checkInDate={customRangeStart}
              checkOutDate={customRangeEnd}
              label="Custom Date Range"
              onChange={(start, end) => {
                setCustomRangeStart(start);
                setCustomRangeEnd(end);
              }}
            />
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-900">{filteredReservations.length}</strong> reservations
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Confirmed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> In-House
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> Departed
            </span>
          </span>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Reservation #</th>
                <th className="py-3 px-4">Guest</th>
                <th className="py-3 px-4">Stay Dates</th>
                <th className="py-3 px-4">Room Type & Room #</th>
                <th className="py-3 px-4">Guests</th>
                <th className="py-3 px-4 text-right">Total / Balance</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                    No reservations matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => {
                  const statusBadgeClass =
                    res.status === 'checked_in'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : res.status === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : res.status === 'checked_out'
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200';

                  const isTodayArrival = res.checkInDate === todayStr && res.status === 'confirmed';
                  const isTodayDeparture = res.checkOutDate === todayStr && res.status === 'checked_in';

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Reservation Number */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-slate-900 block">
                          {res.reservationNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {res.createdAt.slice(0, 10)}
                        </span>
                      </td>

                      {/* Guest Details */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">
                          {res.guestName}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-44">
                          {res.guestEmail || res.guestPhone}
                        </span>
                        {res.specialRequests && (
                          <span className="text-[10px] text-amber-700 italic block truncate max-w-44" title={res.specialRequests}>
                            Req: {res.specialRequests}
                          </span>
                        )}
                      </td>

                      {/* Stay Dates */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {res.checkInDate} → {res.checkOutDate}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {res.numberOfNights} night{res.numberOfNights > 1 ? 's' : ''}
                          {isTodayArrival && (
                            <span className="ml-1 text-emerald-700 font-semibold bg-emerald-50 px-1 py-0.2 rounded">
                              · Arriving Today
                            </span>
                          )}
                          {isTodayDeparture && (
                            <span className="ml-1 text-amber-700 font-semibold bg-amber-50 px-1 py-0.2 rounded">
                              · Due Out Today
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Room Type & Assigned Room */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 block">
                          {res.roomType}
                        </span>
                        <div className="mt-0.5">
                          {res.assignedRoomNumber ? (
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                              Room {res.assignedRoomNumber}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenAssignModal(res)}
                              className="text-[11px] text-amber-700 font-medium underline hover:text-amber-900"
                            >
                              Assign Room
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Guests */}
                      <td className="py-3 px-4 tabular-nums text-slate-600">
                        {res.adults}A {res.children > 0 ? `· ${res.children}C` : ''}
                      </td>

                      {/* Total & Balance */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-semibold text-slate-900 tabular-nums">
                          <Money amount={res.totalAmount} />
                        </div>
                        <div className="text-[11px] font-mono tabular-nums">
                          {res.balanceAmount > 0.01 ? (
                            <span className="text-amber-700 font-semibold">
                              Due: <Money amount={res.balanceAmount} />
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">Settled</span>
                          )}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4 text-slate-600">
                        <span className="text-[11px]">{res.bookingSource}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadgeClass}`}
                        >
                          {res.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Check-In */}
                          {res.status === 'confirmed' && can('checkin_checkout') && (
                            <button
                              onClick={() => onOpenQuickCheckIn(res)}
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              title="Check In Guest"
                            >
                              <LogIn className="w-4 h-4" />
                            </button>
                          )}

                          {/* Check-Out */}
                          {res.status === 'checked_in' && can('checkin_checkout') && (
                            <button
                              onClick={() => onOpenQuickCheckOut(res)}
                              className="p-1.5 text-amber-700 hover:bg-amber-50 rounded transition-colors"
                              title="Check Out Guest"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          )}

                          {/* View Folio / Invoice */}
                          <button
                            onClick={() => onOpenFolio(res)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            title="View Folio & Invoices"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Record Payment */}
                          {res.balanceAmount > 0 && can('manage_billing') && (
                            <button
                              onClick={() => onOpenPaymentModal(res)}
                              className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                              title="Record Payment"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          {/* Assign or Change Room */}
                          {res.status !== 'checked_out' && res.status !== 'cancelled' && can('manage_reservations') && (
                            <button
                              onClick={() => handleOpenAssignModal(res)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                              title="Assign or Change Room"
                            >
                              <DoorOpen className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel Reservation */}
                          {res.status === 'confirmed' && can('manage_reservations') && (
                            <button
                              onClick={() => handleCancelBooking(res)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Cancel Reservation"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Room Assignment Modal */}
      {assigningRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Assign Room to Reservation
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {assigningRes.guestName} · {assigningRes.roomType} · {assigningRes.checkInDate} to {assigningRes.checkOutDate}
              </p>
            </div>

            {assignmentError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{assignmentError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Available Room
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="">-- Choose a room --</option>
                {rooms
                  .filter((r) => r.operationalStatus === 'active')
                  .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }))
                  .map((room) => {
                    const { hasConflict } = checkRoomOverlapConflict(
                      room.id,
                      assigningRes.checkInDate,
                      assigningRes.checkOutDate,
                      reservations,
                      assigningRes.id
                    );

                    const isSameType = room.roomType === assigningRes.roomType;

                    return (
                      <option
                        key={room.id}
                        value={room.id}
                        disabled={hasConflict}
                      >
                        Room {room.roomNumber} ({room.roomType}, Floor {room.floor})
                        {isSameType ? ' ★ Matches Type' : ''}
                        {hasConflict ? ' [UNAVAILABLE / OVERLAP]' : ''}
                      </option>
                    );
                  })}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Rooms with overlapping reservations for this period are automatically disabled to prevent double bookings.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssigningRes(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRoomAssignment}
                disabled={!selectedRoomId}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
