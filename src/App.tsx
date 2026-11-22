import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileText,
  Globe,
  LogOut,
  Plane,
  Ticket,
  User,
  Users,
} from 'lucide-react';
import {
  type AirlineInfo,
  fetchBookingsApi,
  fetchCatalogApi,
  fetchInvoicesApi,
  fetchVisasApi,
  requestRefundApi,
  searchFlightsApi,
} from './api/client';
import { AuthModal } from './components/AuthModal';
import { CheckoutModal } from './components/CheckoutModal';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { TicketModal } from './components/TicketModal';
import { VisaModal } from './components/VisaModal';
import { EServicesSection, VisasSection } from './components/VisasAndEServices';
import type {
  Airport,
  BookedTicket,
  CabinClass,
  CustomerProfile,
  FlightOption,
  NavTab,
  PaidInvoice,
  VisaApplication,
  VisaPackage,
} from './types';

function getDefaultDate(daysAhead: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + daysAhead);
  return dt.toISOString().split('T')[0];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('flights');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CustomerProfile | null>(null);

  const [bookings, setBookings] = useState<BookedTicket[]>([]);
  const [visaApplications, setVisaApplications] = useState<VisaApplication[]>([]);
  const [paidInvoices, setPaidInvoices] = useState<PaidInvoice[]>([]);

  // Search form state
  const [fromCode, setFromCode] = useState('LHE');
  const [toCode, setToCode] = useState('DXB');
  const [isReturn, setIsReturn] = useState(false);
  const [departDate, setDepartDate] = useState(() => getDefaultDate(5));
  const [returnDate, setReturnDate] = useState(() => getDefaultDate(12));
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [showTravelersMenu, setShowTravelersMenu] = useState(false);
  const [cabinClass, setCabinClass] = useState<CabinClass>('Economy');
  const [routeError, setRouteError] = useState('');

  // Server catalog & flight results
  const [airports, setAirports] = useState<Airport[]>([]);
  const [featuredAirlines, setFeaturedAirlines] = useState<AirlineInfo[]>([]);
  const [visaPackages, setVisaPackages] = useState<VisaPackage[]>([]);
  const [rawFlights, setRawFlights] = useState<FlightOption[]>([]);
  const [loadingFlights, setLoadingFlights] = useState(true);
  const [flightLoadError, setFlightLoadError] = useState<string | null>(null);

  // Results filters
  const [airlineScope, setAirlineScope] = useState<'all' | 'international' | 'pakistani' | 'nonstop'>('all');
  const [selectedCarrier, setSelectedCarrier] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'depart'>('price');

  // Modals & pending post-auth actions
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [checkoutFlight, setCheckoutFlight] = useState<FlightOption | null>(null);
  const [pendingFlight, setPendingFlight] = useState<FlightOption | null>(null);
  const [activeTicket, setActiveTicket] = useState<BookedTicket | null>(null);
  const [selectedVisaPkg, setSelectedVisaPkg] = useState<VisaPackage | null>(null);
  const [pendingVisaPkg, setPendingVisaPkg] = useState<VisaPackage | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Load airports, airlines, and visa packages from backend /api/catalog
  useEffect(() => {
    let cancelled = false;
    fetchCatalogApi()
      .then((catalog) => {
        if (!cancelled) {
          setAirports(catalog.airports);
          setFeaturedAirlines(catalog.airlines);
          setVisaPackages(catalog.visaPackages);
        }
      })
      .catch(() => {
        // Catalog stays empty if backend unreachable
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load flights from Express API when route parameters change
  useEffect(() => {
    if (fromCode === toCode) {
      setRawFlights([]);
      setLoadingFlights(false);
      return;
    }

    let cancelled = false;
    setLoadingFlights(true);
    setFlightLoadError(null);
    searchFlightsApi({ from: fromCode, to: toCode, cabin: cabinClass, isReturn })
      .then((flights) => {
        if (!cancelled) setRawFlights(flights);
      })
      .catch((err) => {
        if (!cancelled) {
          setRawFlights([]);
          setFlightLoadError(
            err instanceof Error ? err.message : 'Unable to reach flight search server.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFlights(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fromCode, toCode, cabinClass, isReturn]);

  // Load user's MongoDB records after login
  useEffect(() => {
    if (!authToken) {
      setBookings([]);
      setVisaApplications([]);
      setPaidInvoices([]);
      return;
    }

    let cancelled = false;
    Promise.all([
      fetchBookingsApi(authToken),
      fetchVisasApi(authToken),
      fetchInvoicesApi(authToken),
    ])
      .then(([bList, vList, iList]) => {
        if (!cancelled) {
          setBookings(bList);
          setVisaApplications(vList);
          setPaidInvoices(iList);
        }
      })
      .catch(() => {
        // Keep current state if temporary offline error occurs
      });

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const totalPassengers = adults + children + infants;
  const travelersSummary = `${adults} Adult${adults > 1 ? 's' : ''}${
    children > 0 ? `, ${children} Child` : ''
  }${infants > 0 ? `, ${infants} Infant` : ''}`;

  const filteredFlights = useMemo(() => {
    const filtered = rawFlights.filter((f) => {
      if (airlineScope === 'international' && !f.isInternational) return false;
      if (airlineScope === 'pakistani' && f.isInternational) return false;
      if (airlineScope === 'nonstop' && f.stops !== 0) return false;
      if (selectedCarrier !== 'ALL' && f.airlineCode !== selectedCarrier) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'price') return a.baseFarePkr - b.baseFarePkr;
      if (sortBy === 'duration') return a.durationMinutes - b.durationMinutes;
      return a.departTime.localeCompare(b.departTime);
    });
  }, [rawFlights, airlineScope, selectedCarrier, sortBy]);

  const handleSwapAirports = () => {
    setFromCode(toCode);
    setToCode(fromCode);
    setRouteError('');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromCode === toCode) {
      setRouteError('Origin and destination airports must be different.');
      return;
    }
    setRouteError('');
    setSelectedCarrier('ALL');
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectRouteShortcut = (origin: string, dest: string) => {
    setFromCode(origin);
    setToCode(dest);
    setSelectedCarrier('ALL');
    setAirlineScope('all');
    setRouteError('');
    setActiveTab('flights');
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleStartFlightBooking = (flight: FlightOption) => {
    if (!authToken) {
      setPendingFlight(flight);
      setAuthModalOpen(true);
      showToast('Please sign in or create an account to book your flight.');
      return;
    }
    setCheckoutFlight(flight);
  };

  const handleStartVisaApply = (pkg: VisaPackage) => {
    if (!authToken) {
      setPendingVisaPkg(pkg);
      setAuthModalOpen(true);
      showToast('Please sign in or create an account to submit a visa application.');
      return;
    }
    setSelectedVisaPkg(pkg);
  };

  const handleAuthenticated = (token: string, profile: CustomerProfile) => {
    setAuthToken(token);
    setCurrentUser(profile);
    showToast(`Signed in as ${profile.fullName}.`);

    if (pendingFlight) {
      setCheckoutFlight(pendingFlight);
      setPendingFlight(null);
    } else if (pendingVisaPkg) {
      setSelectedVisaPkg(pendingVisaPkg);
      setPendingVisaPkg(null);
    }
  };

  const handleSignOut = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setPendingFlight(null);
    setPendingVisaPkg(null);
    showToast('Signed out.');
  };

  const handleConfirmBooking = (ticket: BookedTicket) => {
    setBookings((prev) => [ticket, ...prev]);
    setCheckoutFlight(null);
    setActiveTicket(ticket);
    showToast(`E-Ticket confirmed! PNR ${ticket.pnr} saved to My Bookings.`);
  };

  const handleSubmitVisa = (app: VisaApplication) => {
    setVisaApplications((prev) => [app, ...prev]);
    showToast(`Visa application submitted. Reference: ${app.referenceNo}`);
    setActiveTab('eservices');
  };

  const handleRequestRefund = async (ticketId: string) => {
    if (!authToken) {
      setAuthModalOpen(true);
      return;
    }
    try {
      await requestRefundApi(authToken, ticketId);
      setBookings((prev) =>
        prev.map((b) => (b.id === ticketId ? { ...b, status: 'Refund Requested' } : b))
      );
      showToast('Refund / cancellation request saved with Fly Aviation Travel.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to request refund.');
    }
  };

  const fromAirport = airports.find((a) => a.code === fromCode);
  const toAirport = airports.find((a) => a.code === toCode);

  return (
    <div id="top" className="min-h-screen bg-[#F7F9FC] pb-20 text-slate-900 md:pb-8">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('flights');
            }}
            className="shrink-0 whitespace-nowrap text-lg font-bold tracking-tight text-[#0A4B94]"
          >
            eBooking.pk
          </a>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary Navigation">
            {(
              [
                { id: 'flights', label: 'Flights' },
                { id: 'visas', label: 'Visas & Umrah' },
                { id: 'eservices', label: 'e-Services' },
                { id: 'bookings', label: 'My Bookings' },
              ] as { id: NavTab; label: string }[]
            ).map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative shrink-0 whitespace-nowrap py-1 text-sm font-medium transition-colors ${
                    active ? 'text-[#0A4B94]' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-[19px] h-0.5 bg-[#0A4B94]" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-[#0A4B94] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#083B75]"
            >
              <User className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">
                {currentUser ? currentUser.fullName : 'Customer Login'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {toastMessage && (
        <div className="fixed right-4 top-20 z-50 max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === 'flights' && (
          <>
            <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
              <div className="relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#0A4B94] via-[#0B396E] to-slate-950 lg:col-span-7">
                <img
                  src="/src/assets/images/hero_aviation_sky_1795379949944.jpg"
                  alt="Commercial passenger jet cruising at dawn"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/15" />

                <div className="relative z-10 p-6 sm:p-8">
                  <p className="text-xs font-medium tracking-wide text-amber-300">
                    Fly Aviation Travel (Pvt) Ltd · IATA Accredited
                  </p>
                  <h1 className="mt-2 max-w-xl text-balance text-2xl font-bold tracking-tight text-white sm:text-4xl">
                    eBooking.pk with Fly Aviation Travel
                  </h1>
                  <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-slate-200">
                    Compare live fares across Emirates, Qatar Airways, Etihad, Turkish Airlines, Saudia, PIA, Airblue, Fly Jinnah, and AirSial. Sign in, complete passenger details, and pay online for instant PNR ticketing.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                      <span>9 Global &amp; Pakistani Airlines</span>
                      <span aria-hidden="true">·</span>
                      <span>Online Card, JazzCash, Easypaisa &amp; Raast</span>
                      <span aria-hidden="true">·</span>
                      <span>Support: 03111-248-111</span>
                    </div>
                    <PWAInstallButton variant="dark" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-5">
                <form onSubmit={handleSearchSubmit} className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-900">Search Flights</h2>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setIsReturn(false)}
                        className={`min-h-[34px] whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors ${
                          !isReturn ? 'bg-[#0A4B94] text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        One Way
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsReturn(true)}
                        className={`min-h-[34px] whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors ${
                          isReturn ? 'bg-[#0A4B94] text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Return
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
                      <select
                        value={fromCode}
                        onChange={(e) => {
                          setFromCode(e.target.value);
                          setRouteError('');
                        }}
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
                      >
                        {airports.length === 0 ? (
                          <option value={fromCode}>{fromCode}</option>
                        ) : (
                          airports.map((a) => (
                            <option key={a.code} value={a.code}>
                              {a.city} ({a.code}) — {a.country}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSwapAirports}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        Swap Cities
                      </button>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
                      <select
                        value={toCode}
                        onChange={(e) => {
                          setToCode(e.target.value);
                          setRouteError('');
                        }}
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-[#0A4B94] focus:outline-none focus:ring-2 focus:ring-[#0A4B94]/20"
                      >
                        {airports.length === 0 ? (
                          <option value={toCode}>{toCode}</option>
                        ) : (
                          airports.map((a) => (
                            <option key={a.code} value={a.code}>
                              {a.city} ({a.code}) — {a.country}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  <div className={`grid gap-3 ${isReturn ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <Calendar className="h-3.5 w-3.5" />
                        Departure
                      </label>
                      <input
                        type="date"
                        value={departDate}
                        min={getDefaultDate(0)}
                        onChange={(e) => setDepartDate(e.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-xs text-slate-900 focus:border-[#0A4B94] focus:outline-none"
                      />
                    </div>
                    {isReturn && (
                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <Calendar className="h-3.5 w-3.5" />
                          Return
                        </label>
                        <input
                          type="date"
                          value={returnDate}
                          min={departDate}
                          onChange={(e) => setReturnDate(e.target.value)}
                          className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-xs text-slate-900 focus:border-[#0A4B94] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <Users className="h-3.5 w-3.5" />
                        Travelers
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowTravelersMenu((prev) => !prev)}
                        className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-left text-xs font-medium text-slate-900 hover:border-slate-400"
                      >
                        <span className="truncate">{travelersSummary}</span>
                        <span className="text-slate-400">Edit</span>
                      </button>

                      {showTravelersMenu && (
                        <div className="absolute left-0 right-0 top-[72px] z-30 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                          <div className="space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800">Adults (12+ yrs)</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setAdults((v) => Math.max(1, v - 1))}
                                  className="h-8 w-8 rounded-lg border border-slate-300 font-bold hover:bg-slate-50"
                                >
                                  -
                                </button>
                                <span className="w-4 text-center font-mono font-bold">{adults}</span>
                                <button
                                  type="button"
                                  onClick={() => setAdults((v) => Math.min(9, v + 1))}
                                  className="h-8 w-8 rounded-lg border border-slate-300 font-bold hover:bg-slate-50"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800">Children (2–11 yrs)</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setChildren((v) => Math.max(0, v - 1))}
                                  className="h-8 w-8 rounded-lg border border-slate-300 font-bold hover:bg-slate-50"
                                >
                                  -
                                </button>
                                <span className="w-4 text-center font-mono font-bold">{children}</span>
                                <button
                                  type="button"
                                  onClick={() => setChildren((v) => Math.min(6, v + 1))}
                                  className="h-8 w-8 rounded-lg border border-slate-300 font-bold hover:bg-slate-50"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800">Infants (&lt;2 yrs)</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setInfants((v) => Math.max(0, v - 1))}
                                  className="h-8 w-8 rounded-lg border border-slate-300 font-bold hover:bg-slate-50"
                                >
                                  -
                                </button>
                                <span className="w-4 text-center font-mono font-bold">{infants}</span>
                                <button
                                  type="button"
                                  onClick={() => setInfants((v) => Math.min(4, v + 1))}
                                  className="h-8 w-8 rounded-lg border border-slate-300 font-bold hover:bg-slate-50"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowTravelersMenu(false)}
                              className="mt-1 min-h-[36px] w-full rounded-lg bg-[#0A4B94] font-semibold text-white"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Cabin Class</label>
                      <select
                        value={cabinClass}
                        onChange={(e) => setCabinClass(e.target.value as CabinClass)}
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-[#0A4B94] focus:outline-none"
                      >
                        <option value="Economy">Economy</option>
                        <option value="Premium Economy">Premium Economy</option>
                        <option value="Business">Business</option>
                        <option value="First">First Class</option>
                      </select>
                    </div>
                  </div>

                  {routeError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      {routeError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="min-h-[48px] w-full rounded-xl bg-[#0A4B94] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#083B75]"
                  >
                    Search Available Flights
                  </button>
                </form>
              </div>
            </section>

            <section ref={resultsRef} className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {fromAirport ? `${fromAirport.city} (${fromCode})` : fromCode} to{' '}
                    {toAirport ? `${toAirport.city} (${toCode})` : toCode}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    {departDate}
                    {isReturn ? ` – ${returnDate}` : ''} · {travelersSummary} · {cabinClass} ·{' '}
                    {loadingFlights ? 'Updating schedules...' : `${filteredFlights.length} flight options shown`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                    {(
                      [
                        { key: 'all', label: 'All Airlines' },
                        { key: 'international', label: 'International' },
                        { key: 'pakistani', label: 'Pakistani' },
                        { key: 'nonstop', label: 'Non-Stop' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setAirlineScope(tab.key)}
                        className={`min-h-[34px] whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors ${
                          airlineScope === tab.key
                            ? 'bg-[#0A4B94] text-white'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <select
                    value={selectedCarrier}
                    onChange={(e) => setSelectedCarrier(e.target.value)}
                    aria-label="Filter by specific airline"
                    className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-[#0A4B94] focus:outline-none"
                  >
                    <option value="ALL">All 9 Airlines</option>
                    {featuredAirlines.map((carrier) => (
                      <option key={carrier.code} value={carrier.code}>
                        {carrier.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'price' | 'duration' | 'depart')}
                    aria-label="Sort flights"
                    className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-[#0A4B94] focus:outline-none"
                  >
                    <option value="price">Lowest Fare</option>
                    <option value="duration">Shortest Duration</option>
                    <option value="depart">Earliest Departure</option>
                  </select>
                </div>
              </div>

              {loadingFlights ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs font-medium text-slate-500">
                  Loading live airline schedules...
                </div>
              ) : flightLoadError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs font-medium text-red-700">
                  {flightLoadError}
                </div>
              ) : filteredFlights.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                  <p className="text-sm font-semibold text-slate-900">
                    No flights match the current filter.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try switching to All Airlines or selecting an international destination such as Dubai, Doha, Jeddah, or London.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAirlineScope('all');
                      setSelectedCarrier('ALL');
                    }}
                    className="mt-4 min-h-[40px] rounded-xl bg-[#0A4B94] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFlights.map((flight) => {
                    const totalPrice = flight.baseFarePkr * totalPassengers;
                    return (
                      <div
                        key={flight.id}
                        className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 md:flex-row md:items-center"
                      >
                        <div className="flex items-center gap-4 md:w-56">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                            style={{ backgroundColor: flight.brandColor }}
                          >
                            {flight.airlineCode}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{flight.airline}</div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              <span className="font-mono">{flight.flightNo}</span> · {flight.aircraft}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-1 items-center justify-between gap-4 md:justify-center md:gap-8">
                          <div>
                            <div className="font-mono text-lg font-bold tabular-nums text-slate-900">
                              {flight.departTime}
                            </div>
                            <div className="text-xs font-semibold text-slate-600">{flight.fromCode}</div>
                          </div>

                          <div className="flex flex-col items-center text-center">
                            <span className="font-mono text-xs text-slate-500">{flight.durationLabel}</span>
                            <div className="my-1 flex items-center gap-1.5 text-slate-400">
                              <span className="h-px w-10 bg-slate-300 sm:w-16" />
                              <Plane className="h-3.5 w-3.5 text-[#0A4B94]" />
                              <span className="h-px w-10 bg-slate-300 sm:w-16" />
                            </div>
                            <span className="text-xs text-slate-600">
                              {flight.stops === 0 ? 'Non-Stop' : `1 Stop (${flight.stopCity})`}
                            </span>
                          </div>

                          <div className="text-right">
                            <div className="font-mono text-lg font-bold tabular-nums text-slate-900">
                              {flight.arriveTime}
                            </div>
                            <div className="text-xs font-semibold text-slate-600">{flight.toCode}</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 md:w-64 md:justify-end md:border-t-0 md:pt-0">
                          <div className="md:text-right">
                            <div className="font-mono text-lg font-bold tabular-nums text-[#0A4B94]">
                              PKR {totalPrice.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500">
                              {flight.baggage} checked · {flight.refundable ? 'Refundable' : 'Standard'}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStartFlightBooking(flight)}
                            className="inline-flex min-h-[42px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#0A4B94] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#083B75]"
                          >
                            Book Online
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Popular Corridors from Pakistan
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Quick-load fares on high-demand international routes and Umrah travel.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                    <img
                      src="/src/assets/images/dest_dubai_skyline_1795379949792.jpg"
                      alt="Dubai skyline at twilight"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="p-5">
                    <div className="text-xs text-slate-500">
                      Lahore to Dubai · Emirates, Fly Jinnah, PIA
                    </div>
                    <h3 className="mt-1 text-base font-bold text-slate-900">Dubai Direct Flights</h3>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-mono text-sm font-bold tabular-nums text-[#0A4B94]">
                        From PKR 81,500
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectRouteShortcut('LHE', 'DXB')}
                        className="min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Search LHE to DXB
                      </button>
                    </div>
                  </div>
                </div>

                <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                    <img
                      src="/src/assets/images/dest_makkah_umrah_1795379950949.jpg"
                      alt="Masjid al-Haram courtyard in Makkah"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="p-5">
                    <div className="text-xs text-slate-500">
                      Lahore to Jeddah · Saudia, PIA, Airblue
                    </div>
                    <h3 className="mt-1 text-base font-bold text-slate-900">Jeddah &amp; Umrah Travel</h3>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-mono text-sm font-bold tabular-nums text-[#0A4B94]">
                        From PKR 91,500
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectRouteShortcut('LHE', 'JED')}
                        className="min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Search LHE to JED
                      </button>
                    </div>
                  </div>
                </div>

                <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                    <img
                      src="/src/assets/images/dest_istanbul_bosphorus_1795379951077.jpg"
                      alt="Istanbul Bosphorus strait at sunset"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="p-5">
                    <div className="text-xs text-slate-500">
                      Islamabad to Istanbul · Turkish Airlines, Qatar
                    </div>
                    <h3 className="mt-1 text-base font-bold text-slate-900">Istanbul &amp; Europe</h3>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-mono text-sm font-bold tabular-nums text-[#0A4B94]">
                        From PKR 124,500
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectRouteShortcut('ISB', 'IST')}
                        className="min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Search ISB to IST
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'visas' && (
          <VisasSection visaPackages={visaPackages} onSelectPackage={handleStartVisaApply} />
        )}

        {activeTab === 'eservices' && (
          <EServicesSection
            authToken={authToken}
            bookings={bookings}
            visaApplications={visaApplications}
            onPayInvoice={(inv) => {
              setPaidInvoices((prev) => [inv, ...prev]);
              showToast(`Invoice ${inv.invoiceNo} settled online.`);
            }}
            onRequireAuth={() => {
              setAuthModalOpen(true);
              showToast('Please sign in to settle an invoice.');
            }}
          />
        )}

        {activeTab === 'bookings' && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A4B94] text-white">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {currentUser ? currentUser.fullName : 'Guest Customer'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {currentUser
                      ? `${currentUser.email} · ${currentUser.phone}`
                      : 'Sign in or create an account to view and manage your saved bookings'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <PWAInstallButton />
                {currentUser ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className="min-h-[40px] rounded-xl bg-[#0A4B94] px-4 py-2 text-xs font-semibold text-white hover:bg-[#083B75]"
                  >
                    Sign In / Create Account
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900">
                Booked Flight E-Tickets ({bookings.length})
              </h3>

              {bookings.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                  <p className="text-sm font-semibold text-slate-900">
                    {currentUser ? 'No flight bookings yet.' : 'Sign in to view your bookings.'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Search any route, select Emirates, Qatar Airways, Turkish Airlines, PIA, or another carrier, and complete online checkout to save your PNR.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('flights')}
                    className="mt-4 min-h-[40px] rounded-xl bg-[#0A4B94] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Search Flights
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                          style={{ backgroundColor: t.flight.brandColor }}
                        >
                          {t.flight.airlineCode}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold text-slate-900">
                            <span>
                              {t.flight.fromCode} to {t.flight.toCode}
                            </span>
                            <span className="font-mono text-[#0A4B94]">PNR {t.pnr}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {t.flight.airline} ({t.flight.flightNo}) · {t.departDate} · {t.passengerName}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            Paid PKR {t.totalPaidPkr.toLocaleString()} via {t.paymentMethod} · Status:{' '}
                            <span
                              className={
                                t.status === 'Confirmed'
                                  ? 'font-semibold text-emerald-700'
                                  : 'font-semibold text-amber-700'
                              }
                            >
                              {t.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTicket(t)}
                          className="min-h-[40px] rounded-xl bg-[#0A4B94] px-4 py-2 text-xs font-semibold text-white hover:bg-[#083B75]"
                        >
                          View E-Ticket
                        </button>
                        {t.status === 'Confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleRequestRefund(t.id)}
                            className="min-h-[40px] rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Request Refund
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {visaApplications.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900">
                  Visa &amp; Umrah Applications ({visaApplications.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {visaApplications.map((v) => (
                    <div
                      key={v.referenceNo}
                      className="rounded-2xl border border-slate-200 bg-white p-4 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-[#0A4B94]">{v.referenceNo}</span>
                        <span className="font-semibold text-emerald-700">{v.stage}</span>
                      </div>
                      <div className="mt-1.5 text-sm font-bold text-slate-900">{v.packageTitle}</div>
                      <div className="mt-1 text-slate-600">
                        {v.applicantName} · Passport {v.passportNo} · Submitted {v.submittedAt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {paidInvoices.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900">
                  Paid Invoices ({paidInvoices.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {paidInvoices.map((inv) => (
                    <div
                      key={`${inv.invoiceNo}-${inv.paidAt}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-[#0A4B94]">{inv.invoiceNo}</span>
                        <span className="font-mono font-bold text-emerald-700">
                          PKR {inv.amountPkr.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 text-slate-600">
                        {inv.paymentMethod} · {inv.paidAt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="mx-auto mt-8 max-w-6xl border-t border-slate-200 px-4 py-6 text-xs text-slate-500 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            eBooking.pk with Fly Aviation Travel (Pvt) Ltd · Main Boulevard Gulberg III, Lahore
          </div>
          <div>Helpline: 03111-248-111 · info@ebooking.pk</div>
        </div>
      </footer>

      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-4 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden"
      >
        {(
          [
            { id: 'flights', label: 'Flights', icon: Plane },
            { id: 'visas', label: 'Visas', icon: Globe },
            { id: 'eservices', label: 'e-Services', icon: FileText },
            { id: 'bookings', label: 'Bookings', icon: Ticket },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                active ? 'text-[#0A4B94]' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingFlight(null);
          setPendingVisaPkg(null);
        }}
        currentUser={currentUser}
        onAuthenticate={handleAuthenticated}
        onSignOut={handleSignOut}
      />

      <CheckoutModal
        flight={checkoutFlight}
        authToken={authToken}
        currentUser={currentUser}
        cabinClass={cabinClass}
        isReturn={isReturn}
        totalPassengers={totalPassengers}
        travelersSummary={travelersSummary}
        departDate={departDate}
        returnDate={isReturn ? returnDate : undefined}
        onClose={() => setCheckoutFlight(null)}
        onConfirmBooking={handleConfirmBooking}
      />

      <TicketModal ticket={activeTicket} onClose={() => setActiveTicket(null)} />

      <VisaModal
        visaPackage={selectedVisaPkg}
        authToken={authToken}
        currentUser={currentUser}
        onClose={() => setSelectedVisaPkg(null)}
        onSubmitApplication={handleSubmitVisa}
      />

      <OfflineIndicator />
    </div>
  );
}
