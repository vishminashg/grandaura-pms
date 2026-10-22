import React, { useMemo } from 'react';
import { Room, Reservation, Payment, HousekeepingTask } from '../../types/hotel.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useDisplayCurrency } from '../../context/DisplayCurrencyContext.tsx';
import { CurrencySelector } from '../common/CurrencySelector.tsx';
import { Money } from '../common/Money.tsx';
import { format, subDays, addDays, isSameDay, parseISO } from 'date-fns';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  BedDouble,
  DoorOpen,
  CalendarCheck,
  CalendarX,
  Users,
  DollarSign,
  Sparkles,
  ArrowUpRight,
  LogIn,
  LogOut,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface DashboardViewProps {
  rooms: Room[];
  reservations: Reservation[];
  payments: Payment[];
  housekeepingTasks: HousekeepingTask[];
  onOpenNewReservation: () => void;
  onOpenQuickCheckIn: (res?: Reservation) => void;
  onOpenQuickCheckOut: (res?: Reservation) => void;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  rooms,
  reservations,
  payments,
  housekeepingTasks,
  onOpenNewReservation,
  onOpenQuickCheckIn,
  onOpenQuickCheckOut,
  onNavigateToTab,
}) => {
  const { can } = useAuth();
  const { formatAmount } = useDisplayCurrency();
  const today = format(new Date(), 'yyyy-MM-dd');

  // ----------------------------------------------------------------------
  // Precise Real-Time Metrics Calculations
  // ----------------------------------------------------------------------

  const metrics = useMemo(() => {
    const totalRooms = rooms.length;
    const activeRooms = rooms.filter((r) => r.operationalStatus === 'active');
    const outOfOrderRooms = rooms.filter((r) => r.operationalStatus === 'out_of_order');
    const sellableRoomsCount = activeRooms.length;

    // In-house reservations (checked_in)
    const inHouseReservations = reservations.filter((r) => r.status === 'checked_in');

    // Occupied rooms today: rooms assigned to checked_in reservations
    const occupiedRoomIds = new Set(
      inHouseReservations
        .map((r) => r.assignedRoomId)
        .filter((id): id is string => Boolean(id))
    );
    const occupiedRoomsCount = occupiedRoomIds.size;

    // Available rooms today = Active sellable rooms not occupied
    const availableRoomsCount = Math.max(0, sellableRoomsCount - occupiedRoomsCount);

    // Occupancy Rate formula: occupied sellable rooms / total sellable rooms * 100
    // (excludes out-of-order rooms from sellable denominator)
    const occupancyRate =
      sellableRoomsCount > 0
        ? Number(((occupiedRoomsCount / sellableRoomsCount) * 100).toFixed(1))
        : 0;

    // Rooms requiring cleaning (dirty or in_progress)
    const roomsRequiringCleaning = rooms.filter(
      (r) => r.housekeepingStatus === 'dirty' || r.housekeepingStatus === 'in_progress'
    ).length;

    // Arrivals today: confirmed reservations with checkInDate === today
    const arrivalsToday = reservations.filter(
      (r) => r.status === 'confirmed' && r.checkInDate === today
    );

    // Departures today: checked_in reservations with checkOutDate === today
    const departuresToday = reservations.filter(
      (r) => r.status === 'checked_in' && r.checkOutDate === today
    );

    // In-house guests: total adults + children in checked_in reservations
    const inHouseGuestsCount = inHouseReservations.reduce(
      (sum, r) => sum + (r.adults || 0) + (r.children || 0),
      0
    );

    // Today's revenue: payments recorded today
    const todaysPayments = payments.filter((p) => p.createdAt.startsWith(today));
    const todayRevenue = Number(
      todaysPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)
    );

    return {
      totalRooms,
      sellableRoomsCount,
      outOfOrderCount: outOfOrderRooms.length,
      availableRoomsCount,
      occupiedRoomsCount,
      occupancyRate,
      roomsRequiringCleaning,
      arrivalsToday,
      departuresToday,
      inHouseReservations,
      inHouseGuestsCount,
      todayRevenue,
    };
  }, [rooms, reservations, payments, today]);

  // ----------------------------------------------------------------------
  // 7-Day Occupancy & Revenue Data for Charts
  // ----------------------------------------------------------------------
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayLabel = format(d, 'EEE, MMM d');

      // Calculate rooms occupied on this historical/current date
      const occupiedOnDate = reservations.filter((r) => {
        if (r.status === 'cancelled' || r.status === 'no_show') return false;
        return dateStr >= r.checkInDate && dateStr < r.checkOutDate;
      }).length;

      const rate =
        metrics.sellableRoomsCount > 0
          ? Math.min(
              100,
              Number(((occupiedOnDate / metrics.sellableRoomsCount) * 100).toFixed(1))
            )
          : 0;

      // Revenue on this date
      const revOnDate = payments
        .filter((p) => p.createdAt.startsWith(dateStr))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      data.push({
        date: dateStr,
        label: dayLabel,
        occupancyRate: rate,
        occupiedRooms: occupiedOnDate,
        revenue: Number(revOnDate.toFixed(2)),
      });
    }
    return data;
  }, [reservations, payments, metrics.sellableRoomsCount]);

  // Room status breakdown counts
  const roomStatusCounts = useMemo(() => {
    return {
      clean: rooms.filter((r) => r.housekeepingStatus === 'clean' && r.operationalStatus === 'active').length,
      inspected: rooms.filter((r) => r.housekeepingStatus === 'inspected' && r.operationalStatus === 'active').length,
      dirty: rooms.filter((r) => r.housekeepingStatus === 'dirty' && r.operationalStatus === 'active').length,
      in_progress: rooms.filter((r) => r.housekeepingStatus === 'in_progress' && r.operationalStatus === 'active').length,
      out_of_order: rooms.filter((r) => r.operationalStatus === 'out_of_order').length,
    };
  }, [rooms]);

  return (
    <div className="space-y-8 pb-12">
      {/* Page Title & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Property Overview
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time daily operations · {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Quick Actions (Create Reservation, Quick Check-in, Quick Check-out) */}
        <div className="flex items-center gap-2 flex-wrap">
          {can('manage_reservations') && (
            <button
              onClick={onOpenNewReservation}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Reservation</span>
            </button>
          )}

          {can('checkin_checkout') && (
            <>
              <button
                onClick={() => onOpenQuickCheckIn()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                <span>Guest Check-In</span>
              </button>

              <button
                onClick={() => onOpenQuickCheckOut()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-amber-600" />
                <span>Guest Check-Out</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Display Currency Selector */}
      <CurrencySelector />

      {/* 8 Mandatory Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Rooms */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Rooms</span>
            <BedDouble className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {metrics.totalRooms}
            </span>
            <span className="text-xs text-slate-500">
              ({metrics.sellableRoomsCount} sellable)
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
            <span>{metrics.outOfOrderCount} out of order</span>
            <span aria-hidden="true">·</span>
            <span>Floors 1–3</span>
          </div>
        </div>

        {/* Card 2: Available Rooms */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Available Today</span>
            <DoorOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
              {metrics.availableRoomsCount}
            </span>
            <span className="text-xs text-slate-500">
              of {metrics.sellableRoomsCount}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
            <span>Calculated by reservation dates</span>
          </div>
        </div>

        {/* Card 3: Occupied Rooms */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Occupied Rooms</span>
            <CalendarCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {metrics.occupiedRoomsCount}
            </span>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              {metrics.occupancyRate}% Occ
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
            <span>{metrics.inHouseReservations.length} active stays</span>
          </div>
        </div>

        {/* Card 4: Rooms Requiring Cleaning */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Requires Cleaning</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-700 tabular-nums">
              {metrics.roomsRequiringCleaning}
            </span>
            <span className="text-xs text-slate-500">rooms</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
            <button
              onClick={() => onNavigateToTab('housekeeping')}
              className="text-amber-700 hover:underline font-medium"
            >
              View turnover queue →
            </button>
          </div>
        </div>

        {/* Card 5: Arrivals Today */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Arrivals Today</span>
            <LogIn className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {metrics.arrivalsToday.length}
            </span>
            <span className="text-xs text-slate-500">guests arriving</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
            <span>Check-in from 15:00</span>
          </div>
        </div>

        {/* Card 6: Departures Today */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Departures Today</span>
            <LogOut className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {metrics.departuresToday.length}
            </span>
            <span className="text-xs text-slate-500">check-outs</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
            <span>Standard checkout 11:00</span>
          </div>
        </div>

        {/* Card 7: In-House Guests */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>In-House Guests</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {metrics.inHouseGuestsCount}
            </span>
            <span className="text-xs text-slate-500">registered guests</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
            <span>Across {metrics.occupiedRoomsCount} occupied rooms</span>
          </div>
        </div>

        {/* Card 8: Today's Revenue */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Today's Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums font-mono">
              <Money amount={metrics.todayRevenue} />
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
            <span>Actual payments processed</span>
          </div>
        </div>
      </div>

      {/* Charts Section: Occupancy Rate & Revenue Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Rate Trend Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Occupancy Rate (7 Days)
              </h2>
              <p className="text-xs text-slate-500">
                Formula: Occupied sellable rooms ÷ {metrics.sellableRoomsCount} sellable rooms × 100
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-slate-900 tabular-nums">
                {metrics.occupancyRate}%
              </span>
              <span className="block text-[11px] text-slate-400">Current</span>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
                          <p className="font-semibold">{d.label}</p>
                          <p className="mt-1 text-slate-300">
                            Occupancy: <span className="text-white font-mono font-medium">{d.occupancyRate}%</span>
                          </p>
                          <p className="text-slate-300">
                            Occupied Rooms: <span className="text-white font-mono font-medium">{d.occupiedRooms} / {metrics.sellableRoomsCount}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="occupancyRate"
                  stroke="#0f172a"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#occupancyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Overview Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Revenue Overview (7 Days)
              </h2>
              <p className="text-xs text-slate-500">
                Settled payments and guest folio transactions
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-slate-900 tabular-nums font-mono">
                <Money amount={metrics.todayRevenue} />
              </span>
              <span className="block text-[11px] text-slate-400">Today</span>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
                          <p className="font-semibold">{d.label}</p>
                          <p className="mt-1 text-slate-300">
                            Revenue: <span className="text-emerald-400 font-mono font-medium">{formatAmount(d.revenue)}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="revenue" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Room Status Overview Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Room Inventory Status
          </h2>
          <button
            onClick={() => onNavigateToTab('rooms')}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Manage Rooms Grid →
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium block">Clean & Ready</span>
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {roomStatusCounts.clean}
            </span>
          </div>
          <div className="border border-slate-100 rounded-lg p-3 bg-emerald-50/40">
            <span className="text-xs text-emerald-800 font-medium block">Inspected / Pristine</span>
            <span className="text-xl font-bold text-emerald-800 tabular-nums">
              {roomStatusCounts.inspected}
            </span>
          </div>
          <div className="border border-slate-100 rounded-lg p-3 bg-amber-50/40">
            <span className="text-xs text-amber-800 font-medium block">Dirty / Turnover</span>
            <span className="text-xl font-bold text-amber-800 tabular-nums">
              {roomStatusCounts.dirty}
            </span>
          </div>
          <div className="border border-slate-100 rounded-lg p-3 bg-blue-50/40">
            <span className="text-xs text-blue-800 font-medium block">Cleaning In Progress</span>
            <span className="text-xl font-bold text-blue-800 tabular-nums">
              {roomStatusCounts.in_progress}
            </span>
          </div>
          <div className="border border-slate-100 rounded-lg p-3 bg-rose-50/40">
            <span className="text-xs text-rose-800 font-medium block">Out of Order</span>
            <span className="text-xl font-bold text-rose-800 tabular-nums">
              {roomStatusCounts.out_of_order}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Upcoming Arrivals/Departures & Recent Reservations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Front Desk Activity (Arrivals & Departures) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                Front Desk Activity Today
              </h2>
              <span className="text-xs text-slate-500 tabular-nums">
                {metrics.arrivalsToday.length} Arrivals · {metrics.departuresToday.length} Departures
              </span>
            </div>

            {/* Arrivals list */}
            <div className="mt-4 space-y-3">
              <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                Arrivals Pending Check-In ({metrics.arrivalsToday.length})
              </span>
              {metrics.arrivalsToday.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 italic">
                  No pending arrivals scheduled for today.
                </p>
              ) : (
                <div className="space-y-2">
                  {metrics.arrivalsToday.map((res) => (
                    <div
                      key={res.id}
                      className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-slate-200 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {res.guestName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{res.roomType}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {res.assignedRoomNumber ? `Room ${res.assignedRoomNumber}` : 'Room unassigned'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{res.numberOfNights} night{res.numberOfNights > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      {can('checkin_checkout') && (
                        <button
                          onClick={() => onOpenQuickCheckIn(res)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                        >
                          Check In
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Departures list */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                  Departures Scheduled Today ({metrics.departuresToday.length})
                </span>
                {metrics.departuresToday.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 italic">
                    No guest departures remaining today.
                  </p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {metrics.departuresToday.map((res) => (
                      <div
                        key={res.id}
                        className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-slate-200 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {res.guestName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span>Room {res.assignedRoomNumber || 'N/A'}</span>
                            <span aria-hidden="true">·</span>
                            <span>Balance: {formatAmount(res.balanceAmount)}</span>
                          </div>
                        </div>
                        {can('checkin_checkout') && (
                          <button
                            onClick={() => onOpenQuickCheckOut(res)}
                            className="px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors cursor-pointer"
                          >
                            Check Out
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reservations Feed */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                Recent Bookings
              </h2>
              <button
                onClick={() => onNavigateToTab('reservations')}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                All Reservations →
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {reservations.slice(0, 5).map((res) => {
                const statusColor =
                  res.status === 'checked_in'
                    ? 'text-blue-700 bg-blue-50'
                    : res.status === 'confirmed'
                    ? 'text-emerald-700 bg-emerald-50'
                    : res.status === 'checked_out'
                    ? 'text-slate-600 bg-slate-100'
                    : 'text-rose-700 bg-rose-50';

                return (
                  <div
                    key={res.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {res.guestName}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusColor}`}
                        >
                          {res.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono">{res.reservationNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span>{res.roomType}</span>
                        <span aria-hidden="true">·</span>
                        <span>{res.checkInDate} to {res.checkOutDate}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-900 font-mono tabular-nums">
                        <Money amount={res.totalAmount} />
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {res.balanceAmount > 0 ? (
                          <span className="text-amber-600 font-medium">Bal: {formatAmount(res.balanceAmount)}</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Paid</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
