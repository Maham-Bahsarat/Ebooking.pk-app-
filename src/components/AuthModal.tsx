import React, { useState } from 'react';
import { Lock, Mail, Phone, Plane, User, X } from 'lucide-react';
import { loginCustomer, registerCustomer } from '../api/client';
import type { CustomerProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CustomerProfile | null;
  onAuthenticate: (token: string, profile: CustomerProfile) => void;
  onSignOut: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthenticate,
  onSignOut,
}) => {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [passportNo, setPassportNo] = useState(currentUser?.passportNo || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (mode === 'signup' && phone.trim().length < 7) {
      setError('Please enter a valid mobile number.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setLoading(true);
    try {
      const authRes =
        mode === 'signup'
          ? await registerCustomer({
              fullName: fullName.trim(),
              email: email.trim(),
              phone: phone.trim(),
              passportNo: passportNo.trim().toUpperCase() || undefined,
              password,
            })
          : await loginCustomer(email.trim(), password);

      onAuthenticate(authRes.token, authRes.user);
      setPassword('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A4B94] text-white">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-lg font-bold text-slate-900">
                {currentUser
                  ? 'Customer Account'
                  : mode === 'login'
                    ? 'Customer Login'
                    : 'Create Customer Account'}
              </h2>
              <p className="text-xs text-slate-500">eBooking.pk with Fly Aviation Travel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {currentUser ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{currentUser.fullName}</p>
              <p className="mt-1 text-xs text-slate-600">
                {currentUser.email} · {currentUser.phone}
              </p>
              {currentUser.passportNo && (
                <p className="mt-1 font-mono text-xs text-slate-500">
                  Passport / CNIC: {currentUser.passportNo}
                </p>
              )}
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Your profile automatically pre-fills passenger information during flight checkout and visa filing.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="min-h-[42px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] rounded-lg bg-[#0A4B94] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#083B75]"
              >
                Continue Booking
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Full Name</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Mobile Number</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0300-1234567"
                      className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Passport / CNIC (Optional)</label>
                  <input
                    type="text"
                    value={passportNo}
                    onChange={(e) => setPassportNo(e.target.value)}
                    placeholder="AB9182734"
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm uppercase text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 min-h-[46px] w-full rounded-xl bg-[#0A4B94] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#083B75] disabled:opacity-60"
            >
              {loading
                ? 'Authenticating...'
                : mode === 'login'
                  ? 'Sign In & Book Flights'
                  : 'Create Account & Start Booking'}
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode(mode === 'login' ? 'signup' : 'login');
                }}
                className="text-xs font-medium text-[#0A4B94] hover:underline"
              >
                {mode === 'login'
                  ? 'New customer? Create an account'
                  : 'Already registered? Sign in'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
