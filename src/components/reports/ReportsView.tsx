import React, { useMemo, useState } from 'react';
import { Reservation, Payment, Room, HotelSettings, RestaurantOrder } from '../../types/hotel.ts';
import { DateRangeCalendar } from '../common/DateRangeCalendar.tsx';
import { format, startOfDay } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileSpreadsheet,
  FileText,
  TrendingUp,
  DollarSign,
  BedDouble,
  UtensilsCrossed,
} from 'lucide-react';

interface ReportsViewProps {
  reservations: Reservation[];
  payments: Payment[];
  rooms: Room[];
  restaurantOrders: RestaurantOrder[];
  settings: HotelSettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reservations,
  payments,
  rooms,
  restaurantOrders,
  settings,
}) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [rangeStart, setRangeStart] = useState<string>(format(startOfDay(new Date()), 'yyyy-MM-dd'));
  const [rangeEnd, setRangeEnd] = useState<string>(today);
  const currency = settings.currencySymbol;

  const paymentsInRange = useMemo(
    () =>
      payments.filter((p) => {
        const d = p.createdAt.slice(0, 10);
        return d >= rangeStart && d <= rangeEnd;
      }),
    [payments, rangeStart, rangeEnd]
  );

  const reservationsCreatedInRange = useMemo(
    () =>
      reservations.filter((r) => {
        const d = r.createdAt.slice(0, 10);
        return d >= rangeStart && d <= rangeEnd;
      }),
    [reservations, rangeStart, rangeEnd]
  );

  const restaurantOrdersInRange = useMemo(
    () =>
      restaurantOrders.filter((o) => {
        const d = o.createdAt.slice(0, 10);
        return d >= rangeStart && d <= rangeEnd;
      }),
    [restaurantOrders, rangeStart, rangeEnd]
  );

  const totalRevenue = paymentsInRange.reduce((sum, p) => sum + p.amount, 0);
  const roomRevenue = reservationsCreatedInRange.reduce((sum, r) => sum + r.totalAmount, 0);
  const diningRevenue = restaurantOrdersInRange.reduce((sum, o) => sum + o.totalAmount, 0);

  // Revenue grouped by day, for a simple daily breakdown table
  const dailyBreakdown = useMemo(() => {
    const map: Record<string, { payments: number; count: number }> = {};
    paymentsInRange.forEach((p) => {
      const day = p.createdAt.slice(0, 10);
      if (!map[day]) map[day] = { payments: 0, count: 0 };
      map[day].payments += p.amount;
      map[day].count += 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ day, ...v }));
  }, [paymentsInRange]);

  const occupancyPct = useMemo(() => {
    if (rooms.length === 0) return 0;
    const occupiedToday = reservations.filter(
      (r) => r.status === 'checked_in' && r.checkInDate <= today && r.checkOutDate > today
    ).length;
    return Math.round((occupiedToday / rooms.length) * 100);
  }, [rooms, reservations, today]);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['GrandAura PMS — Revenue Report'],
      [`Range: ${rangeStart} to ${rangeEnd}`],
      [],
      ['Metric', `Amount (${settings.baseCurrencyCode})`],
      ['Total Payments Received', totalRevenue.toFixed(2)],
      ['Room Revenue (bookings created in range)', roomRevenue.toFixed(2)],
      ['Restaurant Revenue', diningRevenue.toFixed(2)],
      ['Current Occupancy %', `${occupancyPct}%`],
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    const paymentsSheet = XLSX.utils.json_to_sheet(
      paymentsInRange.map((p) => ({
        Date: p.createdAt.slice(0, 10),
        Guest: p.guestName,
        Amount: p.amount,
        Method: p.paymentMethod,
        Reference: p.transactionReference,
        RecordedBy: p.recordedBy,
      }))
    );
    XLSX.utils.book_append_sheet(wb, paymentsSheet, 'Payments');

    const reservationsSheet = XLSX.utils.json_to_sheet(
      reservationsCreatedInRange.map((r) => ({
        ReservationNo: r.reservationNumber,
        Guest: r.guestName,
        RoomType: r.roomType,
        CheckIn: r.checkInDate,
        CheckOut: r.checkOutDate,
        Nights: r.numberOfNights,
        Total: r.totalAmount,
        Paid: r.paidAmount,
        Balance: r.balanceAmount,
        Status: r.status,
        Source: r.bookingSource,
      }))
    );
    XLSX.utils.book_append_sheet(wb, reservationsSheet, 'Reservations');

    const dailySheet = XLSX.utils.json_to_sheet(
      dailyBreakdown.map((d) => ({ Date: d.day, 'Payments Received': d.payments.toFixed(2), Transactions: d.count }))
    );
    XLSX.utils.book_append_sheet(wb, dailySheet, 'Daily Revenue');

    XLSX.writeFile(wb, `GrandAura_Report_${rangeStart}_to_${rangeEnd}.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 15;
    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(settings.hotelName || 'GrandAura PMS', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Revenue Report: ${rangeStart} to ${rangeEnd}`, margin, y);
    y += 10;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Summary', margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Metric', `Amount (${settings.baseCurrencyCode})`]],
      body: [
        ['Total Payments Received', totalRevenue.toFixed(2)],
        ['Room Revenue (bookings created in range)', roomRevenue.toFixed(2)],
        ['Restaurant Revenue', diningRevenue.toFixed(2)],
        ['Current Occupancy %', `${occupancyPct}%`],
      ],
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Daily Revenue Breakdown', margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Date', 'Payments Received', 'Transactions']],
      body: dailyBreakdown.map((d) => [d.day, `${currency}${d.payments.toFixed(2)}`, String(d.count)]),
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`GrandAura_Report_${rangeStart}_to_${rangeEnd}.pdf`);
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Revenue</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Select a date range, then export the full report to Excel or PDF
        </p>
      </div>

      {/* Date Range + Export */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="max-w-sm flex-1">
          <DateRangeCalendar
            checkInDate={rangeStart}
            checkOutDate={rangeEnd}
            label="Report Date Range"
            onChange={(start, end) => {
              setRangeStart(start);
              setRangeEnd(end);
            }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-sm cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Payments', value: `${currency}${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-700' },
          { label: 'Room Revenue', value: `${currency}${roomRevenue.toFixed(2)}`, icon: BedDouble, color: 'text-blue-700' },
          { label: 'Restaurant Revenue', value: `${currency}${diningRevenue.toFixed(2)}`, icon: UtensilsCrossed, color: 'text-amber-700' },
          { label: 'Current Occupancy', value: `${occupancyPct}%`, icon: TrendingUp, color: 'text-indigo-700' },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{card.label}</span>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className={`text-xl font-bold mt-2 tabular-nums ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Daily Revenue Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-2 px-4">Date</th>
                <th className="py-2 px-4 text-right">Payments Received</th>
                <th className="py-2 px-4 text-right">Transactions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-400 italic">
                    No payment activity in this range.
                  </td>
                </tr>
              ) : (
                dailyBreakdown.map((d) => (
                  <tr key={d.day}>
                    <td className="py-2.5 px-4 font-mono text-slate-900">{d.day}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">
                      {currency}{d.payments.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">{d.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
