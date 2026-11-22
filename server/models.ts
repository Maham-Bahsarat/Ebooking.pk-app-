import mongoose, { Schema } from 'mongoose';

export interface IUserDoc {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  passportNo?: string;
  passwordHash: string;
  createdAt: Date;
}

export interface IBookingDoc {
  _id: mongoose.Types.ObjectId;
  userId: string;
  pnr: string;
  receiptNo: string;
  flight: {
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
  };
  passengerName: string;
  passportOrCnic: string;
  phone: string;
  email: string;
  cabinClass: 'Economy' | 'Premium Economy' | 'Business' | 'First';
  travelersSummary: string;
  totalPassengers: number;
  departDate: string;
  returnDate?: string;
  hasInsurance: boolean;
  totalPaidPkr: number;
  paymentMethod:
    | 'Visa / Mastercard'
    | 'JazzCash Mobile Wallet'
    | 'Easypaisa Mobile Wallet'
    | 'Raast / Bank Transfer';
  status: 'Confirmed' | 'Refund Requested';
  bookedAt: string;
  createdAt: Date;
}

export interface IVisaApplicationDoc {
  _id: mongoose.Types.ObjectId;
  userId: string;
  referenceNo: string;
  packageId: string;
  packageTitle: string;
  applicantName: string;
  passportNo: string;
  phone: string;
  submittedAt: string;
  stage: 'Documents Received' | 'Embassy Processing' | 'Ready for Collection';
  feePkr: number;
  createdAt: Date;
}

export interface IPaidInvoiceDoc {
  _id: mongoose.Types.ObjectId;
  userId: string;
  invoiceNo: string;
  description: string;
  amountPkr: number;
  paymentMethod:
    | 'Visa / Mastercard'
    | 'JazzCash Mobile Wallet'
    | 'Easypaisa Mobile Wallet'
    | 'Raast / Bank Transfer';
  paidAt: string;
  createdAt: Date;
}

const userSchema = new Schema<IUserDoc>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passportNo: { type: String, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

const bookingSchema = new Schema<IBookingDoc>(
  {
    userId: { type: String, required: true, index: true },
    pnr: { type: String, required: true, unique: true },
    receiptNo: { type: String, required: true, unique: true },
    flight: {
      id: { type: String, required: true },
      airline: { type: String, required: true },
      airlineCode: { type: String, required: true },
      brandColor: { type: String, required: true },
      flightNo: { type: String, required: true },
      isInternational: { type: Boolean, required: true },
      aircraft: { type: String, required: true },
      fromCode: { type: String, required: true },
      toCode: { type: String, required: true },
      departTime: { type: String, required: true },
      arriveTime: { type: String, required: true },
      durationMinutes: { type: Number, required: true },
      durationLabel: { type: String, required: true },
      stops: { type: Number, required: true },
      stopCity: { type: String },
      baseFarePkr: { type: Number, required: true },
      baggage: { type: String, required: true },
      cabinBag: { type: String, required: true },
      refundable: { type: Boolean, required: true },
    },
    passengerName: { type: String, required: true },
    passportOrCnic: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    cabinClass: {
      type: String,
      enum: ['Economy', 'Premium Economy', 'Business', 'First'],
      required: true,
    },
    travelersSummary: { type: String, required: true },
    totalPassengers: { type: Number, required: true },
    departDate: { type: String, required: true },
    returnDate: { type: String },
    hasInsurance: { type: Boolean, default: false },
    totalPaidPkr: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: [
        'Visa / Mastercard',
        'JazzCash Mobile Wallet',
        'Easypaisa Mobile Wallet',
        'Raast / Bank Transfer',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['Confirmed', 'Refund Requested'],
      default: 'Confirmed',
    },
    bookedAt: { type: String, required: true },
  },
  { timestamps: true }
);

const visaApplicationSchema = new Schema<IVisaApplicationDoc>(
  {
    userId: { type: String, required: true, index: true },
    referenceNo: { type: String, required: true, unique: true },
    packageId: { type: String, required: true },
    packageTitle: { type: String, required: true },
    applicantName: { type: String, required: true },
    passportNo: { type: String, required: true },
    phone: { type: String, required: true },
    submittedAt: { type: String, required: true },
    stage: {
      type: String,
      enum: ['Documents Received', 'Embassy Processing', 'Ready for Collection'],
      default: 'Documents Received',
    },
    feePkr: { type: Number, required: true },
  },
  { timestamps: true }
);

const paidInvoiceSchema = new Schema<IPaidInvoiceDoc>(
  {
    userId: { type: String, required: true, index: true },
    invoiceNo: { type: String, required: true, index: true },
    description: { type: String, required: true },
    amountPkr: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: [
        'Visa / Mastercard',
        'JazzCash Mobile Wallet',
        'Easypaisa Mobile Wallet',
        'Raast / Bank Transfer',
      ],
      required: true,
    },
    paidAt: { type: String, required: true },
  },
  { timestamps: true }
);

export const UserModel =
  (mongoose.models.User as mongoose.Model<IUserDoc> | undefined) ||
  mongoose.model<IUserDoc>('User', userSchema);

export const BookingModel =
  (mongoose.models.Booking as mongoose.Model<IBookingDoc> | undefined) ||
  mongoose.model<IBookingDoc>('Booking', bookingSchema);

export const VisaApplicationModel =
  (mongoose.models.VisaApplication as mongoose.Model<IVisaApplicationDoc> | undefined) ||
  mongoose.model<IVisaApplicationDoc>('VisaApplication', visaApplicationSchema);

export const PaidInvoiceModel =
  (mongoose.models.PaidInvoice as mongoose.Model<IPaidInvoiceDoc> | undefined) ||
  mongoose.model<IPaidInvoiceDoc>('PaidInvoice', paidInvoiceSchema);
