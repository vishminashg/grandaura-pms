import React, { useState } from 'react';
import { HotelSettings, AuditLog, StaffUser, RoomRateCategory, RoomType } from '../../types/hotel.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useDisplayCurrency } from '../../context/DisplayCurrencyContext.tsx';
import {
  saveHotelSettings,
  seedInitialHotelData,
  saveRoomRateCategory,
  deleteRoomRateCategory,
  slugifyRoomType,
} from '../../services/pmsService.ts';
import { removeStaffAccount } from '../../services/authService.ts';
import { StaffFormModal } from '../modals/StaffFormModal.tsx';
import {
  Settings,
  Shield,
  RefreshCw,
  Building,
  Save,
  CheckCircle,
  Clock,
  History,
  FileSpreadsheet,
  Users,
  Plus,
  Trash2,
  Tag,
} from 'lucide-react';

const ALL_ROOM_TYPES: RoomType[] = ['Single', 'Double', 'Twin', 'Deluxe', 'Suite', 'Family room'];

interface SettingsViewProps {
  settings: HotelSettings;
  auditLogs: AuditLog[];
  staffUsers: StaffUser[];
  roomRates: RoomRateCategory[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  auditLogs,
  staffUsers,
  roomRates,
}) => {
  const { currentUser, can } = useAuth();
  const { showSuccess, showError } = useToast();
  const { formatAmount, displayCurrency, baseCurrencyCode } = useDisplayCurrency();
  const [formData, setFormData] = useState<HotelSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffNotice, setStaffNotice] = useState<string | null>(null);

  // --- Room Rate Categories ---
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});
  const [newCategoryType, setNewCategoryType] = useState<RoomType>(
    ALL_ROOM_TYPES.find((t) => !roomRates.some((r) => r.id === slugifyRoomType(t))) || 'Single'
  );
  const [newCategoryRate, setNewCategoryRate] = useState<string>('');
  const [rateNotice, setRateNotice] = useState<string | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);

  const existingTypes = new Set(roomRates.map((r) => r.roomType));
  const availableNewTypes = ALL_ROOM_TYPES.filter((t) => !existingTypes.has(t));

  const handleSaveRate = async (roomType: RoomType, currentRate: number) => {
    if (!currentUser) return;
    const draftKey = slugifyRoomType(roomType);
    const raw = rateDrafts[draftKey];
    const newRate = raw !== undefined ? parseFloat(raw) : currentRate;
    if (isNaN(newRate) || newRate <= 0) {
      setRateError('Enter a valid rate greater than 0.');
      return;
    }
    try {
      await saveRoomRateCategory(roomType, newRate, currentUser);
      setRateDrafts((prev) => {
        const next = { ...prev };
        delete next[draftKey];
        return next;
      });
      setRateNotice(`${roomType} rate updated to ${settings.currencySymbol}${newRate.toFixed(2)}/night.`);
      setRateError(null);
      setTimeout(() => setRateNotice(null), 3000);
      showSuccess(`${roomType} rate updated to ${settings.currencySymbol}${newRate.toFixed(2)}/night.`);
    } catch (err: any) {
      setRateError(err.message || 'Failed to save rate.');
      showError(err.message || 'Failed to save rate.');
    }
  };

  const handleAddCategory = async () => {
    if (!currentUser) return;
    const rate = parseFloat(newCategoryRate);
    if (isNaN(rate) || rate <= 0) {
      setRateError('Enter a valid starting rate greater than 0 for the new category.');
      return;
    }
    try {
      await saveRoomRateCategory(newCategoryType, rate, currentUser);
      setNewCategoryRate('');
      setRateError(null);
      setRateNotice(`${newCategoryType} rate category created.`);
      setTimeout(() => setRateNotice(null), 3000);
      showSuccess(`${newCategoryType} rate category created.`);
      const stillAvailable = ALL_ROOM_TYPES.filter(
        (t) => !existingTypes.has(t) && t !== newCategoryType
      );
      if (stillAvailable.length > 0) setNewCategoryType(stillAvailable[0]);
    } catch (err: any) {
      setRateError(err.message || 'Failed to create rate category.');
      showError(err.message || 'Failed to create rate category.');
    }
  };

  const handleDeleteCategory = async (roomType: RoomType) => {
    if (!currentUser) return;
    const confirmed = window.confirm(
      `Remove the ${roomType} rate category? Rooms of this type will have no automatic rate until a new category is created.`
    );
    if (!confirmed) return;
    try {
      await deleteRoomRateCategory(roomType, currentUser);
      setRateNotice(`${roomType} rate category removed.`);
      setTimeout(() => setRateNotice(null), 3000);
      showSuccess(`${roomType} rate category removed.`);
    } catch (err: any) {
      setRateError(err.message || 'Failed to remove rate category.');
      showError(err.message || 'Failed to remove rate category.');
    }
  };

  const handleRemoveStaff = async (staff: StaffUser) => {
    if (!currentUser || !can('manage_settings')) return;
    if (staff.id === currentUser.id) {
      window.alert("You can't remove your own account while signed in.");
      return;
    }
    const confirmed = window.confirm(
      `Revoke access for ${staff.name}? They will be signed out immediately and will no longer be able to log in.`
    );
    if (!confirmed) return;
    try {
      await removeStaffAccount(staff.id, staff.name, currentUser);
      setStaffNotice(`Access revoked for ${staff.name}.`);
      setTimeout(() => setStaffNotice(null), 3500);
      showSuccess(`Access revoked for ${staff.name}.`);
    } catch (err) {
      console.error(err);
      showError(`Failed to revoke access for ${staff.name}.`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('manage_settings')) return;

    try {
      await saveHotelSettings(formData, currentUser!);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      showSuccess('Hotel property settings saved successfully.');
    } catch (err) {
      console.error(err);
      showError('Failed to save settings. Please try again.');
    }
  };

  const handleResetData = async () => {
    const confirm = window.confirm(
      'Are you sure you want to reset all hotel rooms, demo reservations, invoices, and audit logs to the default state?'
    );
    if (!confirm) return;

    setIsResetting(true);
    try {
      await seedInitialHotelData(true);
      showSuccess('Demo data re-seeded successfully.');
    } catch (err) {
      console.error(err);
      showError('Failed to reset demo data.');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (!logSearch.trim()) return true;
    const q = logSearch.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.performedBy.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hotel Settings & System Audit
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure property profile, tax policies, check-in rules, and inspect audit logs
          </p>
        </div>

        {can('manage_settings') && (
          <button
            onClick={handleResetData}
            disabled={isResetting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo Data</span>
          </button>
        )}
      </div>

      {/* Staff Accounts (admin only) */}
      {can('manage_settings') && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-700" />
              <span>Staff Accounts</span>
            </h2>
            <button
              onClick={() => setIsStaffModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff</span>
            </button>
          </div>

          {staffNotice && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{staffNotice}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                      No staff accounts provisioned yet.
                    </td>
                  </tr>
                ) : (
                  staffUsers.map((staff) => (
                    <tr key={staff.id}>
                      <td className="py-2.5 pr-4 font-medium text-slate-900">
                        {staff.name}
                        {staff.id === currentUser?.id && (
                          <span className="ml-1.5 text-[10px] text-slate-400">(you)</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">{staff.title}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{staff.email}</td>
                      <td className="py-2.5 pr-4">
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono uppercase text-[10px]">
                          {staff.role}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <button
                          onClick={() => handleRemoveStaff(staff)}
                          disabled={staff.id === currentUser?.id}
                          title="Revoke access"
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
          <p className="text-[11px] text-slate-400 mt-3">
            Revoking access removes their staff profile immediately. To fully delete the underlying
            sign-in, remove the matching account in the Firebase Authentication console.
          </p>
        </div>
      )}

      {/* Room Rate Categories */}
      {can('edit_room_rates') && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-700" />
              <span>Room Rate Categories</span>
            </h2>
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
              {can('manage_rate_categories') ? 'Super Admin' : 'Admin'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            One rate per room category applies automatically to every room of that type — there is no
            need to edit each room individually.
            {can('manage_rate_categories')
              ? ' As Super Admin you can edit prices and add or remove categories.'
              : ' You can edit the price of an existing category; only a Super Admin can add or remove categories.'}
          </p>

          {rateNotice && (
            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{rateNotice}</span>
            </div>
          )}
          {rateError && (
            <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {rateError}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Room Category</th>
                  <th className="py-2 pr-4">Rate / Night ({settings.currencySymbol})</th>
                  <th className="py-2 pr-4">Last Updated</th>
                  <th className="py-2 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roomRates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                      No rate categories yet — add one below.
                    </td>
                  </tr>
                ) : (
                  roomRates
                    .slice()
                    .sort((a, b) => a.roomType.localeCompare(b.roomType))
                    .map((rate) => {
                      const draftKey = rate.id;
                      const draftValue = rateDrafts[draftKey] ?? String(rate.ratePerNight);
                      return (
                        <tr key={rate.id}>
                          <td className="py-2.5 pr-4 font-medium text-slate-900">{rate.roomType}</td>
                          <td className="py-2.5 pr-4">
                            <input
                              type="number"
                              step="0.01"
                              min="1"
                              value={draftValue}
                              onChange={(e) =>
                                setRateDrafts((prev) => ({ ...prev, [draftKey]: e.target.value }))
                              }
                              className="w-28 p-1.5 border border-slate-300 rounded-lg font-mono"
                            />
                            {displayCurrency !== baseCurrencyCode && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                ≈ {formatAmount(parseFloat(draftValue) || 0)}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-slate-500">
                            {rate.updatedAt.slice(0, 16).replace('T', ' ')} · {rate.updatedBy}
                          </td>
                          <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleSaveRate(rate.roomType, rate.ratePerNight)}
                              className="px-2.5 py-1 mr-2 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                            >
                              Save
                            </button>
                            {can('manage_rate_categories') && (
                              <button
                                onClick={() => handleDeleteCategory(rate.roomType)}
                                title="Remove category"
                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          {can('manage_rate_categories') && availableNewTypes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  New Category
                </label>
                <select
                  value={newCategoryType}
                  onChange={(e) => setNewCategoryType(e.target.value as RoomType)}
                  className="p-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {availableNewTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Starting Rate ({settings.currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 150.00"
                  value={newCategoryRate}
                  onChange={(e) => setNewCategoryRate(e.target.value)}
                  className="w-32 p-2 text-xs border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <button
                onClick={handleAddCategory}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Settings Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-700" />
              <span>Property Profile & Operational Rules</span>
            </h2>

            {saveSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Hotel property settings saved successfully.</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hotel Property Name
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!can('manage_settings')}
                    value={formData.hotelName}
                    onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!can('manage_settings')}
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!can('manage_settings')}
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Physical Address
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!can('manage_settings')}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Check-in Time
                  </label>
                  <input
                    type="time"
                    required
                    disabled={!can('manage_settings')}
                    value={formData.checkInTime}
                    onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Check-out Time
                  </label>
                  <input
                    type="time"
                    required
                    disabled={!can('manage_settings')}
                    value={formData.checkOutTime}
                    onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tax & Surcharge Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    required
                    disabled={!can('manage_settings')}
                    value={formData.taxRatePercent}
                    onChange={(e) => setFormData({ ...formData, taxRatePercent: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency Symbol (display)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!can('manage_settings')}
                    value={formData.currencySymbol}
                    onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Base Accounting Currency (ISO code)
                  </label>
                  <select
                    disabled={!can('manage_settings')}
                    value={formData.baseCurrencyCode}
                    onChange={(e) => setFormData({ ...formData, baseCurrencyCode: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 font-mono"
                  >
                    <option value="LKR">LKR — Sri Lankan Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="INR">INR — Indian Rupee</option>
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400">
                    All stored amounts stay in this currency; guest-facing bills also show live USD/EUR equivalents.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cancellation Policy
                  </label>
                  <textarea
                    rows={2}
                    disabled={!can('manage_settings')}
                    value={formData.cancellationPolicy}
                    onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  />
                </div>
              </div>

              {can('manage_settings') && (
                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Settings</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Audit Log Trail (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-700" />
                  <h2 className="text-sm font-bold text-slate-900">
                    System Audit Trail
                  </h2>
                </div>
                <span className="text-xs text-slate-400 tabular-nums">
                  {auditLogs.length} events
                </span>
              </div>

              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Filter audit logs by keyword, staff, action..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 mb-3"
                />
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 italic text-center">
                    No matching audit records.
                  </p>
                ) : (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 border border-slate-100 rounded-lg bg-slate-50/40 text-xs space-y-1 hover:border-slate-200 transition-colors"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-900 font-mono text-[11px]">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {log.timestamp.slice(0, 16).replace('T', ' ')}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {log.details}
                      </p>
                      <div className="text-[10px] text-slate-400 pt-0.5 flex items-center justify-between">
                        <span>By: <strong className="text-slate-600">{log.performedBy}</strong></span>
                        <span className="bg-slate-200/70 px-1 py-0.2 rounded font-medium text-slate-700">
                          {log.entityType}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isStaffModalOpen && (
        <StaffFormModal
          onClose={() => setIsStaffModalOpen(false)}
          onSuccess={() => {
            setIsStaffModalOpen(false);
            setStaffNotice('New staff account created successfully.');
            setTimeout(() => setStaffNotice(null), 3500);
            showSuccess('New staff account created successfully.');
          }}
        />
      )}
    </div>
  );
};
