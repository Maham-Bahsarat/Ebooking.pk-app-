import React, { useEffect, useState } from 'react';
import { FileCheck2, X } from 'lucide-react';
import { submitVisaApi } from '../api/client';
import type { CustomerProfile, VisaApplication, VisaPackage } from '../types';

interface VisaModalProps {
  visaPackage: VisaPackage | null;
  authToken: string | null;
  currentUser: CustomerProfile | null;
  onClose: () => void;
  onSubmitApplication: (app: VisaApplication) => void;
}

export const VisaModal: React.FC<VisaModalProps> = ({
  visaPackage,
  authToken,
  currentUser,
  onClose,
  onSubmitApplication,
}) => {
  const [applicantName, setApplicantName] = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visaPackage) {
      setApplicantName(currentUser?.fullName || '');
      setPassportNo(currentUser?.passportNo || '');
      setPhone(currentUser?.phone || '');
      setSubmitting(false);
      setError('');
    }
  }, [visaPackage, currentUser]);

  if (!visaPackage) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!authToken) {
      setError('Please sign in first to submit your visa application.');
      return;
    }
    if (!applicantName.trim()) {
      setError('Applicant full name is required.');
      return;
    }
    if (passportNo.trim().length < 6) {
      setError('Enter a valid passport number.');
      return;
    }
    if (phone.trim().length < 7) {
      setError('Enter a valid contact phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const app = await submitVisaApi(authToken, {
        packageId: visaPackage.id,
        applicantName: applicantName.trim(),
        passportNo: passportNo.trim().toUpperCase(),
        phone: phone.trim(),
      });
      onSubmitApplication(app);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit visa application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visa-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A4B94] text-white">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="visa-modal-title" className="text-base font-bold text-slate-900">
                {visaPackage.title}
              </h2>
              <p className="text-xs text-slate-500">
                {visaPackage.processingTime} · {visaPackage.priceLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close visa modal"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Applicant Full Name</label>
            <input
              type="text"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              placeholder="As shown on passport"
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Passport Number</label>
            <input
              type="text"
              value={passportNo}
              onChange={(e) => setPassportNo(e.target.value)}
              placeholder="e.g. AB9182734"
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
            />
          </div>
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
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[42px] rounded-xl bg-[#0A4B94] px-5 py-2 text-sm font-semibold text-white hover:bg-[#083B75] disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
