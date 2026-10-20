export type RoomType =
  | 'Single'
  | 'Double'
  | 'Twin'
  | 'Deluxe'
  | 'Suite'
  | 'Family room';

export type OperationalStatus = 'active' | 'out_of_order';

export type HousekeepingStatus = 'clean' | 'dirty' | 'in_progress' | 'inspected';

export type ReservationStatus =
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show';

export type BookingSource =
  | 'Direct / Walk-in'
  | 'Website'
  | 'Booking.com'
  | 'Expedia'
  | 'Phone / Email'
  | 'Corporate';

export type UserRole = 'admin' | 'receptionist' | 'housekeeper';

export interface Room {
  id: string;
  roomNumber: string;
  roomType: RoomType;
  floor: number;
  maxOccupancy: number;
  bedConfiguration: string;
  baseNightlyRate: number;
  description: string;
  amenities: string[];
  operationalStatus: OperationalStatus;
  housekeepingStatus: HousekeepingStatus;
  assignedStaff?: string;
  lastCleanedAt?: string;
  updatedAt: string;
}

export interface Reservation {
  id: string;
  reservationNumber: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestIdProof?: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  adults: number;
  children: number;
  roomType: RoomType;
  assignedRoomId?: string;
  assignedRoomNumber?: string;
  numberOfRooms: number;
  ratePerNight: number;
  numberOfNights: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  bookingSource: BookingSource;
  specialRequests?: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  category: 'Room' | 'Dining' | 'Spa' | 'Minibar' | 'Laundry' | 'Other';
  unitPrice: number;
  quantity: number;
  total: number;
  date: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  reservationId: string;
  guestName: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'draft' | 'issued' | 'paid' | 'void';
  issueDate: string;
  dueDate: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId?: string;
  reservationId: string;
  guestName: string;
  amount: number;
  paymentMethod: 'Cash' | 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'Digital Wallet';
  transactionReference: string;
  recordedBy: string;
  notes?: string;
  createdAt: string;
}

export interface HousekeepingTask {
  id: string;
  roomId: string;
  roomNumber: string;
  floor: number;
  taskType: 'Daily Clean' | 'Checkout Clean' | 'Deep Clean' | 'Touch Up' | 'Inspection';
  priority: 'standard' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'inspected';
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: 'Room' | 'Reservation' | 'Invoice' | 'Payment' | 'Housekeeping' | 'Settings';
  entityId: string;
  performedBy: string;
  details: string;
  timestamp: string;
}

export interface HotelSettings {
  id: string;
  hotelName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  checkInTime: string;
  checkOutTime: string;
  taxRatePercent: number;
  currencySymbol: string;
  cancellationPolicy: string;
  updatedAt: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatarUrl?: string;
}
