import type {
  Airport,
  BookedTicket,
  CabinClass,
  CustomerProfile,
  FlightOption,
  PaidInvoice,
  PaymentMethod,
  VisaApplication,
  VisaPackage,
} from '../types';

export interface AirlineInfo {
  code: string;
  name: string;
  color: string;
  origin: string;
}

export interface CatalogResponse {
  airports: Airport[];
  airlines: AirlineInfo[];
  visaPackages: VisaPackage[];
}

export interface AuthResponse {
  token: string;
  user: CustomerProfile;
}

const API_BASE = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const targetUrl = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(targetUrl, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchHealthApi(): Promise<{ ok: boolean; storage: 'mongodb' | 'memory' }> {
  return apiRequest<{ ok: boolean; storage: 'mongodb' | 'memory' }>('/api/health');
}

export async function fetchCatalogApi(): Promise<CatalogResponse> {
  return apiRequest<CatalogResponse>('/api/catalog');
}

export async function loginCustomer(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerCustomer(payload: {
  fullName: string;
  email: string;
  phone: string;
  passportNo?: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCurrentUserApi(token: string): Promise<CustomerProfile> {
  const res = await apiRequest<{ user: CustomerProfile }>('/api/auth/me', {}, token);
  return res.user;
}

export async function searchFlightsApi(params: {
  from: string;
  to: string;
  cabin: CabinClass;
  isReturn: boolean;
}): Promise<FlightOption[]> {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    cabin: params.cabin,
    return: String(params.isReturn),
  });
  const res = await apiRequest<{ flights: FlightOption[] }>(`/api/flights/search?${query.toString()}`);
  return res.flights;
}

export async function fetchBookingsApi(token: string): Promise<BookedTicket[]> {
  const res = await apiRequest<{ bookings: BookedTicket[] }>('/api/bookings', {}, token);
  return res.bookings;
}

export async function createBookingApi(
  token: string,
  payload: {
    flightId: string;
    fromCode: string;
    toCode: string;
    cabinClass: CabinClass;
    isReturn: boolean;
    departDate: string;
    returnDate?: string;
    passengerName: string;
    passportOrCnic: string;
    phone: string;
    email: string;
    travelersSummary: string;
    totalPassengers: number;
    hasInsurance: boolean;
    paymentMethod: PaymentMethod;
  }
): Promise<BookedTicket> {
  const res = await apiRequest<{ ticket: BookedTicket }>(
    '/api/bookings',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token
  );
  return res.ticket;
}

export async function requestRefundApi(token: string, bookingId: string): Promise<void> {
  await apiRequest<{ status: string }>(
    `/api/bookings/${encodeURIComponent(bookingId)}/refund`,
    { method: 'PATCH' },
    token
  );
}

export async function fetchVisasApi(token: string): Promise<VisaApplication[]> {
  const res = await apiRequest<{ visas: VisaApplication[] }>('/api/visas', {}, token);
  return res.visas;
}

export async function submitVisaApi(
  token: string,
  payload: {
    packageId: string;
    applicantName: string;
    passportNo: string;
    phone: string;
  }
): Promise<VisaApplication> {
  const res = await apiRequest<{ visa: VisaApplication }>(
    '/api/visas',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token
  );
  return res.visa;
}

export async function trackVisaApi(referenceNo: string): Promise<{
  referenceNo: string;
  packageTitle: string;
  stage: string;
  submittedAt: string;
}> {
  const res = await apiRequest<{
    visaStatus: {
      referenceNo: string;
      packageTitle: string;
      stage: string;
      submittedAt: string;
    };
  }>(`/api/visas/track/${encodeURIComponent(referenceNo)}`);
  return res.visaStatus;
}

export async function verifyReceiptApi(receiptNo: string): Promise<{
  verified: boolean;
  message: string;
}> {
  return apiRequest<{ verified: boolean; message: string }>(
    `/api/receipts/verify/${encodeURIComponent(receiptNo)}`
  );
}

export async function fetchInvoicesApi(token: string): Promise<PaidInvoice[]> {
  const res = await apiRequest<{ invoices: PaidInvoice[] }>('/api/invoices', {}, token);
  return res.invoices;
}

export async function payInvoiceApi(
  token: string,
  payload: {
    invoiceNo: string;
    amountPkr: number;
    paymentMethod: PaymentMethod;
  }
): Promise<PaidInvoice> {
  const res = await apiRequest<{ invoice: PaidInvoice }>(
    '/api/invoices',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token
  );
  return res.invoice;
}
