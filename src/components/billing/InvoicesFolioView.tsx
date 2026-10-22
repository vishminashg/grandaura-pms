import React, { useState, useMemo } from 'react';
import { Invoice, Payment, Reservation, InvoiceItem, HotelSettings } from '../../types/hotel.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { recordPayment, addFolioChargeItem } from '../../services/pmsService.ts';
import { format } from 'date-fns';
import {
  Search,
  DollarSign,
  CreditCard,
  Plus,
  Printer,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Receipt,
  X,
} from 'lucide-react';

interface InvoicesFolioViewProps {
  invoices: Invoice[];
  payments: Payment[];
  reservations: Reservation[];
  settings: HotelSettings;
  onOpenPaymentModal: (res: Reservation, inv?: Invoice) => void;
}

export const InvoicesFolioView: React.FC<InvoicesFolioViewProps> = ({
  invoices,
  payments,
  reservations,
  settings,
  onOpenPaymentModal,
}) => {
  const { currentUser, can } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Add charge modal
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [chargeCategory, setChargeCategory] = useState<InvoiceItem['category']>('Dining');
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeUnitPrice, setChargeUnitPrice] = useState<number>(35);
  const [chargeQuantity, setChargeQuantity] = useState<number>(1);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !inv.invoiceNumber.toLowerCase().includes(q) &&
          !inv.guestName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      return true;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Billing Totals
  const billingTotals = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalOutstanding = invoices.reduce(
      (sum, inv) => (inv.status !== 'void' ? sum + (inv.balanceAmount || 0) : sum),
      0
    );
    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
    };
  }, [invoices]);

  const handleOpenAddCharge = () => {
    if (!selectedInvoice) return;
    setChargeCategory('Dining');
    setChargeDescription('');
    setChargeUnitPrice(35);
    setChargeQuantity(1);
    setIsChargeModalOpen(true);
  };

  const handleSaveCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || chargeUnitPrice <= 0 || chargeQuantity <= 0) return;

    try {
      await addFolioChargeItem(
        selectedInvoice.id,
        selectedInvoice.reservationId,
        {
          description: chargeDescription || `${chargeCategory} Service`,
          category: chargeCategory,
          unitPrice: Number(chargeUnitPrice),
          quantity: Number(chargeQuantity),
          total: Number((chargeUnitPrice * chargeQuantity).toFixed(2)),
          date: format(new Date(), 'yyyy-MM-dd'),
        },
        currentUser!,
        settings.taxRatePercent
      );

      // Refresh currently selected invoice from parent state if updated
      const updated = invoices.find((inv) => inv.id === selectedInvoice.id);
      if (updated) setSelectedInvoice(updated);

      setIsChargeModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Find payments related to selected invoice or reservation
  const selectedFolioPayments = useMemo(() => {
    if (!selectedInvoice) return [];
    return payments.filter(
      (p) =>
        p.invoiceId === selectedInvoice.id ||
        p.reservationId === selectedInvoice.reservationId
    );
  }, [selectedInvoice, payments]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Billing, Invoices & Guest Folios
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Itemized guest charges, tax summaries, payment recording, and folios
          </p>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">
            Total Billed Invoices
          </span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums font-mono mt-1 block">
            ${billingTotals.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {invoices.length} issued folios
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs text-emerald-700 font-medium block">
            Collected Payments
          </span>
          <span className="text-2xl font-bold text-emerald-700 tabular-nums font-mono mt-1 block">
            ${billingTotals.totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Settled transactions
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs text-amber-700 font-medium block">
            Outstanding Receivable Balance
          </span>
          <span className="text-2xl font-bold text-amber-700 tabular-nums font-mono mt-1 block">
            ${billingTotals.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Due upon guest checkout
          </span>
        </div>
      </div>

      {/* Main Layout: Invoices List and Selected Folio Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Invoices List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoice # or guest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
            >
              <option value="all">All Invoices</option>
              <option value="issued">Issued / Unpaid</option>
              <option value="paid">Fully Settled</option>
              <option value="void">Void</option>
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Folio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const isSelected = selectedInvoice?.id === inv.id;
                  const isPaid = inv.balanceAmount <= 0.01;

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {inv.guestName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        ${inv.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {inv.balanceAmount > 0.01 ? (
                          <span className="text-amber-700 font-semibold">
                            ${inv.balanceAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">$0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            inv.status === 'paid' || isPaid
                              ? 'bg-emerald-50 text-emerald-700'
                              : inv.status === 'void'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {isPaid ? 'PAID' : inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(inv);
                          }}
                          className="text-xs text-slate-700 hover:text-slate-900 font-medium underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Folio Inspector (5 cols) */}
        <div className="lg:col-span-5">
          {selectedInvoice ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5 sticky top-24">
              {/* Folio Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase block">
                    Guest Folio Statement
                  </span>
                  <h2 className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {selectedInvoice.invoiceNumber}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Guest: <strong>{selectedInvoice.guestName}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrint}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                    title="Print Receipt"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md"
                    title="Close Folio Inspector"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Itemized Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Itemized Folio Charges
                  </span>
                  {can('manage_billing') && (
                    <button
                      onClick={handleOpenAddCharge}
                      className="text-[11px] font-semibold text-slate-900 hover:text-slate-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Charge</span>
                    </button>
                  )}
                </div>

                <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {selectedInvoice.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50/50"
                    >
                      <div>
                        <div className="font-medium text-slate-800">
                          {item.description}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.category} · Qty {item.quantity} × ${item.unitPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">
                        ${item.total.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Summary Calculation */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums font-medium">
                    ${selectedInvoice.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes & Hotel Fees ({settings.taxRatePercent}%)</span>
                  <span className="font-mono tabular-nums font-medium">
                    ${selectedInvoice.taxAmount.toFixed(2)}
                  </span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discounts Applied</span>
                    <span className="font-mono tabular-nums font-medium">
                      -${selectedInvoice.discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-1.5 border-t border-slate-200">
                  <span>Total Due</span>
                  <span className="font-mono tabular-nums">
                    ${selectedInvoice.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Amount Paid / Credits</span>
                  <span className="font-mono tabular-nums text-emerald-700 font-medium">
                    ${selectedInvoice.paidAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-100">
                  <span className={selectedInvoice.balanceAmount > 0.01 ? 'text-amber-800' : 'text-emerald-700'}>
                    Outstanding Balance
                  </span>
                  <span
                    className={`font-mono tabular-nums ${
                      selectedInvoice.balanceAmount > 0.01 ? 'text-amber-800' : 'text-emerald-700'
                    }`}
                  >
                    ${selectedInvoice.balanceAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payments History */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-800 block mb-2">
                  Payment History ({selectedFolioPayments.length})
                </span>
                {selectedFolioPayments.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No payments logged yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedFolioPayments.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 border border-slate-100 rounded bg-slate-50/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">
                            ${p.amount.toFixed(2)} · {p.paymentMethod}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Ref: {p.transactionReference} · By {p.recordedBy}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {p.createdAt.slice(0, 10)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action: Record Payment */}
              {selectedInvoice.balanceAmount > 0.01 && can('manage_billing') && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const res = reservations.find((r) => r.id === selectedInvoice.reservationId);
                      if (res) {
                        onOpenPaymentModal(res, selectedInvoice);
                      }
                    }}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment (${selectedInvoice.balanceAmount.toFixed(2)})</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 border-dashed rounded-xl p-8 text-center text-slate-400">
              <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-600">No Folio Selected</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Select an invoice from the list to view itemized charges, add incidental items, or record settlement payments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Incidental Charge Modal */}
      {isChargeModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Add Charge to Folio
            </h2>
            <p className="text-xs text-slate-500">
              Folio: {selectedInvoice.invoiceNumber} · Guest: {selectedInvoice.guestName}
            </p>

            <form onSubmit={handleSaveCharge} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Charge Category
                </label>
                <select
                  value={chargeCategory}
                  onChange={(e) => setChargeCategory(e.target.value as any)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Dining">Dining / Room Service</option>
                  <option value="Minibar">Minibar Consumption</option>
                  <option value="Spa">Spa & Wellness</option>
                  <option value="Laundry">Laundry & Dry Cleaning</option>
                  <option value="Other">Airport Transfer / Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aurelia Bistro Dinner, Evian Water, etc."
                  value={chargeDescription}
                  onChange={(e) => setChargeDescription(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Price ($)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={chargeUnitPrice}
                    onChange={(e) => setChargeUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={chargeQuantity}
                    onChange={(e) => setChargeQuantity(parseInt(e.target.value) || 1)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs flex justify-between font-medium">
                <span>Charge Subtotal:</span>
                <span className="font-mono font-bold text-slate-900">
                  ${(chargeUnitPrice * chargeQuantity).toFixed(2)} (+{settings.taxRatePercent}% tax)
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChargeModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Post to Folio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
