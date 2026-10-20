import React, { useState, useMemo } from 'react';
import { Room, Reservation, RoomType, OperationalStatus, HousekeepingStatus } from '../../types/hotel.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  getRoomOccupancyStatus,
  updateRoomHousekeeping,
  toggleRoomOperationalStatus,
} from '../../services/pmsService.ts';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  Plus,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  Bed,
  Users,
  DollarSign,
  Layers,
  Wrench,
  Ban,
  Check,
} from 'lucide-react';

interface RoomManagementViewProps {
  rooms: Room[];
  reservations: Reservation[];
  onOpenAddRoom: () => void;
  onOpenEditRoom: (room: Room) => void;
}

export const RoomManagementView: React.FC<RoomManagementViewProps> = ({
  rooms,
  reservations,
  onOpenAddRoom,
  onOpenEditRoom,
}) => {
  const { currentUser, can } = useAuth();
  const staffUser = currentUser!;
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedOperational, setSelectedOperational] = useState<string>('all');
  const [selectedHousekeeping, setSelectedHousekeeping] = useState<string>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<'all' | 'available' | 'occupied'>('all');

  // Target date for dynamic availability check (default today)
  const [targetDate, setTargetDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Search by room number or description
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = room.roomNumber.toLowerCase().includes(q);
        const matchDesc = (room.description || '').toLowerCase().includes(q);
        const matchType = room.roomType.toLowerCase().includes(q);
        if (!matchNumber && !matchDesc && !matchType) return false;
      }

      // Filter by type
      if (selectedType !== 'all' && room.roomType !== selectedType) return false;

      // Filter by floor
      if (selectedFloor !== 'all' && String(room.floor) !== selectedFloor) return false;

      // Filter by operational status
      if (selectedOperational !== 'all' && room.operationalStatus !== selectedOperational) return false;

      // Filter by housekeeping status
      if (selectedHousekeeping !== 'all' && room.housekeepingStatus !== selectedHousekeeping) return false;

      // Filter by dynamic availability for targetDate
      if (selectedAvailability !== 'all') {
        const { isOccupied } = getRoomOccupancyStatus(room, targetDate, reservations);
        if (selectedAvailability === 'available' && (isOccupied || room.operationalStatus === 'out_of_order')) {
          return false;
        }
        if (selectedAvailability === 'occupied' && !isOccupied) {
          return false;
        }
      }

      return true;
    });
  }, [
    rooms,
    reservations,
    searchQuery,
    selectedType,
    selectedFloor,
    selectedOperational,
    selectedHousekeeping,
    selectedAvailability,
    targetDate,
  ]);

  const handleHousekeepingToggle = async (room: Room) => {
    const nextStatus: Record<HousekeepingStatus, HousekeepingStatus> = {
      dirty: 'in_progress',
      in_progress: 'clean',
      clean: 'inspected',
      inspected: 'dirty',
    };
    const target = nextStatus[room.housekeepingStatus];
    try {
      await updateRoomHousekeeping(room.id, room.roomNumber, target, staffUser);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleOperational = async (room: Room) => {
    if (!can('manage_rooms')) return;
    const nextStatus: OperationalStatus =
      room.operationalStatus === 'active' ? 'out_of_order' : 'active';
    try {
      await toggleRoomOperationalStatus(
        room.id,
        room.roomNumber,
        nextStatus,
        staffUser,
        nextStatus === 'out_of_order' ? 'Manual status change' : 'Restored to service'
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Room Inventory & Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Dynamic reservation availability, room rates, and housekeeping turnover
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Add Room (Admin only) */}
          {can('manage_rooms') && (
            <button
              onClick={onOpenAddRoom}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Room</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search by room number */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search room number, type, feature..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Room Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">All Room Types</option>
              <option value="Single">Single</option>
              <option value="Double">Double</option>
              <option value="Twin">Twin</option>
              <option value="Deluxe">Deluxe</option>
              <option value="Suite">Suite</option>
              <option value="Family room">Family room</option>
            </select>
          </div>

          {/* Floor */}
          <div>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">All Floors</option>
              <option value="1">Floor 1</option>
              <option value="2">Floor 2</option>
              <option value="3">Floor 3</option>
            </select>
          </div>

          {/* Operational Status */}
          <div>
            <select
              value={selectedOperational}
              onChange={(e) => setSelectedOperational(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">All Operations</option>
              <option value="active">Active Only</option>
              <option value="out_of_order">Out of Order</option>
            </select>
          </div>

          {/* Housekeeping Status */}
          <div>
            <select
              value={selectedHousekeeping}
              onChange={(e) => setSelectedHousekeeping(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">All Cleaning States</option>
              <option value="clean">Clean</option>
              <option value="dirty">Dirty</option>
              <option value="in_progress">In Progress</option>
              <option value="inspected">Inspected</option>
            </select>
          </div>
        </div>

        {/* Date Availability Evaluator Bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Availability for:</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md ml-2">
              <button
                onClick={() => setSelectedAvailability('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedAvailability === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                All ({rooms.length})
              </button>
              <button
                onClick={() => setSelectedAvailability('available')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedAvailability === 'available' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Available
              </button>
              <button
                onClick={() => setSelectedAvailability('occupied')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedAvailability === 'occupied' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Occupied
              </button>
            </div>
          </div>

          <div className="text-slate-500 tabular-nums">
            Showing <span className="font-semibold text-slate-900">{filteredRooms.length}</span> of {rooms.length} rooms
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((room) => {
            const { isOccupied, activeReservation } = getRoomOccupancyStatus(
              room,
              targetDate,
              reservations
            );

            const isOutOfOrder = room.operationalStatus === 'out_of_order';

            return (
              <div
                key={room.id}
                className={`bg-white border rounded-xl p-5 shadow-xs transition-shadow hover:shadow-md flex flex-col justify-between ${
                  isOutOfOrder ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Header: Room number, Type, Floor */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold tracking-tight text-slate-900 font-mono">
                          Room {room.roomNumber}
                        </span>
                        {isOutOfOrder && (
                          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            Out of Order
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">{room.roomType}</span>
                        <span aria-hidden="true">·</span>
                        <span>Floor {room.floor}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums font-mono">${room.baseNightlyRate}/night</span>
                      </div>
                    </div>

                    {/* Admin Edit button */}
                    {can('manage_rooms') && (
                      <button
                        onClick={() => onOpenEditRoom(room)}
                        className="text-slate-400 hover:text-slate-900 p-1 rounded-md transition-colors"
                        title="Edit Room"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Bed Configuration & Occupancy */}
                  <div className="mt-3 text-xs text-slate-600 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Bed className="w-3.5 h-3.5 text-slate-400" />
                      {room.bedConfiguration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Max {room.maxOccupancy}
                    </span>
                  </div>

                  {/* Amenities List */}
                  {room.amenities && room.amenities.length > 0 && (
                    <div className="mt-3 text-[11px] text-slate-500 line-clamp-1">
                      {room.amenities.join(' · ')}
                    </div>
                  )}

                  {/* Real-time Dynamic Availability Status on targetDate */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="text-xs">
                      {isOutOfOrder ? (
                        <div className="text-rose-700 flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Out of Order · Maintenance Required</span>
                        </div>
                      ) : isOccupied && activeReservation ? (
                        <div className="text-blue-900 bg-blue-50/70 border border-blue-100 rounded-lg p-2.5">
                          <div className="font-semibold flex items-center justify-between">
                            <span>Occupied by {activeReservation.guestName}</span>
                            <span className="font-mono text-[11px]">#{activeReservation.reservationNumber}</span>
                          </div>
                          <div className="text-[11px] text-blue-700 mt-0.5">
                            Stay: {activeReservation.checkInDate} to {activeReservation.checkOutDate}
                          </div>
                        </div>
                      ) : (
                        <div className="text-emerald-700 bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-1.5 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Available on {targetDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Housekeeping & Operational Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {/* Housekeeping Status with quick cycle button */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Housekeeping:</span>
                    <button
                      onClick={() => handleHousekeepingToggle(room)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                        room.housekeepingStatus === 'clean'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : room.housekeepingStatus === 'inspected'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                          : room.housekeepingStatus === 'in_progress'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      }`}
                      title="Click to cycle cleaning state"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{room.housekeepingStatus.toUpperCase()}</span>
                    </button>
                  </div>

                  {/* Operational Status Toggle (Admin only) */}
                  {can('manage_rooms') && (
                    <button
                      onClick={() => handleToggleOperational(room)}
                      className="text-[11px] text-slate-500 hover:text-slate-900 underline cursor-pointer"
                    >
                      {isOutOfOrder ? 'Set Active' : 'Set Out of Order'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Room #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Floor</th>
                  <th className="py-3 px-4">Beds & Max</th>
                  <th className="py-3 px-4 text-right">Base Rate</th>
                  <th className="py-3 px-4">Housekeeping</th>
                  <th className="py-3 px-4">Operational</th>
                  <th className="py-3 px-4">Dynamic Availability ({targetDate})</th>
                  {can('manage_rooms') && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map((room) => {
                  const { isOccupied, activeReservation } = getRoomOccupancyStatus(
                    room,
                    targetDate,
                    reservations
                  );
                  const isOutOfOrder = room.operationalStatus === 'out_of_order';

                  return (
                    <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {room.roomNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {room.roomType}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-slate-600">
                        Floor {room.floor}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {room.bedConfiguration} (Max {room.maxOccupancy})
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        ${room.baseNightlyRate.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleHousekeepingToggle(room)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            room.housekeepingStatus === 'clean'
                              ? 'bg-emerald-50 text-emerald-700'
                              : room.housekeepingStatus === 'inspected'
                              ? 'bg-indigo-50 text-indigo-700'
                              : room.housekeepingStatus === 'in_progress'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {room.housekeepingStatus.toUpperCase()}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            isOutOfOrder
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isOutOfOrder ? 'OUT OF ORDER' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isOutOfOrder ? (
                          <span className="text-rose-600 font-medium">Out of order</span>
                        ) : isOccupied && activeReservation ? (
                          <span className="text-blue-700 font-medium">
                            Occupied by {activeReservation.guestName}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Available</span>
                        )}
                      </td>
                      {can('manage_rooms') && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onOpenEditRoom(room)}
                            className="text-slate-600 hover:text-slate-900 font-medium underline"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
