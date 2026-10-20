import React, { useState, useMemo } from 'react';
import { Room, HousekeepingTask, HousekeepingStatus } from '../../types/hotel.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  updateRoomHousekeeping,
  createHousekeepingTask,
  updateHousekeepingTaskStatus,
} from '../../services/pmsService.ts';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Filter,
  Layers,
  Search,
  Check,
  ShieldCheck,
  Wrench,
  User,
} from 'lucide-react';

interface HousekeepingViewProps {
  rooms: Room[];
  housekeepingTasks: HousekeepingTask[];
}

export const HousekeepingView: React.FC<HousekeepingViewProps> = ({
  rooms,
  housekeepingTasks,
}) => {
  const { currentUser, can } = useAuth();
  // This view only ever renders once a staff member is signed in, so the
  // non-null assertion here just reflects that guarantee to TypeScript.
  const staffUser = currentUser!;
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Task creation modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [taskType, setTaskType] = useState<HousekeepingTask['taskType']>('Daily Clean');
  const [taskPriority, setTaskPriority] = useState<HousekeepingTask['priority']>('standard');
  const [assignedTo, setAssignedTo] = useState(staffUser.name);
  const [taskNotes, setTaskNotes] = useState('');

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !room.roomNumber.toLowerCase().includes(q) &&
          !room.roomType.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (selectedFloor !== 'all' && String(room.floor) !== selectedFloor) return false;
      if (selectedStatus !== 'all' && room.housekeepingStatus !== selectedStatus) return false;
      return true;
    });
  }, [rooms, searchQuery, selectedFloor, selectedStatus]);

  // Housekeeping metric counts
  const counts = useMemo(() => {
    return {
      clean: rooms.filter((r) => r.housekeepingStatus === 'clean').length,
      inspected: rooms.filter((r) => r.housekeepingStatus === 'inspected').length,
      dirty: rooms.filter((r) => r.housekeepingStatus === 'dirty').length,
      in_progress: rooms.filter((r) => r.housekeepingStatus === 'in_progress').length,
      tasksPending: housekeepingTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
    };
  }, [rooms, housekeepingTasks]);

  const handleSetRoomStatus = async (
    room: Room,
    status: HousekeepingStatus,
    notes?: string
  ) => {
    if (!can('update_housekeeping')) return;
    try {
      await updateRoomHousekeeping(room.id, room.roomNumber, status, staffUser, notes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTaskStatus = async (
    task: HousekeepingTask,
    newStatus: HousekeepingTask['status']
  ) => {
    if (!can('update_housekeeping')) return;
    try {
      await updateHousekeepingTaskStatus(task.id, newStatus, staffUser);

      // If task marked completed or inspected, optionally sync room
      if (newStatus === 'completed') {
        const targetRoom = rooms.find((r) => r.id === task.roomId);
        if (targetRoom && targetRoom.housekeepingStatus !== 'inspected') {
          await updateRoomHousekeeping(
            targetRoom.id,
            targetRoom.roomNumber,
            'clean',
            staffUser,
            'Cleaned per task completion'
          );
        }
      } else if (newStatus === 'inspected') {
        const targetRoom = rooms.find((r) => r.id === task.roomId);
        if (targetRoom) {
          await updateRoomHousekeeping(
            targetRoom.id,
            targetRoom.roomNumber,
            'inspected',
            staffUser,
            'Inspected & approved'
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('assign_housekeeping_tasks')) return;
    if (!selectedRoomId) return;
    const targetRoom = rooms.find((r) => r.id === selectedRoomId);
    if (!targetRoom) return;

    try {
      await createHousekeepingTask(
        {
          roomId: targetRoom.id,
          roomNumber: targetRoom.roomNumber,
          floor: targetRoom.floor,
          taskType,
          priority: taskPriority,
          status: 'pending',
          assignedTo,
          notes: taskNotes,
        },
        staffUser
      );

      // If task type implies dirty turnover, set room dirty
      if (taskType === 'Checkout Clean' || taskType === 'Deep Clean') {
        await updateRoomHousekeeping(
          targetRoom.id,
          targetRoom.roomNumber,
          'dirty',
          staffUser,
          `Turnover task created: ${taskType}`
        );
      }

      setIsTaskModalOpen(false);
      setSelectedRoomId('');
      setTaskNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Housekeeping & Room Turnover
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Turnover workflow, cleaning statuses, supervisor inspections, and staff task queues
          </p>
        </div>

        {can('assign_housekeeping_tasks') && (
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Cleaning Task</span>
          </button>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-amber-700 font-semibold block">
            Dirty / Requires Turnover
          </span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums mt-1 block">
            {counts.dirty}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">High priority</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-blue-700 font-semibold block">
            Cleaning In Progress
          </span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums mt-1 block">
            {counts.in_progress}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Currently serviced</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-emerald-700 font-semibold block">
            Clean / Awaiting Inspection
          </span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums mt-1 block">
            {counts.clean}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Ready for supervisor</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-indigo-700 font-semibold block">
            Inspected & Guest Ready
          </span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums mt-1 block">
            {counts.inspected}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Pristine standards</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-700 font-semibold block">
            Active Task Queue
          </span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums mt-1 block">
            {counts.tasksPending}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Assigned duties</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 w-40"
            />
          </div>

          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
          >
            <option value="all">All Floors</option>
            <option value="1">Floor 1</option>
            <option value="2">Floor 2</option>
            <option value="3">Floor 3</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
          >
            <option value="all">All Cleaning Statuses</option>
            <option value="dirty">Dirty</option>
            <option value="in_progress">Cleaning in Progress</option>
            <option value="clean">Clean</option>
            <option value="inspected">Inspected</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 tabular-nums">
          Showing <strong className="text-slate-900">{filteredRooms.length}</strong> of {rooms.length} rooms
        </div>
      </div>

      {/* Main Split: Room Turnover Pipeline & Assigned Task Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Turnover Grid (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Room Cleaning Controls
            </h2>
            <span className="text-xs text-slate-500">
              One-click staff action buttons
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredRooms.map((room) => {
              const isDirty = room.housekeepingStatus === 'dirty';
              const isInProgress = room.housekeepingStatus === 'in_progress';
              const isClean = room.housekeepingStatus === 'clean';
              const isInspected = room.housekeepingStatus === 'inspected';
              const isOutOfOrder = room.operationalStatus === 'out_of_order';

              return (
                <div
                  key={room.id}
                  className={`bg-white border rounded-xl p-4 shadow-xs flex flex-col justify-between ${
                    isOutOfOrder
                      ? 'border-rose-200 bg-rose-50/15'
                      : isDirty
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold font-mono text-slate-900">
                          Room {room.roomNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {room.roomType} · Fl {room.floor}
                        </span>
                      </div>

                      {/* Status indicator */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide ${
                          isInspected
                            ? 'bg-indigo-50 text-indigo-700'
                            : isClean
                            ? 'bg-emerald-50 text-emerald-700'
                            : isInProgress
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {room.housekeepingStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                      <span>{room.bedConfiguration}</span>
                      {room.lastCleanedAt && (
                        <span className="text-[10px]">
                          Last serviced: {room.lastCleanedAt.slice(11, 16)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                    {/* If Dirty: Start Cleaning */}
                    {isDirty && (
                      <button
                        onClick={() => handleSetRoomStatus(room, 'in_progress')}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                      >
                        Start Cleaning
                      </button>
                    )}

                    {/* If In Progress: Mark Clean */}
                    {isInProgress && (
                      <button
                        onClick={() => handleSetRoomStatus(room, 'clean')}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                      >
                        Mark Clean
                      </button>
                    )}

                    {/* If Clean: Inspect & Approve */}
                    {isClean && (
                      <button
                        onClick={() => handleSetRoomStatus(room, 'inspected')}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Inspect & Approve</span>
                      </button>
                    )}

                    {/* Quick Mark Dirty (e.g. for inspection reject or guest turnover) */}
                    {!isDirty && (
                      <button
                        onClick={() => handleSetRoomStatus(room, 'dirty', 'Flagged for cleaning')}
                        className="px-2 py-1 text-[11px] text-slate-500 hover:text-amber-800 transition-colors ml-auto"
                      >
                        Mark Dirty
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assigned Housekeeping Tasks List (1 Col) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                Staff Task Queue
              </h2>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {housekeepingTasks.length} tasks
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {housekeepingTasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 italic text-center">
                  No active housekeeping tasks logged.
                </p>
              ) : (
                housekeepingTasks.map((task) => {
                  const isCompleted = task.status === 'completed' || task.status === 'inspected';
                  const priorityClass =
                    task.priority === 'urgent'
                      ? 'text-rose-700 bg-rose-50'
                      : task.priority === 'high'
                      ? 'text-amber-700 bg-amber-50'
                      : 'text-slate-600 bg-slate-100';

                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isCompleted
                          ? 'border-slate-100 bg-slate-50/50 opacity-75'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              Room {task.roomNumber}
                            </span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${priorityClass}`}>
                              {task.priority.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-slate-800 mt-1">
                            {task.taskType}
                          </div>
                          {task.notes && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {task.notes}
                            </p>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{task.assignedTo || 'Unassigned'}</span>
                            <span aria-hidden="true">·</span>
                            <span>Floor {task.floor}</span>
                          </div>
                        </div>
                      </div>

                      {/* Task status action buttons */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500 capitalize">
                          Status: <strong className="text-slate-700">{task.status}</strong>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {task.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateTaskStatus(task, 'in_progress')}
                              className="px-2 py-0.5 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded"
                            >
                              Start
                            </button>
                          )}
                          {task.status === 'in_progress' && (
                            <button
                              onClick={() => handleUpdateTaskStatus(task, 'completed')}
                              className="px-2 py-0.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded"
                            >
                              Done
                            </button>
                          )}
                          {task.status === 'completed' && (
                            <button
                              onClick={() => handleUpdateTaskStatus(task, 'inspected')}
                              className="px-2 py-0.5 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Housekeeping Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Create Housekeeping Task
            </h2>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Room
                </label>
                <select
                  required
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">-- Select Room --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber} ({r.roomType}, Floor {r.floor}) - Currently {r.housekeepingStatus}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Task Type
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as any)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="Daily Clean">Daily Clean</option>
                    <option value="Checkout Clean">Checkout Clean</option>
                    <option value="Deep Clean">Deep Clean</option>
                    <option value="Touch Up">Touch Up</option>
                    <option value="Inspection">Inspection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="standard">Standard</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assignee
                </label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Staff member name"
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task Notes & Instructions
                </label>
                <textarea
                  rows={2}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="e.g. Extra towels requested, balcony glass cleaning..."
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Dispatch Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
