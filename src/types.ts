export type NavTab = 'flights' | 'visas' | 'eservices' | 'bookings';

export type CabinClass = 'Economy' | 'Premium Economy' | 'Business' | 'First';

export type PaymentMethod =
  | 'Visa / Mastercard'
  | 'JazzCash Mobile Wallet'
  | 'Easypaisa Mobile Wallet'
  | 'Raast / Bank Transfer';

export interface CustomerProfile {
  fullName: string;
  email: string;
  phone: string;
  passportNo?: string;
}

export interface Airport {
  code: string;
  city: string;
  country: string;
  airportName: string;
  isDomestic: boolean;
}

export interface FlightOption {
  id: string;
  airline: string;
  airlineCode: string;
  brandColor: string;
  flightNo: string;
  isInternational: boolean;
  aircraft: string;
  fromCode: string;
  toCode: string;
  departTime: string;
  arriveTime: string;
  durationMinutes: number;
  durationLabel: string;
  stops: number;
  stopCity?: string;
  baseFarePkr: number;
  baggage: string;
  cabinBag: string;
  refundable: boolean;
}

export interface BookedTicket {
  id: string;
  pnr: string;
  receiptNo: string;
  flight: FlightOption;
  passengerName: string;
  passportOrCnic: string;
  phone: string;
  email: string;
  cabinClass: CabinClass;
  travelersSummary: string;
  totalPassengers: number;
  departDate: string;
  returnDate?: string;
  hasInsurance: boolean;
  totalPaidPkr: number;
  paymentMethod: PaymentMethod;
  status: 'Confirmed' | 'Refund Requested';
  bookedAt: string;
}

export interface VisaPackage {
  id: string;
  title: string;
  country: string;
  category: 'Dropbox Visa' | 'Tourist Visa' | 'Umrah Package';
  processingTime: string;
  validity: string;
  priceLabel: string;
  pricePkr: number;
  description: string;
}

export interface VisaApplication {
  referenceNo: string;
  packageTitle: string;
  applicantName: string;
  passportNo: string;
  phone: string;
  submittedAt: string;
  stage: 'Documents Received' | 'Embassy Processing' | 'Ready for Collection';
  feePkr: number;
}

export interface PaidInvoice {
  invoiceNo: string;
  description: string;
  amountPkr: number;
  paymentMethod: PaymentMethod;
  paidAt: string;
}
