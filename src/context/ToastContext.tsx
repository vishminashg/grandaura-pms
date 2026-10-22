import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_DURATION_MS = 4200;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo }}>
      {children}

      {/* Toast Stack */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const styles: Record<ToastType, { bg: string; icon: React.ReactNode; border: string }> = {
            success: {
              bg: 'bg-slate-900',
              border: 'border-slate-800',
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
            },
            error: {
              bg: 'bg-rose-700',
              border: 'border-rose-600',
              icon: <AlertCircle className="w-4 h-4 text-white shrink-0" />,
            },
            info: {
              bg: 'bg-slate-900',
              border: 'border-slate-800',
              icon: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
            },
          };
          const s = styles[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto w-full ${s.bg} text-white px-4 py-3 rounded-xl shadow-xl border ${s.border} text-xs font-medium flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200`}
            >
              {s.icon}
              <span className="flex-1 leading-relaxed">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-white/50 hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
