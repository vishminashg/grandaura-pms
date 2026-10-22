import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { Header } from './components/common/Header.tsx';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { RoomManagementView } from './components/rooms/RoomManagementView.tsx';
import { ReservationManagementView } from './components/reservations/ReservationManagementView.tsx';
import { HousekeepingView } from './components/housekeeping/HousekeepingView.tsx';
import { InvoicesFolioView } from './components/billing/InvoicesFolioView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { RestaurantView } from './components/restaurant/RestaurantView.tsx';
import { ReportsView } from './components/reports/ReportsView.tsx';
import { NewReservationModal } from './components/modals/NewReservationModal.tsx';
import { QuickCheckInModal } from './components/modals/QuickCheckInModal.tsx';
import { QuickCheckOutModal } from './components/modals/QuickCheckOutModal.tsx';
import { RoomFormModal } from './components/modals/RoomFormModal.tsx';
import { PaymentModal } from './components/modals/PaymentModal.tsx';

import {
  subscribeRooms,
  subscribeReservations,
  subscribeInvoices,
  subscribePayments,
  subscribeHousekeepingTasks,
  subscribeAuditLogs,
  subscribeSettings,
  subscribeRoomRates,
  subscribeMenuItems,
  subscribeRestaurantOrders,
  subscribeCashierShifts,
  seedInitialHotelData,
} from './services/pmsService.ts';
import { subscribeStaffUsers } from './services/authService.ts';

import {
  Room,
  Reservation,
  Invoice,
  Payment,
  HousekeepingTask,
  AuditLog,
  HotelSettings,
  StaffUser,
  RoomRateCategory,
  MenuItem,
  RestaurantOrder,
  CashierShift,
} from './types/hotel.ts';

import { Loader2, Sparkles, Building2, CheckCircle2 } from 'lucide-react';

function HotelPMSApp() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Core Data States
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [housekeepingTasks, setHousekeepingTasks] = useState<HousekeepingTask[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<HotelSettings | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [roomRates, setRoomRates] = useState<RoomRateCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantOrders, setRestaurantOrders] = useState<RestaurantOrder[]>([]);
  const [cashierShifts, setCashierShifts] = useState<CashierShift[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal States
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [checkInReservationTarget, setCheckInReservationTarget] = useState<Reservation | undefined>();
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  const [checkOutReservationTarget, setCheckOutReservationTarget] = useState<Reservation | undefined>();
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);

  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  const [paymentTargetRes, setPaymentTargetRes] = useState<Reservation | null>(null);
  const [paymentTargetInv, setPaymentTargetInv] = useState<Invoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // Real-time Subscriptions & Initial Seeding
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. Initial Data Seeder check
    seedInitialHotelData(false).catch(console.error);

    // 2. Subscriptions
    const unsubRooms = subscribeRooms((data) => {
      setRooms(data);
      setIsLoading(false);
    });

    const unsubRes = subscribeReservations((data) => {
      setReservations(data);
    });

    const unsubInv = subscribeInvoices((data) => {
      setInvoices(data);
    });

    const unsubPay = subscribePayments((data) => {
      setPayments(data);
    });

    const unsubHouse = subscribeHousekeepingTasks((data) => {
      setHousekeepingTasks(data);
    });

    const unsubLogs = subscribeAuditLogs((data) => {
      setAuditLogs(data);
    });

    const unsubSettings = subscribeSettings((data) => {
      setSettings(data);
    });

    const unsubStaff = subscribeStaffUsers((data) => {
      setStaffUsers(data);
    });

    const unsubRoomRates = subscribeRoomRates((data) => {
      setRoomRates(data);
    });

    const unsubMenuItems = subscribeMenuItems((data) => {
      setMenuItems(data);
    });

    const unsubRestaurantOrders = subscribeRestaurantOrders((data) => {
      setRestaurantOrders(data);
    });

    const unsubCashierShifts = subscribeCashierShifts((data) => {
      setCashierShifts(data);
    });

    return () => {
      unsubRooms();
      unsubRes();
      unsubInv();
      unsubPay();
      unsubHouse();
      unsubLogs();
      unsubSettings();
      unsubStaff();
      unsubRoomRates();
      unsubMenuItems();
      unsubRestaurantOrders();
      unsubCashierShifts();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewReservation={() => setIsNewReservationOpen(true)}
      />

      {/* Hotel Property Banner & Status Strip */}
      <div className="bg-slate-900 text-slate-300 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white tracking-wide">
              {settings?.hotelName || 'The GrandAura Hotel & Suites'}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400 hidden sm:inline">{settings?.address || 'City Center'}</span>
            <span aria-hidden="true" className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-slate-400">Standard Check-In: {settings?.checkInTime || '15:00'}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>
              Active Staff: <strong className="text-slate-200">{currentUser!.name}</strong> ({currentUser!.title})
            </span>
            <span className="bg-slate-800 text-amber-400 border border-slate-700 px-2 py-0.5 rounded font-mono uppercase tracking-wider text-[10px]">
              {currentUser!.role}
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
            <p className="text-xs font-medium text-slate-500">
              Loading hotel PMS database & room folios...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                rooms={rooms}
                reservations={reservations}
                payments={payments}
                housekeepingTasks={housekeepingTasks}
                onOpenNewReservation={() => setIsNewReservationOpen(true)}
                onOpenQuickCheckIn={(res) => {
                  setCheckInReservationTarget(res);
                  setIsCheckInOpen(true);
                }}
                onOpenQuickCheckOut={(res) => {
                  setCheckOutReservationTarget(res);
                  setIsCheckOutOpen(true);
                }}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'rooms' && settings && (
              <RoomManagementView
                rooms={rooms}
                reservations={reservations}
                roomRates={roomRates}
                currencySymbol={settings.currencySymbol}
                onOpenAddRoom={() => {
                  setRoomToEdit(null);
                  setIsRoomModalOpen(true);
                }}
                onOpenEditRoom={(room) => {
                  setRoomToEdit(room);
                  setIsRoomModalOpen(true);
                }}
              />
            )}

            {activeTab === 'reservations' && (
              <ReservationManagementView
                reservations={reservations}
                rooms={rooms}
                onOpenNewReservation={() => setIsNewReservationOpen(true)}
                onOpenQuickCheckIn={(res) => {
                  setCheckInReservationTarget(res);
                  setIsCheckInOpen(true);
                }}
                onOpenQuickCheckOut={(res) => {
                  setCheckOutReservationTarget(res);
                  setIsCheckOutOpen(true);
                }}
                onOpenFolio={(res) => {
                  setActiveTab('billing');
                }}
                onOpenPaymentModal={(res) => {
                  setPaymentTargetRes(res);
                  setPaymentTargetInv(null);
                  setIsPaymentModalOpen(true);
                }}
              />
            )}

            {activeTab === 'housekeeping' && (
              <HousekeepingView
                rooms={rooms}
                housekeepingTasks={housekeepingTasks}
              />
            )}

            {activeTab === 'billing' && settings && (
              <InvoicesFolioView
                invoices={invoices}
                payments={payments}
                reservations={reservations}
                settings={settings}
                onOpenPaymentModal={(res, inv) => {
                  setPaymentTargetRes(res);
                  setPaymentTargetInv(inv || null);
                  setIsPaymentModalOpen(true);
                }}
              />
            )}

            {activeTab === 'restaurant' && settings && (
              <RestaurantView
                menuItems={menuItems}
                restaurantOrders={restaurantOrders}
                cashierShifts={cashierShifts}
                reservations={reservations}
                settings={settings}
              />
            )}

            {activeTab === 'reports' && settings && (
              <ReportsView
                reservations={reservations}
                payments={payments}
                rooms={rooms}
                restaurantOrders={restaurantOrders}
                settings={settings}
              />
            )}

            {activeTab === 'settings' && settings && (
              <SettingsView
                settings={settings}
                auditLogs={auditLogs}
                staffUsers={staffUsers}
                roomRates={roomRates}
              />
            )}
          </>
        )}
      </main>

      {/* Modals Container */}
      {isNewReservationOpen && settings && (
        <NewReservationModal
          rooms={rooms}
          reservations={reservations}
          settings={settings}
          roomRates={roomRates}
          onClose={() => setIsNewReservationOpen(false)}
          onSuccess={(resId) => {
            setIsNewReservationOpen(false);
            setActiveTab('reservations');
            showToast('New guest reservation confirmed successfully. Opening Reservation Management…');
          }}
        />
      )}

      {isCheckInOpen && (
        <QuickCheckInModal
          initialReservation={checkInReservationTarget}
          reservations={reservations}
          rooms={rooms}
          onClose={() => {
            setIsCheckInOpen(false);
            setCheckInReservationTarget(undefined);
          }}
          onSuccess={() => {
            setIsCheckInOpen(false);
            setCheckInReservationTarget(undefined);
            showToast('Guest check-in completed. Room assigned.');
          }}
        />
      )}

      {isCheckOutOpen && (
        <QuickCheckOutModal
          initialReservation={checkOutReservationTarget}
          reservations={reservations}
          rooms={rooms}
          onClose={() => {
            setIsCheckOutOpen(false);
            setCheckOutReservationTarget(undefined);
          }}
          onSuccess={() => {
            setIsCheckOutOpen(false);
            setCheckOutReservationTarget(undefined);
            showToast('Guest checked out. Room marked dirty for turnover.');
          }}
        />
      )}

      {isRoomModalOpen && settings && (
        <RoomFormModal
          roomToEdit={roomToEdit}
          roomRates={roomRates}
          currencySymbol={settings.currencySymbol}
          onClose={() => {
            setIsRoomModalOpen(false);
            setRoomToEdit(null);
          }}
          onSuccess={() => {
            setIsRoomModalOpen(false);
            setRoomToEdit(null);
            showToast(roomToEdit ? 'Room details updated.' : 'New room created.');
          }}
        />
      )}

      {isPaymentModalOpen && paymentTargetRes && (
        <PaymentModal
          reservation={paymentTargetRes}
          invoice={paymentTargetInv}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentTargetRes(null);
            setPaymentTargetInv(null);
          }}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            setPaymentTargetRes(null);
            setPaymentTargetInv(null);
            showToast('Payment recorded and folio balance updated.');
          }}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 text-xs font-medium flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

function AuthGate() {
  const { currentUser, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  return <HotelPMSApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
