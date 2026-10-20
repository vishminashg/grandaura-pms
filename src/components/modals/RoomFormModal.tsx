import React, { useState } from 'react';
import { Room, RoomType, OperationalStatus, HousekeepingStatus } from '../../types/hotel.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { createRoom, updateRoomDetails } from '../../services/pmsService.ts';
import { X, BedDouble, AlertCircle } from 'lucide-react';

interface RoomFormModalProps {
  roomToEdit?: Room | null;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_AMENITIES = [
  'High-speed Wi-Fi',
  'Smart TV',
  'Air Conditioning',
  'Mini Bar',
  'Mini Fridge',
  'Espresso Machine',
  'Balcony',
  'Marble Bath',
  'Work Desk',
  'Safe Deposit Box',
  'Bathrobes',
  'Room Service',
];

export const RoomFormModal: React.FC<RoomFormModalProps> = ({
  roomToEdit,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const staffUser = currentUser!;
  const isEditing = Boolean(roomToEdit);

  const [roomNumber, setRoomNumber] = useState(roomToEdit?.roomNumber || '');
  const [roomType, setRoomType] = useState<RoomType>(roomToEdit?.roomType || 'Double');
  const [floor, setFloor] = useState<number>(roomToEdit?.floor || 1);
  const [maxOccupancy, setMaxOccupancy] = useState<number>(roomToEdit?.maxOccupancy || 2);
  const [bedConfiguration, setBedConfiguration] = useState(roomToEdit?.bedConfiguration || '1 Queen Bed');
  const [baseNightlyRate, setBaseNightlyRate] = useState<number>(roomToEdit?.baseNightlyRate || 140);
  const [description, setDescription] = useState(roomToEdit?.description || '');
  const [amenities, setAmenities] = useState<string[]>(roomToEdit?.amenities || ['High-speed Wi-Fi', 'Smart TV', 'Air Conditioning']);
  const [operationalStatus, setOperationalStatus] = useState<OperationalStatus>(roomToEdit?.operationalStatus || 'active');
  const [housekeepingStatus, setHousekeepingStatus] = useState<HousekeepingStatus>(roomToEdit?.housekeepingStatus || 'clean');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleAmenity = (amenity: string) => {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter((a) => a !== amenity));
    } else {
      setAmenities([...amenities, amenity]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      setErrorMsg('Room number is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (isEditing && roomToEdit) {
        await updateRoomDetails(
          roomToEdit.id,
          {
            roomNumber,
            roomType,
            floor,
            maxOccupancy,
            bedConfiguration,
            baseNightlyRate,
            description,
            amenities,
            operationalStatus,
            housekeepingStatus,
          },
          staffUser
        );
      } else {
        await createRoom(
          {
            roomNumber,
            roomType,
            floor,
            maxOccupancy,
            bedConfiguration,
            baseNightlyRate,
            description,
            amenities,
            operationalStatus,
            housekeepingStatus,
          },
          staffUser
        );
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save room details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 my-8 space-y-4 text-xs">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-slate-700" />
              <span>{isEditing ? `Edit Room ${roomToEdit?.roomNumber}` : 'Add New Hotel Room'}</span>
            </h2>
            <p className="text-slate-500 mt-0.5">
              Configure room specifications, base rates, amenities, and operational state
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Room Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 101, 204"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Room Type *
              </label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as RoomType)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Single">Single</option>
                <option value="Double">Double</option>
                <option value="Twin">Twin</option>
                <option value="Deluxe">Deluxe</option>
                <option value="Suite">Suite</option>
                <option value="Family room">Family room</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Floor *
              </label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={floor}
                onChange={(e) => setFloor(parseInt(e.target.value) || 1)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Max Occupancy
              </label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={maxOccupancy}
                onChange={(e) => setMaxOccupancy(parseInt(e.target.value) || 1)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Base Nightly Rate ($) *
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={baseNightlyRate}
                onChange={(e) => setBaseNightlyRate(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Bed Configuration
              </label>
              <input
                type="text"
                placeholder="e.g. 1 King Bed"
                value={bedConfiguration}
                onChange={(e) => setBedConfiguration(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Room view, acoustics, specialty decor..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Statuses */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Operational Status
              </label>
              <select
                value={operationalStatus}
                onChange={(e) => setOperationalStatus(e.target.value as OperationalStatus)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="active">Active (Sellable)</option>
                <option value="out_of_order">Out of Order (Maintenance)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Housekeeping Status
              </label>
              <select
                value={housekeepingStatus}
                onChange={(e) => setHousekeepingStatus(e.target.value as HousekeepingStatus)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="clean">Clean</option>
                <option value="dirty">Dirty</option>
                <option value="in_progress">Cleaning in Progress</option>
                <option value="inspected">Inspected</option>
              </select>
            </div>
          </div>

          {/* Amenities Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              Room Amenities
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMON_AMENITIES.map((amenity) => {
                const isSelected = amenities.includes(amenity);
                return (
                  <button
                    type="button"
                    key={amenity}
                    onClick={() => handleToggleAmenity(amenity)}
                    className={`p-1.5 border rounded text-left transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white font-medium'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{amenity}</span>
                    {isSelected && <span className="text-amber-400 font-bold ml-1">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Room' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
