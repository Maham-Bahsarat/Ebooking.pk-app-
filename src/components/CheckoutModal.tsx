import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { createBookingApi } from '../api/client';
import type {
  BookedTicket,
  CabinClass,
  CustomerProfile,
  FlightOption,
  PaymentMethod,
} from '../types';

interface CheckoutModalProps {
  flight: FlightOption | null;
  authToken: string | null;
  currentUser: CustomerProfile | null;
  cabinClass: CabinClass;
  isReturn: boolean;
  totalPassengers: number;
  travelersSummary: string;
  departDate: string;
  returnDate?: string;
  onClose: () => void;
  onConfirmBooking: (ticket: BookedTicket) => void;
}

const PAYMENT_OPTIONS: { method: PaymentMethod; subtitle: string; icon: 'card' | 'wallet' | 'bank' }[] = [
  { method: 'Visa / Mastercard', subtitle: 'Instant debit or credit card checkout', icon: 'card' },
  { method: 'JazzCash Mobile Wallet', subtitle: 'Approve via JazzCash MPIN', icon: 'wallet' },
  { method: 'Easypaisa Mobile Wallet', subtitle: 'Approve via Easypaisa app', icon: 'wallet' },
  { method: 'Raast / Bank Transfer', subtitle: 'Direct instant bank settlement', icon: 'bank' },
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  flight,
  authToken,
  currentUser,
  cabinClass,
  isReturn,
  totalPassengers,
  travelersSummary,
  departDate,
  returnDate,
  onClose,
  onConfirmBooking,
}) => {
  const [step, setStep] = useState<'passenger' | 'payment'>('passenger');
  const [passengerName, setPassengerName] = useState('');
  const [passportOrCnic, setPassportOrCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addInsurance, setAddInsurance] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Visa / Mastercard');
  const [accountRef, setAccountRef] = useState('4242 4242 4242 4242');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (flight) {
      setStep('passenger');
      setPassengerName(currentUser?.fullName || '');
      setPassportOrCnic(currentUser?.passportNo || '');
      setPhone(currentUser?.phone || '');
      setEmail(currentUser?.email || '');
      setAddInsurance(false);
      setSubmitting(false);
      setError('');
    }
  }, [flight, currentUser]);

  if (!flight) return null;

  const flightTotal = flight.baseFarePkr * totalPassengers;
  const insuranceFee = addInsurance ? 3500 * totalPassengers : 0;
  const grandTotal = flightTotal + insuranceFee;

  const handleContinueToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!passengerName.trim()) {
      setError('Lead passenger full name is required.');
      return;
    }
    if (passportOrCnic.trim().length < 6) {
      setError('Enter a valid Passport Number or CNIC.');
      return;
    }
    if (phone.trim().length < 7) {
      setError('Enter a valid contact phone number.');
      return;
    }
    if (!email.includes('@')) {
      setError('Enter a valid email address to receive your e-ticket.');
      return;
    }
    setStep('payment');
  };

  const handlePayAndIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!authToken) {
      setError('Please sign in to issue and save your booking.');
      return;
    }
    if (accountRef.trim().length < 4) {
      setError('Please enter valid payment account or card details.');
      return;
    }

    setSubmitting(true);
    try {
      const ticket = await createBookingApi(authToken, {
        flightId: flight.id,
        fromCode: flight.fromCode,
        toCode: flight.toCode,
        cabinClass,
        isReturn,
        departDate,
        returnDate,
        passengerName: passengerName.trim(),
        passportOrCnic: passportOrCnic.trim().toUpperCase(),
        phone: phone.trim(),
        email: email.trim(),
        travelersSummary,
        totalPassengers,
        hasInsurance: addInsurance,
        paymentMethod,
      });
      onConfirmBooking(ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment or booking creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
          <div>
            <h2 id="checkout-title" className="text-lg font-bold text-slate-900">
              {step === 'passenger' ? '1. Passenger Details' : '2. Online Payment & Instant Ticket'}
            </h2>
            <p className="text-xs text-slate-500">
              {flight.airline} ({flight.flightNo}) · {flight.fromCode} to {flight.toCode} · {departDate}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: flight.brandColor }}
              >
                {flight.airlineCode}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {flight.fromCode} <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-slate-400" /> {flight.toCode}
                  <span className="ml-2 font-mono text-xs font-medium text-slate-600">
                    {flight.departTime} – {flight.arriveTime}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {cabinClass} · {travelersSummary} · Baggage {flight.baggage}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Total Payable</div>
              <div className="font-mono text-lg font-bold tabular-nums text-[#0A4B94]">
                PKR {grandTotal.toLocaleString()}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {step === 'passenger' ? (
            <form onSubmit={handleContinueToPayment} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Lead Passenger Full Name (as on Passport / CNIC)
                  </label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="e.g. Ayesha Khan"
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Passport Number (or CNIC for Domestic)
                  </label>
                  <input
                    type="text"
                    value={passportOrCnic}
                    onChange={(e) => setPassportOrCnic(e.target.value)}
                    placeholder="e.g. AB9182734"
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Mobile Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">E-Ticket Delivery Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ayesha@example.com"
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 transition-colors hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={addInsurance}
                  onChange={(e) => setAddInsurance(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0A4B94] focus:ring-[#0A4B94]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <ShieldCheck className="h-4 w-4 text-[#0A4B94]" />
                      Add Fly Aviation Travel Insurance
                    </span>
                    <span className="font-mono text-xs font-semibold tabular-nums text-[#0A4B94]">
                      +PKR {(3500 * totalPassengers).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Covers overseas medical emergencies, delayed baggage, and trip cancellation.
                  </p>
                </div>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] rounded-xl bg-[#0A4B94] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#083B75]"
                >
                  Continue to Online Payment
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePayAndIssue} className="space-y-4">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {PAYMENT_OPTIONS.map((opt) => {
                  const active = paymentMethod === opt.method;
                  return (
                    <button
                      key={opt.method}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(opt.method);
                        if (opt.method === 'Visa / Mastercard') {
                          setAccountRef('4242 4242 4242 4242');
                        } else if (opt.method === 'Raast / Bank Transfer') {
                          setAccountRef('PK36MEZN0002140104829100');
                        } else {
                          setAccountRef(phone || '03001234567');
                        }
                      }}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                        active
                          ? 'border-[#0A4B94] bg-[#0A4B94]/[0.04] ring-1 ring-[#0A4B94]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="mt-0.5 text-[#0A4B94]">
                        {opt.icon === 'card' && <CreditCard className="h-5 w-5" />}
                        {opt.icon === 'wallet' && <Smartphone className="h-5 w-5" />}
                        {opt.icon === 'bank' && <Building2 className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900">{opt.method}</div>
                        <div className="text-xs text-slate-500">{opt.subtitle}</div>
                      </div>
                      {active && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0A4B94]" />}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  {paymentMethod === 'Visa / Mastercard'
                    ? 'Card Number'
                    : paymentMethod === 'Raast / Bank Transfer'
                      ? 'Raast ID / IBAN'
                      : 'Mobile Wallet Account Number'}
                </label>
                <input
                  type="text"
                  value={accountRef}
                  onChange={(e) => setAccountRef(e.target.value)}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Base Fare ({travelersSummary})</span>
                  <span className="font-mono tabular-nums">PKR {flightTotal.toLocaleString()}</span>
                </div>
                {addInsurance && (
                  <div className="mt-1.5 flex justify-between text-slate-600">
                    <span>Travel Insurance</span>
                    <span className="font-mono tabular-nums">PKR {insuranceFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="mt-2.5 flex justify-between border-t border-slate-200 pt-2.5 text-sm font-bold text-slate-900">
                  <span>Total Online Payment</span>
                  <span className="font-mono tabular-nums text-[#0A4B94]">
                    PKR {grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('passenger')}
                  className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[46px] flex-1 rounded-xl bg-[#0A4B94] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#083B75] disabled:opacity-60"
                >
                  {submitting
                    ? 'Processing Payment & Issuing PNR...'
                    : `Pay PKR ${grandTotal.toLocaleString()} & Issue E-Ticket`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
