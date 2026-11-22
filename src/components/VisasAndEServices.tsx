import React, { useState } from 'react';
import { CheckCircle2, CreditCard, FileSearch, Receipt, ShieldCheck } from 'lucide-react';
import { payInvoiceApi, trackVisaApi, verifyReceiptApi } from '../api/client';
import type { BookedTicket, PaidInvoice, PaymentMethod, VisaApplication, VisaPackage } from '../types';

interface VisasSectionProps {
  visaPackages: VisaPackage[];
  onSelectPackage: (pkg: VisaPackage) => void;
}

export const VisasSection: React.FC<VisasSectionProps> = ({ visaPackages, onSelectPackage }) => {
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Dropbox Visa' | 'Tourist Visa' | 'Umrah Package'>('All');

  const visiblePackages = visaPackages.filter((pkg) =>
    categoryFilter === 'All' ? true : pkg.category === categoryFilter
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Visas &amp; Umrah Packages
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Authorized Visa Dropbox for Royal Thai Embassy and Embassy of Indonesia, plus global e-Visas and Umrah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {(['All', 'Dropbox Visa', 'Tourist Visa', 'Umrah Package'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`min-h-[36px] whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#0A4B94] text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visiblePackages.map((pkg) => (
          <div
            key={pkg.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
          >
            <div>
              <div className="text-xs font-medium text-[#0A4B94]">
                {pkg.category} · {pkg.country}
              </div>
              <h3 className="mt-1.5 text-base font-bold text-slate-900">{pkg.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{pkg.description}</p>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="text-xs text-slate-500">
                {pkg.processingTime} · {pkg.validity}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="font-mono text-base font-bold tabular-nums text-slate-900">
                  {pkg.priceLabel}
                </div>
                <button
                  type="button"
                  onClick={() => onSelectPackage(pkg)}
                  className="min-h-[40px] whitespace-nowrap rounded-xl bg-[#0A4B94] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#083B75]"
                >
                  Apply Online
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

interface EServicesSectionProps {
  authToken: string | null;
  bookings: BookedTicket[];
  visaApplications: VisaApplication[];
  onPayInvoice: (invoice: PaidInvoice) => void;
  onRequireAuth: () => void;
}

export const EServicesSection: React.FC<EServicesSectionProps> = ({
  authToken,
  bookings,
  visaApplications,
  onPayInvoice,
  onRequireAuth,
}) => {
  const [visaRefInput, setVisaRefInput] = useState(visaApplications[0]?.referenceNo || 'FAT-TH-2026-884');
  const [visaResult, setVisaResult] = useState<{
    referenceNo: string;
    packageTitle: string;
    stage: string;
    submittedAt: string;
  } | null>(null);
  const [visaError, setVisaError] = useState<string | null>(null);

  const [receiptInput, setReceiptInput] = useState(bookings[0]?.receiptNo || '');
  const [receiptStatus, setReceiptStatus] = useState<string | null>(null);

  const [invoiceId, setInvoiceId] = useState('INV-2026-4109');
  const [invoiceAmount, setInvoiceAmount] = useState('45000');
  const [invoiceMethod, setInvoiceMethod] = useState<PaymentMethod>('Visa / Mastercard');
  const [invoiceSuccess, setInvoiceSuccess] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const handleTrackVisa = async (e: React.FormEvent) => {
    e.preventDefault();
    setVisaError(null);
    setVisaResult(null);
    try {
      const status = await trackVisaApi(visaRefInput.trim());
      setVisaResult(status);
    } catch (err) {
      setVisaError(err instanceof Error ? err.message : 'Unable to check visa status.');
    }
  };

  const handleVerifyReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setReceiptStatus(null);
    try {
      const res = await verifyReceiptApi(receiptInput.trim());
      setReceiptStatus(res.message);
    } catch (err) {
      setReceiptStatus(err instanceof Error ? err.message : 'Unable to verify receipt.');
    }
  };

  const handleInvoicePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceError(null);
    setInvoiceSuccess(null);

    if (!authToken) {
      onRequireAuth();
      return;
    }

    const amt = Number(invoiceAmount);
    if (!invoiceId.trim() || Number.isNaN(amt) || amt <= 0) {
      setInvoiceError('Please enter a valid invoice number and amount.');
      return;
    }

    try {
      const saved = await payInvoiceApi(authToken, {
        invoiceNo: invoiceId.trim().toUpperCase(),
        amountPkr: amt,
        paymentMethod: invoiceMethod,
      });
      onPayInvoice(saved);
      setInvoiceSuccess(
        `Invoice ${saved.invoiceNo} paid (PKR ${saved.amountPkr.toLocaleString()} via ${saved.paymentMethod}).`
      );
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : 'Unable to pay invoice.');
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">eBooking.pk e-Services</h2>
        <p className="mt-1 text-sm text-slate-600">
          Track visa applications, verify Fly Aviation Travel receipts, and settle invoices online.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2.5 text-[#0A4B94]">
            <FileSearch className="h-5 w-5" />
            <h3 className="text-base font-bold text-slate-900">Track My Visa</h3>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Enter your reference number (sample: <span className="font-mono">FAT-TH-2026-884</span>).
          </p>

          <form onSubmit={handleTrackVisa} className="mt-4 space-y-3">
            <input
              type="text"
              value={visaRefInput}
              onChange={(e) => setVisaRefInput(e.target.value)}
              placeholder="FAT-TH-2026-884"
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase text-slate-900 focus:border-[#0A4B94] focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[42px] w-full rounded-xl bg-[#0A4B94] px-4 py-2 text-xs font-semibold text-white hover:bg-[#083B75]"
            >
              Check Visa Status
            </button>
          </form>

          {visaResult && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
              <div className="font-semibold text-slate-900">{visaResult.packageTitle}</div>
              <div className="mt-1 text-slate-600">
                Reference {visaResult.referenceNo} · Submitted {visaResult.submittedAt}
              </div>
              <div className="mt-2 flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Status: {visaResult.stage}
              </div>
            </div>
          )}
          {visaError && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {visaError}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2.5 text-[#0A4B94]">
            <ShieldCheck className="h-5 w-5" />
            <h3 className="text-base font-bold text-slate-900">Verify Payment Receipt</h3>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Verify any Fly Aviation Travel branch or online receipt (sample: <span className="font-mono">FAT-90421</span>).
          </p>

          <form onSubmit={handleVerifyReceipt} className="mt-4 space-y-3">
            <input
              type="text"
              value={receiptInput}
              onChange={(e) => setReceiptInput(e.target.value)}
              placeholder="Enter Receipt ID (e.g. FAT-90421)"
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase text-slate-900 focus:border-[#0A4B94] focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[42px] w-full rounded-xl bg-[#0A4B94] px-4 py-2 text-xs font-semibold text-white hover:bg-[#083B75]"
            >
              Verify Receipt
            </button>
          </form>

          {receiptStatus && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700">
              {receiptStatus}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2.5 text-[#0A4B94]">
            <Receipt className="h-5 w-5" />
            <h3 className="text-base font-bold text-slate-900">Pay My Invoice</h3>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Pay Fly Aviation corporate or travel invoices directly online.
          </p>

          <form onSubmit={handleInvoicePay} className="mt-4 space-y-3">
            <input
              type="text"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="Invoice Number"
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase text-slate-900 focus:border-[#0A4B94] focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="Amount PKR"
                className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-900 focus:border-[#0A4B94] focus:outline-none"
              />
              <select
                value={invoiceMethod}
                onChange={(e) => setInvoiceMethod(e.target.value as PaymentMethod)}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-[#0A4B94] focus:outline-none"
              >
                <option value="Visa / Mastercard">Card</option>
                <option value="JazzCash Mobile Wallet">JazzCash</option>
                <option value="Easypaisa Mobile Wallet">Easypaisa</option>
                <option value="Raast / Bank Transfer">Raast</option>
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#0A4B94] px-4 py-2 text-xs font-semibold text-white hover:bg-[#083B75]"
            >
              <CreditCard className="h-4 w-4" />
              Pay Invoice Now
            </button>
          </form>

          {invoiceError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {invoiceError}
            </div>
          )}
          {invoiceSuccess && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
              {invoiceSuccess}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
