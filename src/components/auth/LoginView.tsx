import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Hotel, Loader2, AlertCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, authError, clearAuthError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // authError is already set by the context; nothing further to do here.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center shadow-lg mb-4">
            <Hotel className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">GrandAura PMS</h1>
          <p className="text-xs text-slate-400 mt-1">Staff sign-in</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4"
        >
          {authError && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work email</label>
            <input
              type="email"
              required
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (authError) clearAuthError();
              }}
              placeholder="you@grandaurahotel.com"
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (authError) clearAuthError();
              }}
              placeholder="••••••••"
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg shadow-sm transition-colors"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Sign In</span>
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-500 mt-5">
          Don't have an account? Ask your hotel administrator to add you from Settings &rarr; Staff Accounts.
        </p>
      </div>
    </div>
  );
};
