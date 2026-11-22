import React, { useState } from 'react';
import { CheckCircle2, Copy, Plane, Printer, X } from 'lucide-react';
import { BookedTicket } from '../types';

interface TicketModalProps {
  ticket: BookedTicket | null;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ ticket, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!ticket) return null;

  const handleCopyPnr = async () => {
    try {
      await navigator.clipboard.writeText(ticket.pnr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="eticket-title"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            <h2 id="eticket-title" className="text-base font-bold text-slate-900">
              Confirmed E-Ticket · eBooking.pk
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close e-ticket"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#0A4B94] p-5 text-white">
            <div>
              <div className="text-xs text-white/75">Fly Aviation Travel (Pvt) Ltd</div>
              <div className="mt-1 flex items-center gap-2 font-mono text-2xl font-bold tracking-wider">
                PNR: {ticket.pnr}
                <button
                  type="button"
                  onClick={handleCopyPnr}
                  className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-xs font-sans font-medium text-white hover:bg-white/25"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/75">Payment Receipt</div>
              <div className="font-mono text-sm font-semibold">{ticket.receiptNo}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: ticket.flight.brandColor }}
                >
                  {ticket.flight.airlineCode}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{ticket.flight.airline}</div>
                  <div className="font-mono text-xs text-slate-500">
                    {ticket.flight.flightNo} · {ticket.flight.aircraft}
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700">{ticket.status}</span>
            </div>

            <div className="mt-4 grid grid-cols-3 items-center gap-2">
              <div>
                <div className="font-mono text-xl font-bold tabular-nums text-slate-900">
                  {ticket.flight.departTime}
                </div>
                <div className="text-sm font-semibold text-slate-800">{ticket.flight.fromCode}</div>
                <div className="text-xs text-slate-500">{ticket.departDate}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">{ticket.flight.durationLabel}</div>
                <div className="my-1 flex items-center justify-center gap-1 text-[#0A4B94]">
                  <span className="h-px w-8 bg-slate-300" />
                  <Plane className="h-4 w-4" />
                  <span className="h-px w-8 bg-slate-300" />
                </div>
                <div className="text-xs text-slate-500">
                  {ticket.flight.stops === 0 ? 'Non-Stop' : `${ticket.flight.stops} Stop`}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xl font-bold tabular-nums text-slate-900">
                  {ticket.flight.arriveTime}
                </div>
                <div className="text-sm font-semibold text-slate-800">{ticket.flight.toCode}</div>
                <div className="text-xs text-slate-500">
                  {ticket.returnDate ? `Return ${ticket.returnDate}` : 'Arrival'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-2">
            <div>
              <span className="text-slate-500">Passenger Name</span>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{ticket.passengerName}</p>
            </div>
            <div>
              <span className="text-slate-500">Passport / CNIC</span>
              <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{ticket.passportOrCnic}</p>
            </div>
            <div>
              <span className="text-slate-500">Class & Travelers</span>
              <p className="mt-0.5 font-medium text-slate-900">
                {ticket.cabinClass} · {ticket.travelersSummary}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Baggage Allowance</span>
              <p className="mt-0.5 font-medium text-slate-900">
                {ticket.flight.baggage} checked · {ticket.flight.cabinBag} cabin
              </p>
            </div>
            <div>
              <span className="text-slate-500">Paid Online Via</span>
              <p className="mt-0.5 font-medium text-slate-900">{ticket.paymentMethod}</p>
            </div>
            <div>
              <span className="text-slate-500">Amount Paid</span>
              <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#0A4B94]">
                PKR {ticket.totalPaidPkr.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print E-Ticket
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl bg-[#0A4B94] px-5 py-2 text-sm font-semibold text-white hover:bg-[#083B75]"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
