import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { HotelSettings } from '../types/hotel.ts';

export interface ConfirmationLetterData {
  reservationNumber: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  roomType: string;
  assignedRoomNumber?: string;
  adults: number;
  children: number;
  ratePerNight: number;
  subtotal: number;
  taxAmount: number;
  taxRatePercent: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  bookingSource: string;
  specialRequests?: string;
}

/**
 * Generates a one-page reservation confirmation letter as a PDF and
 * triggers a browser download. Called right after a reservation is
 * successfully created.
 */
export function generateConfirmationLetterPdf(data: ConfirmationLetterData, settings: HotelSettings) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const currency = settings.currencySymbol || '$';
  let y = 20;

  // --- Letterhead ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.hotelName || 'The GrandAura Hotel & Suites', margin, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (settings.address) {
    doc.text(settings.address, margin, y);
    y += 4.5;
  }
  const contactLine = [settings.contactPhone, settings.contactEmail].filter(Boolean).join('   ·   ');
  if (contactLine) {
    doc.text(contactLine, margin, y);
    y += 4.5;
  }

  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- Title ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Reservation Confirmation', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Confirmation #: ${data.reservationNumber}`, margin, y);
  doc.text(`Issued: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth - margin, y, { align: 'right' });
  y += 10;

  const addRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(value, pageWidth - margin - 48 - margin);
    doc.text(lines, margin + 48, y);
    y += 6 * Math.max(1, lines.length);
  };

  // --- Guest Details ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Guest Details', margin, y);
  y += 7;

  addRow('Guest Name:', data.guestName);
  if (data.guestEmail) addRow('Email:', data.guestEmail);
  if (data.guestPhone) addRow('Phone:', data.guestPhone);
  addRow(
    'Guests:',
    `${data.adults} Adult${data.adults > 1 ? 's' : ''}${
      data.children > 0 ? `, ${data.children} Child${data.children > 1 ? 'ren' : ''}` : ''
    }`
  );

  // --- Stay Details ---
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Stay Details', margin, y);
  y += 7;

  addRow('Check-In:', `${data.checkInDate}  (from ${settings.checkInTime || '15:00'})`);
  addRow('Check-Out:', `${data.checkOutDate}  (by ${settings.checkOutTime || '11:00'})`);
  addRow('Nights:', String(data.numberOfNights));
  addRow(
    'Room Type:',
    data.roomType + (data.assignedRoomNumber ? ` (Room ${data.assignedRoomNumber})` : ' (assigned at check-in)')
  );
  addRow('Booking Source:', data.bookingSource);
  if (data.specialRequests) addRow('Special Requests:', data.specialRequests);

  // --- Rate Breakdown Box ---
  y += 6;
  const boxTop = y;
  const hasDiscount = data.discountAmount > 0;
  const boxHeight = hasDiscount ? 42 : 36;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, boxTop, pageWidth - margin * 2, boxHeight, 'FD');

  let by = boxTop + 7;
  const addMoneyRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10.5 : 9.5);
    if (bold) doc.setTextColor(15, 23, 42);
    else doc.setTextColor(71, 85, 105);
    doc.text(label, margin + 4, by);
    doc.text(value, pageWidth - margin - 4, by, { align: 'right' });
    by += 6;
  };

  addMoneyRow(
    `Room Charges (${data.numberOfNights} x ${currency}${data.ratePerNight.toFixed(2)})`,
    `${currency}${data.subtotal.toFixed(2)}`
  );
  addMoneyRow(`Taxes & Hotel Surcharge (${data.taxRatePercent}%)`, `${currency}${data.taxAmount.toFixed(2)}`);
  if (hasDiscount) {
    addMoneyRow('Discount', `-${currency}${data.discountAmount.toFixed(2)}`);
  }
  addMoneyRow('Total Amount', `${currency}${data.totalAmount.toFixed(2)}`, true);
  addMoneyRow('Paid / Deposit', `${currency}${data.paidAmount.toFixed(2)}`);
  addMoneyRow('Balance Due at Check-In', `${currency}${data.balanceAmount.toFixed(2)}`, true);

  y = boxTop + boxHeight + 10;

  // --- Cancellation Policy ---
  if (settings.cancellationPolicy) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Cancellation Policy', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const lines = doc.splitTextToSize(settings.cancellationPolicy, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4.2 + 6;
  }

  // --- Footer ---
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a system-generated confirmation and does not require a signature.', margin, 285);

  doc.save(`Confirmation_${data.reservationNumber}.pdf`);
}
