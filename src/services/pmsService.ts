import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import {
  Room,
  Reservation,
  Invoice,
  InvoiceItem,
  Payment,
  HousekeepingTask,
  AuditLog,
  HotelSettings,
  StaffUser,
  RoomType,
  HousekeepingStatus,
  OperationalStatus,
  ReservationStatus,
  RoomRateCategory,
  MenuItem,
  RestaurantOrder,
  RestaurantOrderItem,
  CashierShift,
} from '../types/hotel.ts';
import { format, addDays, subDays, isWithinInterval, parseISO, isBefore, isAfter } from 'date-fns';

const ROOMS_COL = 'rooms';
const RESERVATIONS_COL = 'reservations';
const INVOICES_COL = 'invoices';
const PAYMENTS_COL = 'payments';
const HOUSEKEEPING_COL = 'housekeepingTasks';
const AUDIT_COL = 'auditLogs';
const SETTINGS_COL = 'settings';
const ROOM_RATES_COL = 'roomRates';
const MENU_ITEMS_COL = 'menuItems';
const RESTAURANT_ORDERS_COL = 'restaurantOrders';
const CASHIER_SHIFTS_COL = 'cashierShifts';

export const DEFAULT_SETTINGS: HotelSettings = {
  id: 'general',
  hotelName: 'The GrandAura Hotel & Suites',
  contactEmail: 'concierge@grandaurahotel.com',
  contactPhone: '+1 (555) 392-8100',
  address: '142 Bellevue Boulevard, City Center',
  checkInTime: '15:00',
  checkOutTime: '11:00',
  taxRatePercent: 12.0,
  currencySymbol: '$',
  baseCurrencyCode: 'LKR',
  cancellationPolicy: 'Free cancellation up to 48 hours prior to arrival date.',
  updatedAt: new Date().toISOString(),
};

export function slugifyRoomType(roomType: RoomType): string {
  return roomType.toLowerCase().replace(/\s+/g, '_');
}

// -------------------------------------------------------------
// Real-time Subscriptions
// -------------------------------------------------------------

export function subscribeRooms(callback: (rooms: Room[]) => void) {
  try {
    return onSnapshot(
      collection(db, ROOMS_COL),
      (snapshot) => {
        const rooms: Room[] = [];
        snapshot.forEach((docSnap) => {
          rooms.push({ id: docSnap.id, ...docSnap.data() } as Room);
        });
        rooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
        callback(rooms);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, ROOMS_COL);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, ROOMS_COL);
    return () => {};
  }
}

export function subscribeReservations(callback: (res: Reservation[]) => void) {
  try {
    return onSnapshot(
      collection(db, RESERVATIONS_COL),
      (snapshot) => {
        const items: Reservation[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as Reservation);
        });
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, RESERVATIONS_COL);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, RESERVATIONS_COL);
    return () => {};
  }
}

export function subscribeInvoices(callback: (invoices: Invoice[]) => void) {
  try {
    return onSnapshot(
      collection(db, INVOICES_COL),
      (snapshot) => {
        const items: Invoice[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as Invoice);
        });
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, INVOICES_COL);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, INVOICES_COL);
    return () => {};
  }
}

export function subscribePayments(callback: (payments: Payment[]) => void) {
  try {
    return onSnapshot(
      collection(db, PAYMENTS_COL),
      (snapshot) => {
        const items: Payment[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as Payment);
        });
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, PAYMENTS_COL);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, PAYMENTS_COL);
    return () => {};
  }
}

export function subscribeHousekeepingTasks(callback: (tasks: HousekeepingTask[]) => void) {
  try {
    return onSnapshot(
      collection(db, HOUSEKEEPING_COL),
      (snapshot) => {
        const items: HousekeepingTask[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as HousekeepingTask);
        });
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, HOUSEKEEPING_COL);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, HOUSEKEEPING_COL);
    return () => {};
  }
}

export function subscribeAuditLogs(callback: (logs: AuditLog[]) => void) {
  try {
    return onSnapshot(
      collection(db, AUDIT_COL),
      (snapshot) => {
        const items: AuditLog[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as AuditLog);
        });
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, AUDIT_COL);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, AUDIT_COL);
    return () => {};
  }
}

export function subscribeSettings(callback: (settings: HotelSettings) => void) {
  try {
    return onSnapshot(
      doc(db, SETTINGS_COL, 'general'),
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() } as HotelSettings);
        } else {
          callback(DEFAULT_SETTINGS);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `${SETTINGS_COL}/general`);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SETTINGS_COL}/general`);
    return () => {};
  }
}

// -------------------------------------------------------------
// Audit Logging Helper
// -------------------------------------------------------------

export async function logAudit(
  action: string,
  entityType: AuditLog['entityType'],
  entityId: string,
  performedBy: string,
  details: string
) {
  try {
    const id = `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const logData: AuditLog = {
      id,
      action,
      entityType,
      entityId,
      performedBy,
      details,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, AUDIT_COL, id), logData);
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

// -------------------------------------------------------------
// Room Overlap and Availability Logic
// -------------------------------------------------------------

/**
 * Checks whether dates A [aStart, aEnd) and B [bStart, bEnd) overlap.
 * In hotels, checkout day of guest A can be checkin day of guest B.
 * Thus: overlap occurs strictly if aStart < bEnd AND aEnd > bStart.
 */
export function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

export function checkRoomOverlapConflict(
  roomId: string,
  checkInDate: string,
  checkOutDate: string,
  reservations: Reservation[],
  excludeReservationId?: string
): { hasConflict: boolean; conflictingReservation?: Reservation } {
  for (const res of reservations) {
    if (excludeReservationId && res.id === excludeReservationId) continue;
    if (res.assignedRoomId !== roomId) continue;
    if (res.status === 'cancelled' || res.status === 'checked_out' || res.status === 'no_show') continue;

    if (datesOverlap(checkInDate, checkOutDate, res.checkInDate, res.checkOutDate)) {
      return { hasConflict: true, conflictingReservation: res };
    }
  }
  return { hasConflict: false };
}

/**
 * Gets real-time availability of rooms for a specific date (defaults to today)
 */
export function getRoomOccupancyStatus(
  room: Room,
  targetDate: string, // YYYY-MM-DD
  reservations: Reservation[]
): { isOccupied: boolean; activeReservation?: Reservation } {
  if (room.operationalStatus === 'out_of_order') {
    return { isOccupied: false };
  }

  const activeRes = reservations.find((r) => {
    if (r.assignedRoomId !== room.id) return false;
    if (r.status === 'checked_in') {
      // In-house guest currently occupying
      return true;
    }
    if (r.status === 'confirmed') {
      // Confirmed reservation covering this date
      return targetDate >= r.checkInDate && targetDate < r.checkOutDate;
    }
    return false;
  });

  return {
    isOccupied: !!activeRes,
    activeReservation: activeRes,
  };
}

// -------------------------------------------------------------
// Room Operations
// -------------------------------------------------------------

export async function createRoom(room: Omit<Room, 'id' | 'updatedAt'>, user: StaffUser): Promise<string> {
  const roomId = `room_${room.roomNumber}`;
  const newRoom: Room = {
    ...room,
    id: roomId,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, ROOMS_COL, roomId), newRoom);
    await logAudit(
      'CREATE_ROOM',
      'Room',
      roomId,
      user.name,
      `Created room ${room.roomNumber} (${room.roomType}, Floor ${room.floor}) with base rate $${room.baseNightlyRate}`
    );
    return roomId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${ROOMS_COL}/${roomId}`);
    throw error;
  }
}

export async function updateRoomDetails(
  roomId: string,
  updates: Partial<Room>,
  user: StaffUser
): Promise<void> {
  try {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(doc(db, ROOMS_COL, roomId), payload);
    await logAudit(
      'UPDATE_ROOM',
      'Room',
      roomId,
      user.name,
      `Updated room details: ${Object.keys(updates).join(', ')}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ROOMS_COL}/${roomId}`);
    throw error;
  }
}

export async function updateRoomHousekeeping(
  roomId: string,
  roomNumber: string,
  newStatus: HousekeepingStatus,
  user: StaffUser,
  notes?: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, ROOMS_COL, roomId), {
      housekeepingStatus: newStatus,
      lastCleanedAt: newStatus === 'clean' || newStatus === 'inspected' ? now : undefined,
      updatedAt: now,
    });

    await logAudit(
      'UPDATE_HOUSEKEEPING_STATUS',
      'Housekeeping',
      roomId,
      user.name,
      `Changed room ${roomNumber} housekeeping status to ${newStatus}${notes ? ` (${notes})` : ''}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ROOMS_COL}/${roomId}`);
    throw error;
  }
}

export async function toggleRoomOperationalStatus(
  roomId: string,
  roomNumber: string,
  newStatus: OperationalStatus,
  user: StaffUser,
  reason?: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, ROOMS_COL, roomId), {
      operationalStatus: newStatus,
      updatedAt: now,
    });

    await logAudit(
      'TOGGLE_OPERATIONAL_STATUS',
      'Room',
      roomId,
      user.name,
      `Marked room ${roomNumber} as ${newStatus}${reason ? `: ${reason}` : ''}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ROOMS_COL}/${roomId}`);
    throw error;
  }
}

// -------------------------------------------------------------
// Reservation Operations
// -------------------------------------------------------------

export async function createReservation(
  data: {
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    guestIdProof?: string;
    checkInDate: string;
    checkOutDate: string;
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
    initialPayment?: number;
    paymentMethod?: Payment['paymentMethod'];
    bookingSource: Reservation['bookingSource'];
    specialRequests?: string;
  },
  user: StaffUser
): Promise<{ id: string; reservationNumber: string; invoiceNumber: string }> {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const reservationNumber = `RES-${year}-${randomDigits}`;
  const resId = `res_${Date.now()}`;
  const now = new Date().toISOString();

  const paidAmount = data.initialPayment || 0;
  const balanceAmount = Math.max(0, data.totalAmount - paidAmount);

  const reservation: Reservation = {
    id: resId,
    reservationNumber,
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    guestPhone: data.guestPhone,
    guestIdProof: data.guestIdProof || '',
    checkInDate: data.checkInDate,
    checkOutDate: data.checkOutDate,
    adults: data.adults,
    children: data.children,
    roomType: data.roomType,
    assignedRoomId: data.assignedRoomId || '',
    assignedRoomNumber: data.assignedRoomNumber || '',
    numberOfRooms: data.numberOfRooms || 1,
    ratePerNight: data.ratePerNight,
    numberOfNights: data.numberOfNights,
    discountAmount: data.discountAmount || 0,
    taxAmount: data.taxAmount || 0,
    totalAmount: data.totalAmount,
    paidAmount,
    balanceAmount,
    bookingSource: data.bookingSource,
    specialRequests: data.specialRequests || '',
    status: 'confirmed',
    createdAt: now,
    updatedAt: now,
  };

  try {
    // 1. Create reservation
    await setDoc(doc(db, RESERVATIONS_COL, resId), reservation);

    // 2. Create corresponding initial Invoice
    const invoiceId = `inv_${resId}`;
    const invoiceNumber = `INV-${year}-${randomDigits}`;
    const invoice: Invoice = {
      id: invoiceId,
      invoiceNumber,
      reservationId: resId,
      guestName: data.guestName,
      items: [
        {
          id: `item_room_stay`,
          description: `${data.roomType} Room Stay (${data.numberOfNights} night${data.numberOfNights > 1 ? 's' : ''})`,
          category: 'Room',
          unitPrice: data.ratePerNight,
          quantity: data.numberOfNights,
          total: data.ratePerNight * data.numberOfNights,
          date: data.checkInDate,
        },
      ],
      subtotal: data.ratePerNight * data.numberOfNights,
      taxAmount: data.taxAmount,
      discountAmount: data.discountAmount,
      totalAmount: data.totalAmount,
      paidAmount,
      balanceAmount,
      status: balanceAmount === 0 ? 'paid' : paidAmount > 0 ? 'issued' : 'issued',
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: data.checkOutDate,
      createdAt: now,
    };
    await setDoc(doc(db, INVOICES_COL, invoiceId), invoice);

    // 3. If initial payment provided, record Payment document
    if (paidAmount > 0 && data.paymentMethod) {
      const paymentId = `pay_${Date.now()}`;
      const payment: Payment = {
        id: paymentId,
        invoiceId,
        reservationId: resId,
        guestName: data.guestName,
        amount: paidAmount,
        paymentMethod: data.paymentMethod,
        transactionReference: `TXN-${Date.now().toString().slice(-6)}`,
        recordedBy: user.name,
        notes: 'Deposit / Advance payment upon booking confirmation',
        createdAt: now,
      };
      await setDoc(doc(db, PAYMENTS_COL, paymentId), payment);
    }

    await logAudit(
      'CREATE_RESERVATION',
      'Reservation',
      resId,
      user.name,
      `Created reservation ${reservationNumber} for ${data.guestName} (${data.checkInDate} to ${data.checkOutDate}, ${data.roomType}). Total: $${data.totalAmount}`
    );

    return { id: resId, reservationNumber, invoiceNumber };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${RESERVATIONS_COL}/${resId}`);
    throw error;
  }
}

export async function checkInReservation(
  reservation: Reservation,
  roomId: string,
  roomNumber: string,
  user: StaffUser
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, RESERVATIONS_COL, reservation.id), {
      status: 'checked_in',
      assignedRoomId: roomId,
      assignedRoomNumber: roomNumber,
      updatedAt: now,
    });

    await logAudit(
      'CHECK_IN',
      'Reservation',
      reservation.id,
      user.name,
      `Guest ${reservation.guestName} checked into Room ${roomNumber} (${reservation.reservationNumber})`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RESERVATIONS_COL}/${reservation.id}`);
    throw error;
  }
}

export async function checkOutReservation(
  reservation: Reservation,
  room: Room | undefined,
  user: StaffUser
): Promise<void> {
  const now = new Date().toISOString();
  try {
    // 1. Mark reservation checked out
    await updateDoc(doc(db, RESERVATIONS_COL, reservation.id), {
      status: 'checked_out',
      updatedAt: now,
    });

    // 2. Mark assigned room as DIRTY for turnover
    if (reservation.assignedRoomId) {
      await updateDoc(doc(db, ROOMS_COL, reservation.assignedRoomId), {
        housekeepingStatus: 'dirty',
        updatedAt: now,
      });

      // 3. Automatically generate checkout turnover cleaning task
      const taskId = `task_turnover_${reservation.assignedRoomId}_${Date.now()}`;
      const task: HousekeepingTask = {
        id: taskId,
        roomId: reservation.assignedRoomId,
        roomNumber: reservation.assignedRoomNumber || (room ? room.roomNumber : 'Unknown'),
        floor: room ? room.floor : 1,
        taskType: 'Checkout Clean',
        priority: 'high',
        status: 'pending',
        notes: `Turnover cleaning after checkout of ${reservation.guestName}`,
        createdAt: now,
      };
      await setDoc(doc(db, HOUSEKEEPING_COL, taskId), task);
    }

    await logAudit(
      'CHECK_OUT',
      'Reservation',
      reservation.id,
      user.name,
      `Guest ${reservation.guestName} checked out of Room ${reservation.assignedRoomNumber || 'N/A'}. Room marked dirty for turnover.`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RESERVATIONS_COL}/${reservation.id}`);
    throw error;
  }
}

export async function cancelReservation(
  reservationId: string,
  resNumber: string,
  reason: string,
  user: StaffUser
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, RESERVATIONS_COL, reservationId), {
      status: 'cancelled',
      updatedAt: now,
    });

    // Mark invoice void if unpaid
    const invRef = doc(db, INVOICES_COL, `inv_${reservationId}`);
    const invSnap = await getDoc(invRef);
    if (invSnap.exists()) {
      await updateDoc(invRef, { status: 'void' });
    }

    await logAudit(
      'CANCEL_RESERVATION',
      'Reservation',
      reservationId,
      user.name,
      `Cancelled reservation ${resNumber}: ${reason}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RESERVATIONS_COL}/${reservationId}`);
    throw error;
  }
}

export async function assignRoomToReservation(
  reservationId: string,
  resNumber: string,
  roomId: string,
  roomNumber: string,
  user: StaffUser
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, RESERVATIONS_COL, reservationId), {
      assignedRoomId: roomId,
      assignedRoomNumber: roomNumber,
      updatedAt: now,
    });

    await logAudit(
      'ASSIGN_ROOM',
      'Reservation',
      reservationId,
      user.name,
      `Assigned Room ${roomNumber} to reservation ${resNumber}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RESERVATIONS_COL}/${reservationId}`);
    throw error;
  }
}

// -------------------------------------------------------------
// Billing & Payment Operations
// -------------------------------------------------------------

export async function recordPayment(
  data: {
    reservationId: string;
    invoiceId?: string;
    guestName: string;
    amount: number;
    paymentMethod: Payment['paymentMethod'];
    transactionReference: string;
    notes?: string;
  },
  user: StaffUser
): Promise<string> {
  const paymentId = `pay_${Date.now()}`;
  const now = new Date().toISOString();

  const payment: Payment = {
    id: paymentId,
    invoiceId: data.invoiceId,
    reservationId: data.reservationId,
    guestName: data.guestName,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    transactionReference: data.transactionReference || `TXN-${Date.now().toString().slice(-6)}`,
    recordedBy: user.name,
    notes: data.notes || '',
    createdAt: now,
  };

  try {
    // 1. Create payment document
    await setDoc(doc(db, PAYMENTS_COL, paymentId), payment);

    // 2. Update reservation balance
    const resRef = doc(db, RESERVATIONS_COL, data.reservationId);
    const resSnap = await getDoc(resRef);
    if (resSnap.exists()) {
      const resData = resSnap.data() as Reservation;
      const newPaid = Number((resData.paidAmount + data.amount).toFixed(2));
      const newBalance = Number(Math.max(0, resData.totalAmount - newPaid).toFixed(2));
      await updateDoc(resRef, {
        paidAmount: newPaid,
        balanceAmount: newBalance,
        updatedAt: now,
      });
    }

    // 3. Update invoice balance if present
    const invId = data.invoiceId || `inv_${data.reservationId}`;
    const invRef = doc(db, INVOICES_COL, invId);
    const invSnap = await getDoc(invRef);
    if (invSnap.exists()) {
      const invData = invSnap.data() as Invoice;
      const newPaid = Number((invData.paidAmount + data.amount).toFixed(2));
      const newBalance = Number(Math.max(0, invData.totalAmount - newPaid).toFixed(2));
      await updateDoc(invRef, {
        paidAmount: newPaid,
        balanceAmount: newBalance,
        status: newBalance <= 0.01 ? 'paid' : 'issued',
      });
    }

    await logAudit(
      'RECORD_PAYMENT',
      'Payment',
      paymentId,
      user.name,
      `Recorded payment of $${data.amount.toFixed(2)} via ${data.paymentMethod} for ${data.guestName} (${payment.transactionReference})`
    );

    return paymentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${PAYMENTS_COL}/${paymentId}`);
    throw error;
  }
}

export async function addFolioChargeItem(
  invoiceId: string,
  reservationId: string,
  item: Omit<InvoiceItem, 'id'>,
  user: StaffUser,
  taxRatePercent: number = 12
): Promise<void> {
  try {
    const invRef = doc(db, INVOICES_COL, invoiceId);
    const invSnap = await getDoc(invRef);
    if (!invSnap.exists()) throw new Error('Invoice not found');

    const invData = invSnap.data() as Invoice;
    const newItem: InvoiceItem = {
      ...item,
      id: `item_${Date.now()}`,
    };

    const newItems = [...invData.items, newItem];
    const newSubtotal = Number(newItems.reduce((acc, curr) => acc + curr.total, 0).toFixed(2));
    const taxRate = taxRatePercent / 100; // configurable via Settings → Tax & Surcharge
    const newTax = Number((newSubtotal * taxRate).toFixed(2));
    const newTotal = Number((newSubtotal + newTax - (invData.discountAmount || 0)).toFixed(2));
    const newBalance = Number(Math.max(0, newTotal - invData.paidAmount).toFixed(2));

    await updateDoc(invRef, {
      items: newItems,
      subtotal: newSubtotal,
      taxAmount: newTax,
      totalAmount: newTotal,
      balanceAmount: newBalance,
      status: newBalance <= 0.01 ? 'paid' : 'issued',
    });

    // Also update reservation total and balance
    const resRef = doc(db, RESERVATIONS_COL, reservationId);
    const resSnap = await getDoc(resRef);
    if (resSnap.exists()) {
      await updateDoc(resRef, {
        taxAmount: newTax,
        totalAmount: newTotal,
        balanceAmount: newBalance,
        updatedAt: new Date().toISOString(),
      });
    }

    await logAudit(
      'ADD_FOLIO_CHARGE',
      'Invoice',
      invoiceId,
      user.name,
      `Added charge "${item.description}" ($${item.total.toFixed(2)}) to folio`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${INVOICES_COL}/${invoiceId}`);
    throw error;
  }
}

// -------------------------------------------------------------
// Housekeeping Tasks Operations
// -------------------------------------------------------------

export async function createHousekeepingTask(
  data: Omit<HousekeepingTask, 'id' | 'createdAt'>,
  user: StaffUser
): Promise<string> {
  const taskId = `task_${Date.now()}`;
  const now = new Date().toISOString();
  const task: HousekeepingTask = {
    ...data,
    id: taskId,
    createdAt: now,
  };

  try {
    await setDoc(doc(db, HOUSEKEEPING_COL, taskId), task);
    await logAudit(
      'CREATE_HOUSEKEEPING_TASK',
      'Housekeeping',
      taskId,
      user.name,
      `Created ${data.taskType} task for Room ${data.roomNumber} (Priority: ${data.priority})`
    );
    return taskId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${HOUSEKEEPING_COL}/${taskId}`);
    throw error;
  }
}

export async function updateHousekeepingTaskStatus(
  taskId: string,
  newStatus: HousekeepingTask['status'],
  user: StaffUser,
  notes?: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const updates: Partial<HousekeepingTask> = {
      status: newStatus,
      completedAt: newStatus === 'completed' || newStatus === 'inspected' ? now : undefined,
    };
    if (notes) updates.notes = notes;

    await updateDoc(doc(db, HOUSEKEEPING_COL, taskId), updates);
    await logAudit(
      'UPDATE_HOUSEKEEPING_TASK',
      'Housekeeping',
      taskId,
      user.name,
      `Housekeeping task updated to ${newStatus}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${HOUSEKEEPING_COL}/${taskId}`);
    throw error;
  }
}

// -------------------------------------------------------------
// Hotel Settings
// -------------------------------------------------------------

export async function saveHotelSettings(
  settings: Partial<HotelSettings>,
  user: StaffUser
): Promise<void> {
  try {
    const payload = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, SETTINGS_COL, 'general'), payload, { merge: true });
    await logAudit(
      'UPDATE_SETTINGS',
      'Settings',
      'general',
      user.name,
      'Updated hotel property configurations and policies'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COL}/general`);
    throw error;
  }
}

// -------------------------------------------------------------
// Seed Initial Data Generator
// -------------------------------------------------------------

export async function seedInitialHotelData(force: boolean = false): Promise<void> {
  try {
    const roomsSnap = await getDocs(collection(db, ROOMS_COL));
    if (!roomsSnap.empty && !force) {
      console.log('Database already populated with hotel rooms.');
      return;
    }

    console.log('Seeding initial hotel rooms, reservations, and folios...');
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd');
    const inTwoDaysStr = format(addDays(now, 2), 'yyyy-MM-dd');
    const inThreeDaysStr = format(addDays(now, 3), 'yyyy-MM-dd');
    const inFourDaysStr = format(addDays(now, 4), 'yyyy-MM-dd');

    // 1. Initial 18 Rooms
    const initialRooms: Omit<Room, 'id' | 'updatedAt'>[] = [
      // Floor 1
      {
        roomNumber: '101',
        roomType: 'Single',
        floor: 1,
        maxOccupancy: 1,
        bedConfiguration: '1 Twin Bed',
        baseNightlyRate: 95,
        description: 'Cozy single room with ergonomic work desk and garden courtyard view.',
        amenities: ['High-speed Wi-Fi', 'Smart TV', 'Coffee Maker', 'Work Desk'],
        operationalStatus: 'active',
        housekeepingStatus: 'clean',
      },
      {
        roomNumber: '102',
        roomType: 'Double',
        floor: 1,
        maxOccupancy: 2,
        bedConfiguration: '1 Queen Bed',
        baseNightlyRate: 140,
        description: 'Comfortable double room with premium queen bedding and walk-in shower.',
        amenities: ['High-speed Wi-Fi', 'Smart TV', 'Mini Fridge', 'Espresso Machine', 'Air Conditioning'],
        operationalStatus: 'active',
        housekeepingStatus: 'inspected',
      },
      {
        roomNumber: '103',
        roomType: 'Twin',
        floor: 1,
        maxOccupancy: 2,
        bedConfiguration: '2 Twin Beds',
        baseNightlyRate: 135,
        description: 'Spacious twin room ideal for colleagues or friends traveling together.',
        amenities: ['High-speed Wi-Fi', 'Smart TV', 'Mini Fridge', 'Safe Deposit Box'],
        operationalStatus: 'active',
        housekeepingStatus: 'dirty',
      },
      {
        roomNumber: '104',
        roomType: 'Double',
        floor: 1,
        maxOccupancy: 2,
        bedConfiguration: '1 King Bed',
        baseNightlyRate: 155,
        description: 'Serene king bed accommodation with ground-level garden terrace access.',
        amenities: ['High-speed Wi-Fi', '4K TV', 'Terrace', 'Mini Bar', 'Bathrobes'],
        operationalStatus: 'active',
        housekeepingStatus: 'clean',
      },
      {
        roomNumber: '105',
        roomType: 'Deluxe',
        floor: 1,
        maxOccupancy: 3,
        bedConfiguration: '1 King Bed + 1 Daybed',
        baseNightlyRate: 210,
        description: 'Deluxe room featuring extended sitting area and marble en-suite bathroom.',
        amenities: ['High-speed Wi-Fi', '55" OLED TV', 'Balcony', 'Nespresso', 'Bathtub', 'Plush Robes'],
        operationalStatus: 'active',
        housekeepingStatus: 'clean',
      },
      {
        roomNumber: '106',
        roomType: 'Family room',
        floor: 1,
        maxOccupancy: 4,
        bedConfiguration: '1 King Bed + 2 Twin Beds',
        baseNightlyRate: 260,
        description: 'Generous multi-bed layout designed for traveling families with children.',
        amenities: ['High-speed Wi-Fi', '2 Smart TVs', 'Microwave', 'Mini Fridge', 'Board Games', 'Connecting Door'],
        operationalStatus: 'active',
        housekeepingStatus: 'clean',
      },

      // Floor 2
      {
        roomNumber: '201',
        roomType: 'Single',
        floor: 2,
        maxOccupancy: 1,
        bedConfiguration: '1 Full Bed',
        baseNightlyRate: 105,
        description: 'Quiet second-floor solo traveler room with morning sunlight and city skyline view.',
        amenities: ['High-speed Wi-Fi', 'Smart TV', 'Work Station', 'Coffee Machine'],
        operationalStatus: 'active',
        housekeepingStatus: 'inspected',
      },
      {
        roomNumber: '202',
        roomType: 'Double',
        floor: 2,
        maxOccupancy: 2,
        bedConfiguration: '1 King Bed',
        baseNightlyRate: 160,
        description: 'Modern double room with custom oak cabinetry and rainforest shower.',
        amenities: ['High-speed Wi-Fi', 'Smart TV', 'Bluetooth Speaker', 'Mini Fridge', 'Rainforest Shower'],
        operationalStatus: 'active',
        housekeepingStatus: 'clean',
      },
      {
        roomNumber: '203',
        roomType: 'Twin',
        floor: 2,
        maxOccupancy: 2,
        bedConfiguration: '2 Double Beds',
        baseNightlyRate: 150,
        description: 'Twin accommodation on the second floor with dual vanity bathroom.',
        amenities: ['High-speed Wi-Fi', 'Smart TV', 'Safe', 'Mini Fridge'],
        operationalStatus: 'active',
        housekeepingStatus: 'in_progress',
      },
      {
        roomNumber: '204',
        roomType: 'Deluxe',
        floor: 2,
        maxOccupancy: 3,
        bedConfiguration: '1 King Bed',
        baseNightlyRate: 220,
        description: 'Luxury deluxe room currently under scheduled air-conditioning maintenance.',
        amenities: ['High-speed Wi-Fi', 'Smart TV', 'Balcony', 'Minibar', 'Marble Bath'],
        operationalStatus: 'out_of_order', // Out of order demonstration
        housekeepingStatus: 'dirty',
      },
      {
        roomNumber: '205',
        roomType: 'Deluxe',
        floor: 2,
        maxOccupancy: 3,
        bedConfiguration: '1 King Bed + Sofa Bed',
        baseNightlyRate: 230,
        description: 'High-floor deluxe king room with private balcony and skyline vistas.',
        amenities: ['High-speed Wi-Fi', 'Balcony', 'Nespresso Machine', 'Premium Toiletries', 'Bathtub'],
        operationalStatus: 'active',
        housekeepingStatus: 'clean',
      },
      {
        roomNumber: '206',
        roomType: 'Suite',
        floor: 2,
        maxOccupancy: 4,
        bedConfiguration: '1 King Bed + Queen Sleeper Sofa',
        baseNightlyRate: 320,
        description: 'Executive suite with private living room, dining nook, and panoramic glass facade.',
        amenities: ['High-speed Wi-Fi', 'Separate Living Room', 'Wet Bar', '2 Smart TVs', 'Soaking Tub', 'Butler Service'],
        operationalStatus: 'active',
        housekeepingStatus: 'clean',
      },

      // Floor 3
      {
        roomNumber: '301',
        roomType: 'Single',
        floor: 3,
        maxOccupancy: 1,
        bedConfiguration: '1 Queen Bed',
        baseNightlyRate: 115,
        description: 'Top floor penthouse wing single room with superior acoustics and silence.',
        amenities: ['High-speed Wi-Fi', 'Smart TV', 'Espresso Bar', 'Soundproof Windows'],
        operationalStatus: 'active',
        housekeepingStatus: 'clean',
      },
      {
        roomNumber: '302',
        roomType: 'Double',
        floor: 3,
        maxOccupancy: 2,
        bedConfiguration: '1 King Bed',
        baseNightlyRate: 175,
        description: 'Top floor double room with expansive views and evening turn-down service.',
        amenities: ['High-speed Wi-Fi', 'Smart TV', 'Nespresso', 'Minibar', 'Pillow Menu'],
        operationalStatus: 'active',
        housekeepingStatus: 'inspected',
      },
      {
        roomNumber: '303',
        roomType: 'Twin',
        floor: 3,
        maxOccupancy: 2,
        bedConfiguration: '2 Queen Beds',
        baseNightlyRate: 165,
        description: 'Premium twin room with two full-size queen beds and oversized balcony.',
        amenities: ['High-speed Wi-Fi', 'Balcony', 'Smart TV', 'Mini Fridge', 'Dual Vanity'],
        operationalStatus: 'active',
        housekeepingStatus: 'dirty',
      },
      {
        roomNumber: '304',
        roomType: 'Family room',
        floor: 3,
        maxOccupancy: 5,
        bedConfiguration: '1 King Bed + 1 Bunk Bed + 1 Rollaway',
        baseNightlyRate: 290,
        description: 'Spacious family sanctuary with dedicated play zone and dual bathrooms.',
        amenities: ['High-speed Wi-Fi', '2 Bathrooms', 'Kid Amenities', 'Kitchenette', 'Dining Area'],
        operationalStatus: 'active',
        housekeepingStatus: 'clean',
      },
      {
        roomNumber: '305',
        roomType: 'Deluxe',
        floor: 3,
        maxOccupancy: 3,
        bedConfiguration: '1 King Bed',
        baseNightlyRate: 240,
        description: 'Deluxe corner sanctuary offering dual-aspect natural lighting.',
        amenities: ['High-speed Wi-Fi', 'Corner Balcony', 'Wine Cooler', 'Designer Robes', 'Soaking Tub'],
        operationalStatus: 'active',
        housekeepingStatus: 'clean',
      },
      {
        roomNumber: '306',
        roomType: 'Suite',
        floor: 3,
        maxOccupancy: 4,
        bedConfiguration: '1 Master King Bed + 1 Queen Daybed',
        baseNightlyRate: 360,
        description: 'The Presidential Aurelia Suite featuring private rooftop terrace, fireplace and cocktail bar.',
        amenities: ['High-speed Wi-Fi', 'Rooftop Terrace', 'Fireplace', 'Cocktail Bar', 'Whirlpool Spa Tub', 'Personal Concierge'],
        operationalStatus: 'active',
        housekeepingStatus: 'inspected',
      },
    ];

    for (const r of initialRooms) {
      const id = `room_${r.roomNumber}`;
      await setDoc(doc(db, ROOMS_COL, id), {
        ...r,
        id,
        updatedAt: new Date().toISOString(),
      });
    }

    // 1b. Seed one Room Rate Category per distinct room type, using that
    // type's first room's rate as the starting category price, so the
    // centrally-managed rate system (Settings > Room Rates) has sensible
    // defaults from day one instead of starting empty.
    const seenTypes = new Set<string>();
    for (const r of initialRooms) {
      if (seenTypes.has(r.roomType)) continue;
      seenTypes.add(r.roomType);
      const rateId = slugifyRoomType(r.roomType);
      const rateDoc: RoomRateCategory = {
        id: rateId,
        roomType: r.roomType,
        ratePerNight: r.baseNightlyRate,
        updatedAt: new Date().toISOString(),
        updatedBy: 'System (seed)',
      };
      await setDoc(doc(db, ROOM_RATES_COL, rateId), rateDoc);
    }

    // 2. Settings
    await setDoc(doc(db, SETTINGS_COL, 'general'), DEFAULT_SETTINGS);

    // 3. Realistic Demo Reservations
    const demoReservations: {
      res: Reservation;
      inv: Invoice;
      pay?: Payment;
    }[] = [
      // 1. In-house Guest 1 (Checked in yesterday, departing tomorrow) in Room 102
      {
        res: {
          id: 'res_demo_102',
          reservationNumber: 'RES-2026-1014',
          guestName: 'Dr. Julian Sterling',
          guestEmail: 'j.sterling@horizonbiotech.com',
          guestPhone: '+1 (555) 843-9921',
          guestIdProof: 'PASSPORT-A984210',
          checkInDate: yesterdayStr,
          checkOutDate: tomorrowStr,
          adults: 2,
          children: 0,
          roomType: 'Double',
          assignedRoomId: 'room_102',
          assignedRoomNumber: '102',
          numberOfRooms: 1,
          ratePerNight: 140,
          numberOfNights: 2,
          discountAmount: 0,
          taxAmount: 33.6,
          totalAmount: 313.6,
          paidAmount: 313.6,
          balanceAmount: 0,
          bookingSource: 'Corporate',
          specialRequests: 'Quiet room away from elevator, extra feather pillows.',
          status: 'checked_in',
          createdAt: subDays(now, 5).toISOString(),
          updatedAt: yesterdayStr,
        },
        inv: {
          id: 'inv_res_demo_102',
          invoiceNumber: 'INV-2026-1014',
          reservationId: 'res_demo_102',
          guestName: 'Dr. Julian Sterling',
          items: [
            {
              id: 'it_1',
              description: 'Double Room Stay (2 nights)',
              category: 'Room',
              unitPrice: 140,
              quantity: 2,
              total: 280,
              date: yesterdayStr,
            },
          ],
          subtotal: 280,
          taxAmount: 33.6,
          discountAmount: 0,
          totalAmount: 313.6,
          paidAmount: 313.6,
          balanceAmount: 0,
          status: 'paid',
          issueDate: yesterdayStr,
          dueDate: tomorrowStr,
          createdAt: subDays(now, 5).toISOString(),
        },
        pay: {
          id: 'pay_demo_102',
          invoiceId: 'inv_res_demo_102',
          reservationId: 'res_demo_102',
          guestName: 'Dr. Julian Sterling',
          amount: 313.6,
          paymentMethod: 'Credit Card',
          transactionReference: 'TXN-CC-849201',
          recordedBy: 'Marcus Chen',
          notes: 'Full payment authorized on Corporate Amex',
          createdAt: yesterdayStr,
        },
      },

      // 2. In-house Guest 2 (Checked in 2 days ago, departing today!) in Room 202
      {
        res: {
          id: 'res_demo_202',
          reservationNumber: 'RES-2026-1028',
          guestName: 'Sofia Lindqvist',
          guestEmail: 'sofia.l@nordicdesign.se',
          guestPhone: '+46 70 123 4567',
          guestIdProof: 'EU-ID-8839211',
          checkInDate: subDays(now, 2).toISOString().slice(0, 10),
          checkOutDate: todayStr, // Departing today!
          adults: 1,
          children: 0,
          roomType: 'Double',
          assignedRoomId: 'room_202',
          assignedRoomNumber: '202',
          numberOfRooms: 1,
          ratePerNight: 160,
          numberOfNights: 2,
          discountAmount: 20,
          taxAmount: 36.0,
          totalAmount: 336.0,
          paidAmount: 200.0,
          balanceAmount: 136.0, // Pending settlement on checkout
          bookingSource: 'Website',
          specialRequests: 'Late checkout if possible (13:00)',
          status: 'checked_in',
          createdAt: subDays(now, 10).toISOString(),
          updatedAt: todayStr,
        },
        inv: {
          id: 'inv_res_demo_202',
          invoiceNumber: 'INV-2026-1028',
          reservationId: 'res_demo_202',
          guestName: 'Sofia Lindqvist',
          items: [
            {
              id: 'it_202_1',
              description: 'Double Room Stay (2 nights)',
              category: 'Room',
              unitPrice: 160,
              quantity: 2,
              total: 320,
              date: subDays(now, 2).toISOString().slice(0, 10),
            },
            {
              id: 'it_202_2',
              description: 'Room Service Dinner & Wine',
              category: 'Dining',
              unitPrice: 45,
              quantity: 1,
              total: 45,
              date: yesterdayStr,
            },
          ],
          subtotal: 320,
          taxAmount: 36.0,
          discountAmount: 20,
          totalAmount: 336.0,
          paidAmount: 200.0,
          balanceAmount: 136.0,
          status: 'issued',
          issueDate: subDays(now, 2).toISOString().slice(0, 10),
          dueDate: todayStr,
          createdAt: subDays(now, 10).toISOString(),
        },
        pay: {
          id: 'pay_demo_202',
          invoiceId: 'inv_res_demo_202',
          reservationId: 'res_demo_202',
          guestName: 'Sofia Lindqvist',
          amount: 200.0,
          paymentMethod: 'Credit Card',
          transactionReference: 'TXN-VISA-930219',
          recordedBy: 'Marcus Chen',
          notes: 'Pre-authorization deposit',
          createdAt: subDays(now, 2).toISOString(),
        },
      },

      // 3. Arriving Today 1 in Room 205
      {
        res: {
          id: 'res_demo_205',
          reservationNumber: 'RES-2026-1033',
          guestName: 'Arthur & Beatrice Pendelton',
          guestEmail: 'arthur.p@pendeltonlaw.com',
          guestPhone: '+1 (555) 712-4099',
          checkInDate: todayStr, // Arriving today!
          checkOutDate: inTwoDaysStr,
          adults: 2,
          children: 0,
          roomType: 'Deluxe',
          assignedRoomId: 'room_205',
          assignedRoomNumber: '205',
          numberOfRooms: 1,
          ratePerNight: 230,
          numberOfNights: 2,
          discountAmount: 0,
          taxAmount: 55.2,
          totalAmount: 515.2,
          paidAmount: 515.2,
          balanceAmount: 0,
          bookingSource: 'Booking.com',
          specialRequests: 'Celebrating 25th anniversary. Complimentary champagne requested.',
          status: 'confirmed',
          createdAt: subDays(now, 3).toISOString(),
          updatedAt: todayStr,
        },
        inv: {
          id: 'inv_res_demo_205',
          invoiceNumber: 'INV-2026-1033',
          reservationId: 'res_demo_205',
          guestName: 'Arthur & Beatrice Pendelton',
          items: [
            {
              id: 'it_205_1',
              description: 'Deluxe King Suite (2 nights)',
              category: 'Room',
              unitPrice: 230,
              quantity: 2,
              total: 460,
              date: todayStr,
            },
          ],
          subtotal: 460,
          taxAmount: 55.2,
          discountAmount: 0,
          totalAmount: 515.2,
          paidAmount: 515.2,
          balanceAmount: 0,
          status: 'paid',
          issueDate: todayStr,
          dueDate: inTwoDaysStr,
          createdAt: subDays(now, 3).toISOString(),
        },
        pay: {
          id: 'pay_demo_205',
          invoiceId: 'inv_res_demo_205',
          reservationId: 'res_demo_205',
          guestName: 'Arthur & Beatrice Pendelton',
          amount: 515.2,
          paymentMethod: 'Credit Card',
          transactionReference: 'TXN-OTA-BOOKING-44912',
          recordedBy: 'Online Engine',
          notes: 'Prepaid via Booking.com virtual credit card',
          createdAt: subDays(now, 3).toISOString(),
        },
      },

      // 4. Arriving Today 2 (Unassigned Room, awaiting room assignment at check-in)
      {
        res: {
          id: 'res_demo_unassigned',
          reservationNumber: 'RES-2026-1049',
          guestName: 'Elena Rostova',
          guestEmail: 'elena.rostova@techsummit.io',
          guestPhone: '+1 (555) 604-3311',
          checkInDate: todayStr, // Arriving today!
          checkOutDate: tomorrowStr,
          adults: 1,
          children: 0,
          roomType: 'Single',
          assignedRoomId: '',
          assignedRoomNumber: '',
          numberOfRooms: 1,
          ratePerNight: 95,
          numberOfNights: 1,
          discountAmount: 0,
          taxAmount: 11.4,
          totalAmount: 106.4,
          paidAmount: 0,
          balanceAmount: 106.4,
          bookingSource: 'Direct / Walk-in',
          specialRequests: 'Late flight arrival (approx 20:00). High floor preferred.',
          status: 'confirmed',
          createdAt: subDays(now, 1).toISOString(),
          updatedAt: todayStr,
        },
        inv: {
          id: 'inv_res_demo_unassigned',
          invoiceNumber: 'INV-2026-1049',
          reservationId: 'res_demo_unassigned',
          guestName: 'Elena Rostova',
          items: [
            {
              id: 'it_unassigned_1',
              description: 'Single Room Stay (1 night)',
              category: 'Room',
              unitPrice: 95,
              quantity: 1,
              total: 95,
              date: todayStr,
            },
          ],
          subtotal: 95,
          taxAmount: 11.4,
          discountAmount: 0,
          totalAmount: 106.4,
          paidAmount: 0,
          balanceAmount: 106.4,
          status: 'issued',
          issueDate: todayStr,
          dueDate: tomorrowStr,
          createdAt: subDays(now, 1).toISOString(),
        },
      },

      // 5. In-house Guest 3 in Suite 206
      {
        res: {
          id: 'res_demo_206',
          reservationNumber: 'RES-2026-1055',
          guestName: 'Lord & Lady Harrington',
          guestEmail: 'harrington.estate@heritage.co.uk',
          guestPhone: '+44 20 7946 0912',
          checkInDate: yesterdayStr,
          checkOutDate: inThreeDaysStr,
          adults: 2,
          children: 1,
          roomType: 'Suite',
          assignedRoomId: 'room_206',
          assignedRoomNumber: '206',
          numberOfRooms: 1,
          ratePerNight: 320,
          numberOfNights: 4,
          discountAmount: 50,
          taxAmount: 147.6,
          totalAmount: 1377.6,
          paidAmount: 1377.6,
          balanceAmount: 0,
          bookingSource: 'Website',
          specialRequests: 'Hypoallergenic duvet, daily afternoon high tea in suite.',
          status: 'checked_in',
          createdAt: subDays(now, 7).toISOString(),
          updatedAt: yesterdayStr,
        },
        inv: {
          id: 'inv_res_demo_206',
          invoiceNumber: 'INV-2026-1055',
          reservationId: 'res_demo_206',
          guestName: 'Lord & Lady Harrington',
          items: [
            {
              id: 'it_206_1',
              description: 'Executive Suite (4 nights)',
              category: 'Room',
              unitPrice: 320,
              quantity: 4,
              total: 1280,
              date: yesterdayStr,
            },
          ],
          subtotal: 1280,
          taxAmount: 147.6,
          discountAmount: 50,
          totalAmount: 1377.6,
          paidAmount: 1377.6,
          balanceAmount: 0,
          status: 'paid',
          issueDate: yesterdayStr,
          dueDate: inThreeDaysStr,
          createdAt: subDays(now, 7).toISOString(),
        },
        pay: {
          id: 'pay_demo_206',
          invoiceId: 'inv_res_demo_206',
          reservationId: 'res_demo_206',
          guestName: 'Lord & Lady Harrington',
          amount: 1377.6,
          paymentMethod: 'Bank Transfer',
          transactionReference: 'TXN-WIRE-481920',
          recordedBy: 'Eleanor Vance',
          notes: 'Full prepayment wired by family office',
          createdAt: yesterdayStr,
        },
      },

      // 6. Future Booking next week in Room 306
      {
        res: {
          id: 'res_demo_306',
          reservationNumber: 'RES-2026-1062',
          guestName: 'Claire & Mathieu Beaumont',
          guestEmail: 'mathieu@beaumont-vins.fr',
          guestPhone: '+33 6 12 34 56 78',
          checkInDate: inTwoDaysStr,
          checkOutDate: inFourDaysStr,
          adults: 2,
          children: 0,
          roomType: 'Suite',
          assignedRoomId: 'room_306',
          assignedRoomNumber: '306',
          numberOfRooms: 1,
          ratePerNight: 360,
          numberOfNights: 2,
          discountAmount: 0,
          taxAmount: 86.4,
          totalAmount: 806.4,
          paidAmount: 400.0,
          balanceAmount: 406.4,
          bookingSource: 'Expedia',
          specialRequests: 'Sparkling water upon arrival, airport shuttle transfer requested.',
          status: 'confirmed',
          createdAt: subDays(now, 4).toISOString(),
          updatedAt: subDays(now, 4).toISOString(),
        },
        inv: {
          id: 'inv_res_demo_306',
          invoiceNumber: 'INV-2026-1062',
          reservationId: 'res_demo_306',
          guestName: 'Claire & Mathieu Beaumont',
          items: [
            {
              id: 'it_306_1',
              description: 'Presidential Aurelia Suite (2 nights)',
              category: 'Room',
              unitPrice: 360,
              quantity: 2,
              total: 720,
              date: inTwoDaysStr,
            },
          ],
          subtotal: 720,
          taxAmount: 86.4,
          discountAmount: 0,
          totalAmount: 806.4,
          paidAmount: 400.0,
          balanceAmount: 406.4,
          status: 'issued',
          issueDate: subDays(now, 4).toISOString().slice(0, 10),
          dueDate: inFourDaysStr,
          createdAt: subDays(now, 4).toISOString(),
        },
        pay: {
          id: 'pay_demo_306',
          invoiceId: 'inv_res_demo_306',
          reservationId: 'res_demo_306',
          guestName: 'Claire & Mathieu Beaumont',
          amount: 400.0,
          paymentMethod: 'Credit Card',
          transactionReference: 'TXN-EXPEDIA-77312',
          recordedBy: 'Online Engine',
          notes: '50% deposit received via Expedia',
          createdAt: subDays(now, 4).toISOString(),
        },
      },
    ];

    for (const item of demoReservations) {
      await setDoc(doc(db, RESERVATIONS_COL, item.res.id), item.res);
      await setDoc(doc(db, INVOICES_COL, item.inv.id), item.inv);
      if (item.pay) {
        await setDoc(doc(db, PAYMENTS_COL, item.pay.id), item.pay);
      }
    }

    // 4. Initial Housekeeping Tasks
    const initialTasks: HousekeepingTask[] = [
      {
        id: 'task_demo_103',
        roomId: 'room_103',
        roomNumber: '103',
        floor: 1,
        taskType: 'Daily Clean',
        priority: 'standard',
        status: 'pending',
        assignedTo: 'Rosa Morales',
        notes: 'Replace linens and restock coffee pods',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task_demo_203',
        roomId: 'room_203',
        roomNumber: '203',
        floor: 2,
        taskType: 'Deep Clean',
        priority: 'high',
        status: 'in_progress',
        assignedTo: 'Rosa Morales',
        notes: 'Carpet shampoo and balcony window washing in progress',
        createdAt: subDays(now, 1).toISOString(),
      },
      {
        id: 'task_demo_303',
        roomId: 'room_303',
        roomNumber: '303',
        floor: 3,
        taskType: 'Daily Clean',
        priority: 'urgent',
        status: 'pending',
        assignedTo: 'Rosa Morales',
        notes: 'Turnover preparation for upcoming guest arrival',
        createdAt: new Date().toISOString(),
      },
    ];

    for (const t of initialTasks) {
      await setDoc(doc(db, HOUSEKEEPING_COL, t.id), t);
    }

    // 5. Initial Audit Logs
    const initialLogs: AuditLog[] = [
      {
        id: 'log_init_1',
        action: 'SYSTEM_INITIALIZATION',
        entityType: 'Settings',
        entityId: 'general',
        performedBy: 'System Administrator',
        details: 'Initial PMS database schema, room inventory (18 rooms), and guest folios provisioned.',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'log_init_2',
        action: 'CHECK_IN',
        entityType: 'Reservation',
        entityId: 'res_demo_102',
        performedBy: 'Marcus Chen',
        details: 'Guest Dr. Julian Sterling checked into Room 102 (RES-2026-1014).',
        timestamp: yesterdayStr,
      },
      {
        id: 'log_init_3',
        action: 'CHECK_IN',
        entityType: 'Reservation',
        entityId: 'res_demo_206',
        performedBy: 'Eleanor Vance',
        details: 'Lord & Lady Harrington checked into Executive Suite 206.',
        timestamp: yesterdayStr,
      },
    ];

    for (const l of initialLogs) {
      await setDoc(doc(db, AUDIT_COL, l.id), l);
    }

    console.log('Hotel database seeded successfully!');
  } catch (err) {
    console.error('Error seeding hotel database:', err);
  }
}

// ===============================================================
// Room Rate Categories
// (Super Admin: add/remove a category. Admin + Super Admin: edit price.)
// ===============================================================

export function subscribeRoomRates(callback: (rates: RoomRateCategory[]) => void) {
  try {
    return onSnapshot(
      collection(db, ROOM_RATES_COL),
      (snapshot) => {
        const items: RoomRateCategory[] = [];
        snapshot.forEach((docSnap) => items.push({ id: docSnap.id, ...docSnap.data() } as RoomRateCategory));
        callback(items);
      },
      (error) => handleFirestoreError(error, OperationType.GET, ROOM_RATES_COL)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, ROOM_RATES_COL);
    return () => {};
  }
}

export async function saveRoomRateCategory(
  roomType: RoomType,
  ratePerNight: number,
  user: StaffUser
): Promise<void> {
  const id = slugifyRoomType(roomType);
  try {
    const payload: RoomRateCategory = {
      id,
      roomType,
      ratePerNight,
      updatedAt: new Date().toISOString(),
      updatedBy: user.name,
    };
    await setDoc(doc(db, ROOM_RATES_COL, id), payload, { merge: true });
    await logAudit(
      'SAVE_ROOM_RATE',
      'RoomRate',
      id,
      user.name,
      `Set ${roomType} rate to $${ratePerNight.toFixed(2)}/night`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ROOM_RATES_COL}/${id}`);
    throw error;
  }
}

export async function deleteRoomRateCategory(roomType: RoomType, user: StaffUser): Promise<void> {
  const id = slugifyRoomType(roomType);
  try {
    await deleteDoc(doc(db, ROOM_RATES_COL, id));
    await logAudit('DELETE_ROOM_RATE', 'RoomRate', id, user.name, `Removed rate category for ${roomType}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ROOM_RATES_COL}/${id}`);
    throw error;
  }
}

// ===============================================================
// Restaurant: Menu Management
// ===============================================================

export function subscribeMenuItems(callback: (items: MenuItem[]) => void) {
  try {
    return onSnapshot(
      collection(db, MENU_ITEMS_COL),
      (snapshot) => {
        const items: MenuItem[] = [];
        snapshot.forEach((docSnap) => items.push({ id: docSnap.id, ...docSnap.data() } as MenuItem));
        items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
        callback(items);
      },
      (error) => handleFirestoreError(error, OperationType.GET, MENU_ITEMS_COL)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, MENU_ITEMS_COL);
    return () => {};
  }
}

export async function saveMenuItem(
  item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  user: StaffUser
): Promise<void> {
  const id = item.id || `menu_${Date.now()}`;
  const now = new Date().toISOString();
  try {
    let createdAt = now;
    if (item.id) {
      const existing = await getDoc(doc(db, MENU_ITEMS_COL, id));
      if (existing.exists()) createdAt = (existing.data() as MenuItem).createdAt;
    }
    const payload: MenuItem = {
      id,
      name: item.name,
      category: item.category,
      price: item.price,
      isAvailable: item.isAvailable,
      createdAt,
      updatedAt: now,
    };
    await setDoc(doc(db, MENU_ITEMS_COL, id), payload);
    await logAudit(
      item.id ? 'UPDATE_MENU_ITEM' : 'CREATE_MENU_ITEM',
      'MenuItem',
      id,
      user.name,
      `${item.id ? 'Updated' : 'Added'} menu item "${item.name}" ($${item.price.toFixed(2)}, ${item.category})`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MENU_ITEMS_COL}/${id}`);
    throw error;
  }
}

export async function deleteMenuItem(itemId: string, itemName: string, user: StaffUser): Promise<void> {
  try {
    await deleteDoc(doc(db, MENU_ITEMS_COL, itemId));
    await logAudit('DELETE_MENU_ITEM', 'MenuItem', itemId, user.name, `Removed menu item "${itemName}"`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${MENU_ITEMS_COL}/${itemId}`);
    throw error;
  }
}

// ===============================================================
// Restaurant: Orders (post to room folio, or a direct walk-in sale)
// ===============================================================

export function subscribeRestaurantOrders(callback: (orders: RestaurantOrder[]) => void) {
  try {
    return onSnapshot(
      collection(db, RESTAURANT_ORDERS_COL),
      (snapshot) => {
        const items: RestaurantOrder[] = [];
        snapshot.forEach((docSnap) => items.push({ id: docSnap.id, ...docSnap.data() } as RestaurantOrder));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(items);
      },
      (error) => handleFirestoreError(error, OperationType.GET, RESTAURANT_ORDERS_COL)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, RESTAURANT_ORDERS_COL);
    return () => {};
  }
}

export async function createRestaurantOrder(
  data: {
    reservationId?: string;
    reservationNumber?: string;
    roomNumber?: string;
    guestName: string;
    items: RestaurantOrderItem[];
    taxRatePercent: number;
    mode: 'room' | 'direct';
    paymentMethod?: Payment['paymentMethod'];
  },
  user: StaffUser
): Promise<string> {
  const orderId = `rord_${Date.now()}`;
  const year = new Date().getFullYear();
  const orderNumber = `RO-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
  const subtotal = Number(data.items.reduce((acc, i) => acc + i.total, 0).toFixed(2));
  const taxAmount = Number((subtotal * (data.taxRatePercent / 100)).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));
  const now = new Date().toISOString();
  const guestLabel = data.guestName || 'Walk-in Guest';

  const order: RestaurantOrder = {
    id: orderId,
    orderNumber,
    reservationId: data.reservationId,
    reservationNumber: data.reservationNumber,
    roomNumber: data.roomNumber,
    guestName: guestLabel,
    items: data.items,
    subtotal,
    taxAmount,
    totalAmount,
    status: data.mode === 'room' ? 'posted_to_room' : 'paid_direct',
    paymentMethod: data.paymentMethod,
    createdAt: now,
    createdBy: user.name,
  };

  try {
    await setDoc(doc(db, RESTAURANT_ORDERS_COL, orderId), order);

    if (data.mode === 'room' && data.reservationId) {
      const invoiceId = `inv_${data.reservationId}`;
      const description = data.items.map((i) => `${i.name} x${i.quantity}`).join(', ');
      await addFolioChargeItem(
        invoiceId,
        data.reservationId,
        {
          description: `Restaurant: ${description}`,
          category: 'Dining',
          unitPrice: subtotal,
          quantity: 1,
          total: subtotal,
          date: format(new Date(), 'yyyy-MM-dd'),
        },
        user,
        data.taxRatePercent
      );
    } else if (data.mode === 'direct') {
      const paymentId = `pay_${Date.now()}`;
      const payment: Payment = {
        id: paymentId,
        reservationId: '',
        guestName: guestLabel,
        amount: totalAmount,
        paymentMethod: data.paymentMethod || 'Cash',
        transactionReference: `RST-${Date.now().toString().slice(-6)}`,
        recordedBy: user.name,
        notes: `Restaurant order ${orderNumber} (walk-in / direct sale)`,
        createdAt: now,
      };
      await setDoc(doc(db, PAYMENTS_COL, paymentId), payment);
    }

    await logAudit(
      'CREATE_RESTAURANT_ORDER',
      'RestaurantOrder',
      orderId,
      user.name,
      `Order ${orderNumber} for ${guestLabel}: ${data.items
        .map((i) => `${i.name} x${i.quantity}`)
        .join(', ')}. Total $${totalAmount.toFixed(2)} (${
        order.status === 'posted_to_room' ? `posted to room ${data.roomNumber || ''}` : 'direct sale'
      })`
    );

    return orderId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${RESTAURANT_ORDERS_COL}/${orderId}`);
    throw error;
  }
}

// ===============================================================
// Cashier Shifts
// ===============================================================

export function subscribeCashierShifts(callback: (shifts: CashierShift[]) => void) {
  try {
    return onSnapshot(
      collection(db, CASHIER_SHIFTS_COL),
      (snapshot) => {
        const items: CashierShift[] = [];
        snapshot.forEach((docSnap) => items.push({ id: docSnap.id, ...docSnap.data() } as CashierShift));
        items.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
        callback(items);
      },
      (error) => handleFirestoreError(error, OperationType.GET, CASHIER_SHIFTS_COL)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, CASHIER_SHIFTS_COL);
    return () => {};
  }
}

export async function openCashierShift(startingCash: number, user: StaffUser): Promise<string> {
  const id = `shift_${Date.now()}`;
  const now = new Date().toISOString();
  try {
    const shift: CashierShift = {
      id,
      openedBy: user.id,
      openedByName: user.name,
      openedAt: now,
      startingCash,
      status: 'open',
    };
    await setDoc(doc(db, CASHIER_SHIFTS_COL, id), shift);
    await logAudit(
      'OPEN_CASHIER_SHIFT',
      'CashierShift',
      id,
      user.name,
      `Opened cashier shift with $${startingCash.toFixed(2)} starting cash`
    );
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${CASHIER_SHIFTS_COL}/${id}`);
    throw error;
  }
}

export async function closeCashierShift(
  shiftId: string,
  countedCash: number,
  expectedCash: number,
  notes: string | undefined,
  user: StaffUser
): Promise<void> {
  const now = new Date().toISOString();
  const variance = Number((countedCash - expectedCash).toFixed(2));
  try {
    await updateDoc(doc(db, CASHIER_SHIFTS_COL, shiftId), {
      status: 'closed',
      closedBy: user.id,
      closedByName: user.name,
      closedAt: now,
      countedCash,
      expectedCash,
      variance,
      notes: notes || '',
    });
    await logAudit(
      'CLOSE_CASHIER_SHIFT',
      'CashierShift',
      shiftId,
      user.name,
      `Closed cashier shift. Expected $${expectedCash.toFixed(2)}, counted $${countedCash.toFixed(2)} (variance $${variance.toFixed(2)})`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CASHIER_SHIFTS_COL}/${shiftId}`);
    throw error;
  }
}
