import React, { useMemo, useState } from 'react';
import {
  MenuItem,
  RestaurantOrder,
  RestaurantOrderItem,
  CashierShift,
  Reservation,
  HotelSettings,
  Payment,
} from '../../types/hotel.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useDisplayCurrency } from '../../context/DisplayCurrencyContext.tsx';
import { Money } from '../common/Money.tsx';
import {
  saveMenuItem,
  deleteMenuItem,
  createRestaurantOrder,
  openCashierShift,
  closeCashierShift,
} from '../../services/pmsService.ts';
import { format } from 'date-fns';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  ShoppingCart,
  Receipt,
  Wallet,
  CheckCircle,
  AlertCircle,
  X,
  Lock,
  Unlock,
} from 'lucide-react';

interface RestaurantViewProps {
  menuItems: MenuItem[];
  restaurantOrders: RestaurantOrder[];
  cashierShifts: CashierShift[];
  reservations: Reservation[];
  settings: HotelSettings;
}

const MENU_CATEGORIES: MenuItem['category'][] = ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Bar', 'Other'];

export const RestaurantView: React.FC<RestaurantViewProps> = ({
  menuItems,
  restaurantOrders,
  cashierShifts,
  reservations,
  settings,
}) => {
  const { currentUser, can } = useAuth();
  const { showSuccess, showError } = useToast();
  const { formatAmount } = useDisplayCurrency();
  const staffUser = currentUser!;
  const currency = settings.currencySymbol;

  const [activeSection, setActiveSection] = useState<'order' | 'menu' | 'shift'>('order');

  // --- New Order State ---
  const [cart, setCart] = useState<Record<string, number>>({}); // menuItemId -> qty
  const [orderMode, setOrderMode] = useState<'room' | 'direct'>('room');
  const [selectedReservationId, setSelectedReservationId] = useState<string>('');
  const [walkInGuestName, setWalkInGuestName] = useState('');
  const [directPaymentMethod, setDirectPaymentMethod] = useState<Payment['paymentMethod']>('Cash');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const inHouseReservations = useMemo(
    () => reservations.filter((r) => r.status === 'checked_in'),
    [reservations]
  );

  const cartItems: RestaurantOrderItem[] = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([menuItemId, qty]) => {
        const item = menuItems.find((m) => m.id === menuItemId);
        if (!item) return null;
        return {
          menuItemId,
          name: item.name,
          unitPrice: item.price,
          quantity: qty,
          total: Number((item.price * qty).toFixed(2)),
        } as RestaurantOrderItem;
      })
      .filter((x): x is RestaurantOrderItem => x !== null);
  }, [cart, menuItems]);

  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.total, 0);
  const cartTax = Number((cartSubtotal * (settings.taxRatePercent / 100)).toFixed(2));
  const cartTotal = Number((cartSubtotal + cartTax).toFixed(2));

  const adjustQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const current = next[itemId] || 0;
      const updated = Math.max(0, current + delta);
      if (updated === 0) delete next[itemId];
      else next[itemId] = updated;
      return next;
    });
  };

  const handlePlaceOrder = async () => {
    setOrderError(null);
    if (cartItems.length === 0) {
      setOrderError('Add at least one menu item to the order.');
      return;
    }
    let reservationId: string | undefined;
    let reservationNumber: string | undefined;
    let roomNumber: string | undefined;
    let guestName = walkInGuestName;

    if (orderMode === 'room') {
      const res = inHouseReservations.find((r) => r.id === selectedReservationId);
      if (!res) {
        setOrderError('Select the in-house guest/room to post this charge to.');
        return;
      }
      reservationId = res.id;
      reservationNumber = res.reservationNumber;
      roomNumber = res.assignedRoomNumber;
      guestName = res.guestName;
    } else if (!guestName.trim()) {
      setOrderError('Enter a guest name for the walk-in sale (or "Walk-in Guest").');
      return;
    }

    setIsPlacingOrder(true);
    try {
      await createRestaurantOrder(
        {
          reservationId,
          reservationNumber,
          roomNumber,
          guestName,
          items: cartItems,
          taxRatePercent: settings.taxRatePercent,
          mode: orderMode,
          paymentMethod: orderMode === 'direct' ? directPaymentMethod : undefined,
        },
        staffUser
      );
      setCart({});
      setWalkInGuestName('');
      setSelectedReservationId('');
      const successMsg =
        orderMode === 'room'
          ? `Order posted to Room ${roomNumber || ''} folio.`
          : `Walk-in sale recorded (${formatAmount(cartTotal)}).`;
      setOrderNotice(successMsg);
      setTimeout(() => setOrderNotice(null), 4000);
      showSuccess(successMsg);
    } catch (err: any) {
      setOrderError(err.message || 'Failed to place order.');
      showError(err.message || 'Failed to place order.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // --- Menu Management State ---
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<MenuItem['category']>('Main Course');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [menuError, setMenuError] = useState<string | null>(null);

  const handleAddMenuItem = async () => {
    const price = parseFloat(newItemPrice);
    if (!newItemName.trim() || isNaN(price) || price <= 0) {
      setMenuError('Enter a valid item name and price.');
      return;
    }
    try {
      await saveMenuItem(
        { name: newItemName.trim(), category: newItemCategory, price, isAvailable: true },
        staffUser
      );
      setNewItemName('');
      setNewItemPrice('');
      setMenuError(null);
      showSuccess(`"${newItemName.trim()}" added to the menu.`);
    } catch (err: any) {
      setMenuError(err.message || 'Failed to add menu item.');
      showError(err.message || 'Failed to add menu item.');
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await saveMenuItem({ ...item, isAvailable: !item.isAvailable }, staffUser);
      showSuccess(`"${item.name}" marked ${item.isAvailable ? 'unavailable' : 'available'}.`);
    } catch (err) {
      console.error(err);
      showError(`Failed to update "${item.name}".`);
    }
  };

  const handleDeleteMenuItem = async (item: MenuItem) => {
    if (!window.confirm(`Remove "${item.name}" from the menu?`)) return;
    try {
      await deleteMenuItem(item.id, item.name, staffUser);
      showSuccess(`"${item.name}" removed from the menu.`);
    } catch (err) {
      console.error(err);
      showError(`Failed to remove "${item.name}".`);
    }
  };

  // --- Cashier Shift State ---
  const myOpenShift = cashierShifts.find((s) => s.status === 'open' && s.openedBy === staffUser.id);
  const anyOpenShift = cashierShifts.find((s) => s.status === 'open');
  const [startingCashInput, setStartingCashInput] = useState('');
  const [countedCashInput, setCountedCashInput] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [shiftError, setShiftError] = useState<string | null>(null);

  // Expected cash = starting cash + cash payments (restaurant direct sales + room payments)
  // recorded since the shift opened, by this cashier.
  const expectedCashForOpenShift = useMemo(() => {
    if (!myOpenShift) return 0;
    const sinceOpen = new Date(myOpenShift.openedAt).getTime();
    const cashFromOrders = restaurantOrders
      .filter(
        (o) =>
          o.status === 'paid_direct' &&
          o.paymentMethod === 'Cash' &&
          new Date(o.createdAt).getTime() >= sinceOpen
      )
      .reduce((sum, o) => sum + o.totalAmount, 0);
    return Number((myOpenShift.startingCash + cashFromOrders).toFixed(2));
  }, [myOpenShift, restaurantOrders]);

  const handleOpenShift = async () => {
    const amount = parseFloat(startingCashInput);
    if (isNaN(amount) || amount < 0) {
      setShiftError('Enter a valid starting cash amount.');
      return;
    }
    try {
      await openCashierShift(amount, staffUser);
      setStartingCashInput('');
      setShiftError(null);
      showSuccess(`Cashier shift opened with ${formatAmount(amount)} starting cash.`);
    } catch (err: any) {
      setShiftError(err.message || 'Failed to open shift.');
      showError(err.message || 'Failed to open shift.');
    }
  };

  const handleCloseShift = async () => {
    if (!myOpenShift) return;
    const counted = parseFloat(countedCashInput);
    if (isNaN(counted) || counted < 0) {
      setShiftError('Enter the counted cash amount.');
      return;
    }
    try {
      await closeCashierShift(myOpenShift.id, counted, expectedCashForOpenShift, shiftNotes, staffUser);
      const variance = Number((counted - expectedCashForOpenShift).toFixed(2));
      setCountedCashInput('');
      setShiftNotes('');
      setShiftError(null);
      showSuccess(
        variance === 0
          ? 'Shift closed. Cash drawer balanced perfectly.'
          : `Shift closed. Variance: ${variance > 0 ? '+' : variance < 0 ? '-' : ''}${formatAmount(Math.abs(variance))}.`
      );
    } catch (err: any) {
      setShiftError(err.message || 'Failed to close shift.');
      showError(err.message || 'Failed to close shift.');
    }
  };

  const sections = [
    { id: 'order' as const, label: 'Take Order', show: can('create_restaurant_orders') },
    { id: 'menu' as const, label: 'Manage Menu', show: can('manage_menu') },
    { id: 'shift' as const, label: 'Cashier Shift', show: can('manage_cashier_shift') || can('view_all_cashier_shifts') },
  ].filter((s) => s.show);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <UtensilsCrossed className="w-6 h-6 text-slate-700" />
          <span>Restaurant & Point of Sale</span>
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Menu management, dining orders, room-charge posting, and cashier shift reconciliation
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              activeSection === s.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* --- Take Order --- */}
      {activeSection === 'order' && can('create_restaurant_orders') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Menu Picker */}
          <div className="lg:col-span-7 space-y-4">
            {MENU_CATEGORIES.map((cat) => {
              const items = menuItems.filter((m) => m.category === cat && m.isAvailable);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">{cat}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            <Money amount={item.price} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => adjustQty(item.id, -1)}
                            disabled={!cart[item.id]}
                            className="w-6 h-6 flex items-center justify-center rounded-full border border-slate-300 text-slate-600 disabled:opacity-30 hover:bg-slate-100 cursor-pointer"
                          >
                            −
                          </button>
                          <span className="w-5 text-center text-xs font-semibold tabular-nums">
                            {cart[item.id] || 0}
                          </span>
                          <button
                            onClick={() => adjustQty(item.id, 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {menuItems.filter((m) => m.isAvailable).length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs italic">
                No available menu items yet. Add some under "Manage Menu".
              </div>
            )}
          </div>

          {/* Order Cart / Checkout */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs sticky top-20 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                <span>Current Order</span>
              </h3>

              {orderNotice && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{orderNotice}</span>
                </div>
              )}
              {orderError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{orderError}</span>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
                {cartItems.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-3">No items added yet.</p>
                ) : (
                  cartItems.map((i) => (
                    <div key={i.menuItemId} className="flex justify-between text-slate-700">
                      <span>{i.name} × {i.quantity}</span>
                      <span className="font-mono"><Money amount={i.total} /></span>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono"><Money amount={cartSubtotal} /></span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({settings.taxRatePercent}%)</span>
                  <span className="font-mono"><Money amount={cartTax} /></span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total</span>
                  <span className="font-mono"><Money amount={cartTotal} /></span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOrderMode('room')}
                    className={`p-2 border rounded-lg text-xs font-medium ${
                      orderMode === 'room' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    Post to Room
                  </button>
                  <button
                    onClick={() => setOrderMode('direct')}
                    className={`p-2 border rounded-lg text-xs font-medium ${
                      orderMode === 'direct' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    Walk-in / Direct Sale
                  </button>
                </div>

                {orderMode === 'room' ? (
                  <select
                    value={selectedReservationId}
                    onChange={(e) => setSelectedReservationId(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Select in-house guest/room --</option>
                    {inHouseReservations.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.assignedRoomNumber || '?'} — {r.guestName} ({r.reservationNumber})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Guest / customer name (e.g. Walk-in Guest)"
                      value={walkInGuestName}
                      onChange={(e) => setWalkInGuestName(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                    />
                    <select
                      value={directPaymentMethod}
                      onChange={(e) => setDirectPaymentMethod(e.target.value as Payment['paymentMethod'])}
                      className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Digital Wallet">Digital Wallet</option>
                    </select>
                  </div>
                )}

                <button
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{isPlacingOrder ? 'Placing...' : 'Place Order'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-12 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Recent Orders</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-4">Order #</th>
                    <th className="py-2 px-4">Guest</th>
                    <th className="py-2 px-4">Items</th>
                    <th className="py-2 px-4 text-right">Total</th>
                    <th className="py-2 px-4">Type</th>
                    <th className="py-2 px-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {restaurantOrders.slice(0, 15).map((o) => (
                    <tr key={o.id}>
                      <td className="py-2 px-4 font-mono font-semibold text-slate-900">{o.orderNumber}</td>
                      <td className="py-2 px-4 text-slate-700">
                        {o.guestName}
                        {o.roomNumber && <span className="text-slate-400"> · Room {o.roomNumber}</span>}
                      </td>
                      <td className="py-2 px-4 text-slate-500 max-w-64 truncate">
                        {o.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-semibold">
                        <Money amount={o.totalAmount} />
                      </td>
                      <td className="py-2 px-4">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            o.status === 'posted_to_room' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {o.status === 'posted_to_room' ? 'ROOM CHARGE' : 'DIRECT SALE'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-slate-400">{o.createdAt.slice(0, 16).replace('T', ' ')}</td>
                    </tr>
                  ))}
                  {restaurantOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                        No restaurant orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- Manage Menu --- */}
      {activeSection === 'menu' && can('manage_menu') && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Add Menu Item</h3>
            {menuError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {menuError}
              </div>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <input
                type="text"
                placeholder="Item name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="p-2 text-xs border border-slate-300 rounded-lg flex-1 min-w-40"
              />
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value as MenuItem['category'])}
                className="p-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {MENU_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder={`Price (${currency})`}
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="p-2 text-xs border border-slate-300 rounded-lg w-28 font-mono"
              />
              <button
                onClick={handleAddMenuItem}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-4">Name</th>
                  <th className="py-2 px-4">Category</th>
                  <th className="py-2 px-4 text-right">Price</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {menuItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 italic">No menu items yet.</td>
                  </tr>
                ) : (
                  menuItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{item.name}</td>
                      <td className="py-2.5 px-4 text-slate-600">{item.category}</td>
                      <td className="py-2.5 px-4 text-right font-mono"><Money amount={item.price} /></td>
                      <td className="py-2.5 px-4">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                            item.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteMenuItem(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Cashier Shift --- */}
      {activeSection === 'shift' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                <span>Your Cashier Shift</span>
              </h3>

              {shiftError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {shiftError}
                </div>
              )}

              {!myOpenShift ? (
                <div className="space-y-2">
                  {anyOpenShift && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      A shift opened by {anyOpenShift.openedByName} is currently active.
                    </p>
                  )}
                  <label className="block text-xs font-semibold text-slate-700">Starting Cash ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={startingCashInput}
                    onChange={(e) => setStartingCashInput(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                  <button
                    onClick={handleOpenShift}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Open Shift</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                    Shift open since {myOpenShift.openedAt.slice(0, 16).replace('T', ' ')}
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Starting Cash</span>
                    <span className="font-mono"><Money amount={myOpenShift.startingCash} /></span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-900">
                    <span>Expected Cash in Drawer</span>
                    <span className="font-mono"><Money amount={expectedCashForOpenShift} /></span>
                  </div>
                  <label className="block text-xs font-semibold text-slate-700 pt-1">Counted Cash ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={countedCashInput}
                    onChange={(e) => setCountedCashInput(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                  <textarea
                    rows={2}
                    placeholder="Notes (optional)"
                    value={shiftNotes}
                    onChange={(e) => setShiftNotes(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                  />
                  <button
                    onClick={handleCloseShift}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-sm cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Close Shift & Reconcile</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {can('view_all_cashier_shifts') ? 'All Shift History' : 'Your Shift History'}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-4">Opened By</th>
                    <th className="py-2 px-4">Opened</th>
                    <th className="py-2 px-4">Closed</th>
                    <th className="py-2 px-4 text-right">Variance</th>
                    <th className="py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashierShifts
                    .filter((s) => can('view_all_cashier_shifts') || s.openedBy === staffUser.id)
                    .map((s) => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{s.openedByName}</td>
                        <td className="py-2.5 px-4 text-slate-500">{s.openedAt.slice(0, 16).replace('T', ' ')}</td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {s.closedAt ? s.closedAt.slice(0, 16).replace('T', ' ') : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono">
                          {s.variance !== undefined ? (
                            <span className={s.variance === 0 ? 'text-emerald-700' : s.variance > 0 ? 'text-blue-700' : 'text-rose-700'}>
                              {s.variance > 0 ? '+' : s.variance < 0 ? '-' : ''}{formatAmount(Math.abs(s.variance))}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            s.status === 'open' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {s.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  {cashierShifts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 italic">No shift records yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
