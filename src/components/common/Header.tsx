import React from 'react';
import { useAuth, canAccessTab } from '../../context/AuthContext.tsx';
import { Plus, LogOut } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewReservation: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewReservation,
}) => {
  const { currentUser, logout, can } = useAuth();
  const role = currentUser?.role;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', show: canAccessTab(role, 'dashboard') },
    { id: 'rooms', label: 'Rooms', show: canAccessTab(role, 'rooms') },
    { id: 'reservations', label: 'Reservations', show: canAccessTab(role, 'reservations') },
    { id: 'housekeeping', label: 'Housekeeping', show: canAccessTab(role, 'housekeeping') },
    { id: 'billing', label: 'Billing & Folios', show: canAccessTab(role, 'billing') },
    { id: 'restaurant', label: 'Restaurant', show: canAccessTab(role, 'restaurant') },
    { id: 'reports', label: 'Reports', show: canAccessTab(role, 'reports') },
    { id: 'settings', label: 'Settings', show: canAccessTab(role, 'settings') },
  ].filter((item) => item.show);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-bold tracking-wider shadow-sm">
              GA
            </div>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-lg font-bold tracking-tight text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap text-left"
            >
              GrandAura PMS
            </button>
          </div>

          {/* Zone 2: 4–6 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-5 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-slate-900 font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action & Signed-in Staff Identity */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Signed-in staff identity */}
            {currentUser && (
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50/70 text-xs">
                <div className="flex flex-col items-end leading-tight">
                  <span className="font-medium text-slate-900">{currentUser.name}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Primary Action Button */}
            {can('manage_reservations') && (
              <button
                onClick={onOpenNewReservation}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Booking</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`px-3 py-1 text-xs whitespace-nowrap rounded-md ${
              activeTab === item.id
                ? 'bg-slate-900 text-white font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Developer Credit Strip */}
      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-1 flex items-center justify-center gap-1.5">
        <img
          src="/genzdev-logo.png"
          alt="Gen Z Dev Technology"
          className="w-3.5 h-3.5 rounded-sm object-contain"
        />
        <span className="text-[10px] text-slate-400">
          Powered by <span className="font-semibold text-slate-500">Gen Z Dev Technology</span>
        </span>
      </div>
    </header>
  );
};
