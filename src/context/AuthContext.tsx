import React, { createContext, useContext, useState, useEffect } from 'react';
import { StaffUser } from '../types/hotel.ts';
import { subscribeAuthState, loginWithEmail, logoutUser } from '../services/authService.ts';

export type PermissionAction =
  | 'manage_rooms'
  | 'manage_settings'
  | 'view_audit_logs'
  | 'manage_reservations'
  | 'checkin_checkout'
  | 'manage_billing'
  | 'update_housekeeping'
  | 'assign_housekeeping_tasks'
  // Room rate categories: edit an EXISTING category's price
  | 'edit_room_rates'
  // Room rate categories: add a brand-new category or remove one (Super Admin only)
  | 'manage_rate_categories'
  // Restaurant / POS
  | 'manage_menu'
  | 'create_restaurant_orders'
  // Cashier shifts
  | 'manage_cashier_shift' // open/close own shift
  | 'view_all_cashier_shifts'
  // Reports
  | 'view_reports'
  // Staff: grant the Super Admin role to someone (Super Admin only)
  | 'assign_super_admin_role';

interface AuthContextType {
  currentUser: StaffUser | null;
  authLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (action: PermissionAction) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapAuthErrorCode(code?: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return 'Unable to sign in. Please try again.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((user, loading, error) => {
      setCurrentUser(user);
      setAuthLoading(loading);
      if (error) setAuthError(error);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setAuthError(mapAuthErrorCode(err?.code));
      throw err;
    }
  };

  const logout = async () => {
    await logoutUser();
  };

  const clearAuthError = () => setAuthError(null);

  const can = (action: PermissionAction): boolean => {
    if (!currentUser) return false;
    const role = currentUser.role;

    // Super Admin: everything Admin can do, plus the two Super-Admin-only
    // powers (creating/removing rate categories, granting the Super Admin
    // role to other staff).
    if (role === 'super_admin') return true;

    // Admin: full day-to-day control of the property, EXCEPT the two
    // Super-Admin-reserved powers above.
    if (role === 'admin') {
      switch (action) {
        case 'manage_rate_categories':
        case 'assign_super_admin_role':
          return false;
        default:
          return true;
      }
    }

    if (role === 'receptionist') {
      switch (action) {
        case 'manage_reservations':
        case 'checkin_checkout':
        case 'manage_billing':
        case 'update_housekeeping':
        case 'assign_housekeeping_tasks':
        case 'create_restaurant_orders':
        case 'manage_cashier_shift':
          return true;
        default:
          return false; // no rooms/rates/settings/menu/reports/audit access
      }
    }

    if (role === 'housekeeper') {
      switch (action) {
        case 'update_housekeeping':
          return true;
        default:
          return false;
      }
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, authLoading, authError, clearAuthError, login, logout, can }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
