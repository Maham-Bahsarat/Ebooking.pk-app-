import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { connectToDatabase, isDatabaseConnected } from './src/lib/db.ts';
import {
  BookingModel,
  PaidInvoiceModel,
  UserModel,
  VisaApplicationModel,
} from './server/models.ts';
import {
  AIRPORTS,
  FEATURED_AIRLINES,
  INITIAL_VISA_TRACKING,
  VISA_PACKAGES,
  generateFlightsForRoute,
} from './src/data/airlines.ts';
import type {
  BookedTicket,
  CabinClass,
  PaidInvoice,
  PaymentMethod,
  VisaApplication,
} from './src/types.ts';

interface AuthPayload {
  userId: string;
  email: string;
}

interface AuthenticatedRequest extends Request {
  auth?: AuthPayload;
}

interface MemoryUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passportNo?: string;
  passwordHash: string;
}

const JWT_SECRET = process.env.JWT_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const PORT = Number(process.env.PORT) || 3000;

const VALID_CABINS: CabinClass[] = ['Economy', 'Premium Economy', 'Business', 'First'];
const VALID_PAYMENTS: PaymentMethod[] = [
  'Visa / Mastercard',
  'JazzCash Mobile Wallet',
  'Easypaisa Mobile Wallet',
  'Raast / Bank Transfer',
];

// Graceful in-memory fallback when MONGODB_URI is not yet configured
const memoryUsers: MemoryUser[] = [];
const memoryBookings: (BookedTicket & { userId: string })[] = [];
const memoryVisas: (VisaApplication & { userId: string; packageId: string })[] =
  INITIAL_VISA_TRACKING.map((v) => ({
    ...v,
    userId: 'sample-seed',
    packageId: 'visa-thailand',
  }));
const memoryInvoices: (PaidInvoice & { userId: string })[] = [];

function asNonEmptyString(val: unknown, maxLen = 160): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed.length > maxLen) return null;
  return trimmed;
}

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) return reject(err);
      resolve(`${salt}:${derived.toString('hex')}`);
    });
  });
}

function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const parts = stored.split(':');
    if (parts.length !== 2) return resolve(false);
    const [salt, keyHex] = parts;
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) return reject(err);
      const expected = Buffer.from(keyHex, 'hex');
      if (expected.length !== derived.length) return resolve(false);
      resolve(crypto.timingSafeEqual(expected, derived));
    });
  });
}

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Invalid authorization token.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    if (!decoded || typeof decoded.userId !== 'string') {
      res.status(401).json({ error: 'Invalid session token.' });
      return;
    }
    req.auth = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

async function startServer() {
  await connectToDatabase();

  const app = express();
  app.use(express.json({ limit: '100kb' }));

  // Health & catalog endpoints
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      storage: isDatabaseConnected() ? 'mongodb' : 'memory',
    });
  });

  app.get('/api/catalog', (_req, res) => {
    res.json({
      airports: AIRPORTS,
      airlines: FEATURED_AIRLINES,
      visaPackages: VISA_PACKAGES,
    });
  });

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================
  app.post('/api/auth/register', async (req, res) => {
    try {
      const fullName = asNonEmptyString(req.body?.fullName, 100);
      const emailRaw = asNonEmptyString(req.body?.email, 120);
      const phone = asNonEmptyString(req.body?.phone, 30);
      const passportRaw = typeof req.body?.passportNo === 'string' ? req.body.passportNo.trim().toUpperCase() : undefined;
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      if (!fullName || !emailRaw || !emailRaw.includes('@') || !phone || phone.length < 7) {
        res.status(400).json({ error: 'Valid full name, email, and mobile number are required.' });
        return;
      }
      if (password.length < 4 || password.length > 128) {
        res.status(400).json({ error: 'Password must be between 4 and 128 characters.' });
        return;
      }

      const email = emailRaw.toLowerCase();
      const passwordHash = await hashPassword(password);

      if (isDatabaseConnected()) {
        const existing = await UserModel.findOne({ email }).lean();
        if (existing) {
          res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
          return;
        }
        const created = await UserModel.create({
          fullName,
          email,
          phone,
          passportNo: passportRaw || undefined,
          passwordHash,
        });
        const userId = created._id.toString();
        const token = signToken({ userId, email });
        res.status(201).json({
          token,
          user: {
            fullName: created.fullName,
            email: created.email,
            phone: created.phone,
            passportNo: created.passportNo,
          },
        });
        return;
      }

      if (memoryUsers.some((u) => u.email === email)) {
        res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
        return;
      }
      const memUser: MemoryUser = {
        id: `usr-${crypto.randomBytes(6).toString('hex')}`,
        fullName,
        email,
        phone,
        passportNo: passportRaw || undefined,
        passwordHash,
      };
      memoryUsers.push(memUser);
      const token = signToken({ userId: memUser.id, email });
      res.status(201).json({
        token,
        user: {
          fullName: memUser.fullName,
          email: memUser.email,
          phone: memUser.phone,
          passportNo: memUser.passportNo,
        },
      });
    } catch (err) {
      console.error('[Auth] Register error:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Unable to create customer account.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const emailRaw = asNonEmptyString(req.body?.email, 120);
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      if (!emailRaw || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }

      const email = emailRaw.toLowerCase();

      if (isDatabaseConnected()) {
        const user = await UserModel.findOne({ email }).lean();
        if (!user || !(await verifyPassword(password, user.passwordHash))) {
          res.status(401).json({ error: 'Invalid email or password.' });
          return;
        }
        const token = signToken({ userId: user._id.toString(), email: user.email });
        res.json({
          token,
          user: {
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            passportNo: user.passportNo,
          },
        });
        return;
      }

      const user = memoryUsers.find((u) => u.email === email);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      const token = signToken({ userId: user.id, email: user.email });
      res.json({
        token,
        user: {
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          passportNo: user.passportNo,
        },
      });
    } catch (err) {
      console.error('[Auth] Login error:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Unable to sign in.' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.auth!.userId;
      if (isDatabaseConnected()) {
        const user = await UserModel.findById(userId).select('-passwordHash').lean();
        if (!user) {
          res.status(404).json({ error: 'Customer not found.' });
          return;
        }
        res.json({
          user: {
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            passportNo: user.passportNo,
          },
        });
        return;
      }

      const user = memoryUsers.find((u) => u.id === userId);
      if (!user) {
        res.status(404).json({ error: 'Customer not found.' });
        return;
      }
      res.json({
        user: {
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          passportNo: user.passportNo,
        },
      });
    } catch {
      res.status(500).json({ error: 'Unable to fetch profile.' });
    }
  });

  // ==========================================
  // FLIGHT SEARCH ROUTE
  // ==========================================
  app.get('/api/flights/search', (req, res) => {
    const fromCode = asNonEmptyString(req.query.from, 5)?.toUpperCase() || 'LHE';
    const toCode = asNonEmptyString(req.query.to, 5)?.toUpperCase() || 'DXB';
    const cabinRaw = asNonEmptyString(req.query.cabin, 30) as CabinClass | null;
    const cabinClass: CabinClass = cabinRaw && VALID_CABINS.includes(cabinRaw) ? cabinRaw : 'Economy';
    const isReturn = req.query.return === 'true';

    const validCodes = new Set(AIRPORTS.map((a) => a.code));
    if (!validCodes.has(fromCode) || !validCodes.has(toCode) || fromCode === toCode) {
      res.status(400).json({ error: 'Valid and distinct origin and destination codes are required.' });
      return;
    }

    const flights = generateFlightsForRoute(fromCode, toCode, cabinClass, isReturn);
    res.json({ flights });
  });

  // ==========================================
  // BOOKINGS ROUTES (PROTECTED)
  // ==========================================
  app.get('/api/bookings', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.auth!.userId;
      if (isDatabaseConnected()) {
        const docs = await BookingModel.find({ userId }).sort({ createdAt: -1 }).lean();
        const bookings: BookedTicket[] = docs.map((d) => ({
          id: d._id.toString(),
          pnr: d.pnr,
          receiptNo: d.receiptNo,
          flight: d.flight,
          passengerName: d.passengerName,
          passportOrCnic: d.passportOrCnic,
          phone: d.phone,
          email: d.email,
          cabinClass: d.cabinClass,
          travelersSummary: d.travelersSummary,
          totalPassengers: d.totalPassengers,
          departDate: d.departDate,
          returnDate: d.returnDate,
          hasInsurance: d.hasInsurance,
          totalPaidPkr: d.totalPaidPkr,
          paymentMethod: d.paymentMethod,
          status: d.status,
          bookedAt: d.bookedAt,
        }));
        res.json({ bookings });
        return;
      }

      const bookings = memoryBookings.filter((b) => b.userId === userId);
      res.json({ bookings });
    } catch {
      res.status(500).json({ error: 'Unable to load bookings.' });
    }
  });

  app.post('/api/bookings', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.auth!.userId;
      const flightId = asNonEmptyString(req.body?.flightId, 40);
      const fromCode = asNonEmptyString(req.body?.fromCode, 5)?.toUpperCase();
      const toCode = asNonEmptyString(req.body?.toCode, 5)?.toUpperCase();
      const cabinClass = req.body?.cabinClass as CabinClass;
      const isReturn = Boolean(req.body?.isReturn);
      const departDate = asNonEmptyString(req.body?.departDate, 20);
      const returnDate = isReturn ? asNonEmptyString(req.body?.returnDate, 20) || undefined : undefined;
      const passengerName = asNonEmptyString(req.body?.passengerName, 100);
      const passportOrCnic = asNonEmptyString(req.body?.passportOrCnic, 30)?.toUpperCase();
      const phone = asNonEmptyString(req.body?.phone, 30);
      const email = asNonEmptyString(req.body?.email, 120);
      const travelersSummary = asNonEmptyString(req.body?.travelersSummary, 80);
      const totalPassengers = Number(req.body?.totalPassengers);
      const hasInsurance = Boolean(req.body?.hasInsurance);
      const paymentMethod = req.body?.paymentMethod as PaymentMethod;

      if (
        !flightId ||
        !fromCode ||
        !toCode ||
        !VALID_CABINS.includes(cabinClass) ||
        !departDate ||
        !passengerName ||
        !passportOrCnic ||
        passportOrCnic.length < 6 ||
        !phone ||
        !email ||
        !email.includes('@') ||
        !travelersSummary ||
        !Number.isInteger(totalPassengers) ||
        totalPassengers < 1 ||
        totalPassengers > 15 ||
        !VALID_PAYMENTS.includes(paymentMethod)
      ) {
        res.status(400).json({ error: 'Invalid booking request payload.' });
        return;
      }

      // Authoritative server-side flight lookup & fare calculation
      const routeFlights = generateFlightsForRoute(fromCode, toCode, cabinClass, isReturn);
      const selectedFlight = routeFlights.find((f) => f.id === flightId);
      if (!selectedFlight) {
        res.status(404).json({ error: 'Selected flight is no longer available.' });
        return;
      }

      const authoritativeTotal =
        selectedFlight.baseFarePkr * totalPassengers + (hasInsurance ? 3500 * totalPassengers : 0);
      const randSuffix = crypto.randomInt(100000, 999999).toString();
      const pnr = `${selectedFlight.airlineCode}${randSuffix}`;
      const receiptNo = `FAT-${randSuffix.slice(-5)}`;
      const bookedAt = new Date().toLocaleString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      if (isDatabaseConnected()) {
        const created = await BookingModel.create({
          userId,
          pnr,
          receiptNo,
          flight: selectedFlight,
          passengerName,
          passportOrCnic,
          phone,
          email,
          cabinClass,
          travelersSummary,
          totalPassengers,
          departDate,
          returnDate,
          hasInsurance,
          totalPaidPkr: authoritativeTotal,
          paymentMethod,
          status: 'Confirmed',
          bookedAt,
        });

        const ticket: BookedTicket = {
          id: created._id.toString(),
          pnr: created.pnr,
          receiptNo: created.receiptNo,
          flight: created.flight,
          passengerName: created.passengerName,
          passportOrCnic: created.passportOrCnic,
          phone: created.phone,
          email: created.email,
          cabinClass: created.cabinClass,
          travelersSummary: created.travelersSummary,
          totalPassengers: created.totalPassengers,
          departDate: created.departDate,
          returnDate: created.returnDate,
          hasInsurance: created.hasInsurance,
          totalPaidPkr: created.totalPaidPkr,
          paymentMethod: created.paymentMethod,
          status: created.status,
          bookedAt: created.bookedAt,
        };
        res.status(201).json({ ticket });
        return;
      }

      const ticket: BookedTicket & { userId: string } = {
        id: `tkt-${crypto.randomBytes(6).toString('hex')}`,
        userId,
        pnr,
        receiptNo,
        flight: selectedFlight,
        passengerName,
        passportOrCnic,
        phone,
        email,
        cabinClass,
        travelersSummary,
        totalPassengers,
        departDate,
        returnDate,
        hasInsurance,
        totalPaidPkr: authoritativeTotal,
        paymentMethod,
        status: 'Confirmed',
        bookedAt,
      };
      memoryBookings.unshift(ticket);
      res.status(201).json({ ticket });
    } catch (err) {
      console.error('[Bookings] Create error:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Unable to complete booking.' });
    }
  });

  app.patch('/api/bookings/:id/refund', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.auth!.userId;
      const bookingId = asNonEmptyString(req.params.id, 64);
      if (!bookingId) {
        res.status(400).json({ error: 'Invalid booking identifier.' });
        return;
      }

      if (isDatabaseConnected()) {
        const updated = await BookingModel.findOneAndUpdate(
          { _id: bookingId, userId },
          { $set: { status: 'Refund Requested' } },
          { new: true }
        ).lean();
        if (!updated) {
          res.status(404).json({ error: 'Booking not found.' });
          return;
        }
        res.json({ status: updated.status });
        return;
      }

      const idx = memoryBookings.findIndex((b) => b.id === bookingId && b.userId === userId);
      if (idx === -1) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
      }
      memoryBookings[idx] = { ...memoryBookings[idx], status: 'Refund Requested' };
      res.json({ status: 'Refund Requested' });
    } catch {
      res.status(500).json({ error: 'Unable to update refund status.' });
    }
  });

  // ==========================================
  // VISAS & E-SERVICES ROUTES
  // ==========================================
  app.get('/api/visas', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.auth!.userId;
      if (isDatabaseConnected()) {
        const docs = await VisaApplicationModel.find({ userId }).sort({ createdAt: -1 }).lean();
        const visas: VisaApplication[] = docs.map((v) => ({
          referenceNo: v.referenceNo,
          packageTitle: v.packageTitle,
          applicantName: v.applicantName,
          passportNo: v.passportNo,
          phone: v.phone,
          submittedAt: v.submittedAt,
          stage: v.stage,
          feePkr: v.feePkr,
        }));
        res.json({ visas });
        return;
      }

      const visas = memoryVisas.filter((v) => v.userId === userId);
      res.json({ visas });
    } catch {
      res.status(500).json({ error: 'Unable to load visa applications.' });
    }
  });

  app.post('/api/visas', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.auth!.userId;
      const packageId = asNonEmptyString(req.body?.packageId, 50);
      const applicantName = asNonEmptyString(req.body?.applicantName, 100);
      const passportNo = asNonEmptyString(req.body?.passportNo, 30)?.toUpperCase();
      const phone = asNonEmptyString(req.body?.phone, 30);

      if (!packageId || !applicantName || !passportNo || passportNo.length < 6 || !phone) {
        res.status(400).json({ error: 'All visa applicant fields are required.' });
        return;
      }

      const pkg = VISA_PACKAGES.find((p) => p.id === packageId);
      if (!pkg) {
        res.status(404).json({ error: 'Selected visa package not found.' });
        return;
      }

      const code = pkg.country.slice(0, 2).toUpperCase();
      const referenceNo = `FAT-${code}-2026-${crypto.randomInt(100, 999)}`;
      const submittedAt = new Date().toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      if (isDatabaseConnected()) {
        const created = await VisaApplicationModel.create({
          userId,
          referenceNo,
          packageId: pkg.id,
          packageTitle: pkg.title,
          applicantName,
          passportNo,
          phone,
          submittedAt,
          stage: 'Documents Received',
          feePkr: pkg.pricePkr,
        });
        res.status(201).json({
          visa: {
            referenceNo: created.referenceNo,
            packageTitle: created.packageTitle,
            applicantName: created.applicantName,
            passportNo: created.passportNo,
            phone: created.phone,
            submittedAt: created.submittedAt,
            stage: created.stage,
            feePkr: created.feePkr,
          },
        });
        return;
      }

      const visa: VisaApplication & { userId: string; packageId: string } = {
        userId,
        packageId: pkg.id,
        referenceNo,
        packageTitle: pkg.title,
        applicantName,
        passportNo,
        phone,
        submittedAt,
        stage: 'Documents Received',
        feePkr: pkg.pricePkr,
      };
      memoryVisas.unshift(visa);
      res.status(201).json({ visa });
    } catch {
      res.status(500).json({ error: 'Unable to submit visa application.' });
    }
  });

  app.get('/api/visas/track/:referenceNo', async (req, res) => {
    try {
      const ref = asNonEmptyString(req.params.referenceNo, 32)?.toUpperCase();
      if (!ref || !/^[A-Z0-9-]+$/.test(ref)) {
        res.status(400).json({ error: 'Invalid reference number format.' });
        return;
      }

      if (isDatabaseConnected()) {
        const found = await VisaApplicationModel.findOne({ referenceNo: ref })
          .select('referenceNo packageTitle stage submittedAt')
          .lean();
        if (found) {
          res.json({ visaStatus: found });
          return;
        }
      } else {
        const found = memoryVisas.find((v) => v.referenceNo.toUpperCase() === ref);
        if (found) {
          res.json({
            visaStatus: {
              referenceNo: found.referenceNo,
              packageTitle: found.packageTitle,
              stage: found.stage,
              submittedAt: found.submittedAt,
            },
          });
          return;
        }
      }

      const sampleSeed = INITIAL_VISA_TRACKING.find((v) => v.referenceNo.toUpperCase() === ref);
      if (sampleSeed) {
        res.json({
          visaStatus: {
            referenceNo: sampleSeed.referenceNo,
            packageTitle: sampleSeed.packageTitle,
            stage: sampleSeed.stage,
            submittedAt: sampleSeed.submittedAt,
          },
        });
        return;
      }

      res.status(404).json({ error: 'No visa application found for that reference.' });
    } catch {
      res.status(500).json({ error: 'Unable to look up visa reference.' });
    }
  });

  app.get('/api/receipts/verify/:receiptNo', async (req, res) => {
    try {
      const receipt = asNonEmptyString(req.params.receiptNo, 32)?.toUpperCase();
      if (!receipt || !/^[A-Z0-9-]+$/.test(receipt)) {
        res.status(400).json({ error: 'Invalid receipt format.' });
        return;
      }

      if (isDatabaseConnected()) {
        const booking = await BookingModel.findOne({ receiptNo: receipt })
          .select('receiptNo totalPaidPkr paymentMethod bookedAt')
          .lean();
        if (booking) {
          res.json({
            verified: true,
            message: `Verified · Fly Aviation Receipt ${booking.receiptNo} (PKR ${booking.totalPaidPkr.toLocaleString()} via ${booking.paymentMethod}).`,
          });
          return;
        }
        const invoice = await PaidInvoiceModel.findOne({ invoiceNo: receipt })
          .select('invoiceNo amountPkr paymentMethod')
          .lean();
        if (invoice) {
          res.json({
            verified: true,
            message: `Verified · Paid Invoice ${invoice.invoiceNo} (PKR ${invoice.amountPkr.toLocaleString()} via ${invoice.paymentMethod}).`,
          });
          return;
        }
      } else {
        const booking = memoryBookings.find((b) => b.receiptNo.toUpperCase() === receipt);
        if (booking) {
          res.json({
            verified: true,
            message: `Verified · Fly Aviation Receipt ${booking.receiptNo} (PKR ${booking.totalPaidPkr.toLocaleString()} via ${booking.paymentMethod}).`,
          });
          return;
        }
        const invoice = memoryInvoices.find((i) => i.invoiceNo.toUpperCase() === receipt);
        if (invoice) {
          res.json({
            verified: true,
            message: `Verified · Paid Invoice ${invoice.invoiceNo} (PKR ${invoice.amountPkr.toLocaleString()} via ${invoice.paymentMethod}).`,
          });
          return;
        }
      }

      if (receipt === 'FAT-90421') {
        res.json({
          verified: true,
          message: 'Verified · Sample Fly Aviation Travel Branch Receipt (PKR 88,000 settled).',
        });
        return;
      }

      res.json({
        verified: false,
        message: 'No matching receipt found. Complete a booking or test sample FAT-90421.',
      });
    } catch {
      res.status(500).json({ error: 'Unable to verify receipt.' });
    }
  });

  app.get('/api/invoices', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.auth!.userId;
      if (isDatabaseConnected()) {
        const docs = await PaidInvoiceModel.find({ userId }).sort({ createdAt: -1 }).lean();
        res.json({
          invoices: docs.map((d) => ({
            invoiceNo: d.invoiceNo,
            description: d.description,
            amountPkr: d.amountPkr,
            paymentMethod: d.paymentMethod,
            paidAt: d.paidAt,
          })),
        });
        return;
      }

      res.json({ invoices: memoryInvoices.filter((i) => i.userId === userId) });
    } catch {
      res.status(500).json({ error: 'Unable to fetch invoices.' });
    }
  });

  app.post('/api/invoices', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.auth!.userId;
      const invoiceNo = asNonEmptyString(req.body?.invoiceNo, 32)?.toUpperCase();
      const amountPkr = Number(req.body?.amountPkr);
      const paymentMethod = req.body?.paymentMethod as PaymentMethod;

      if (
        !invoiceNo ||
        !/^[A-Z0-9-]+$/.test(invoiceNo) ||
        !Number.isFinite(amountPkr) ||
        amountPkr < 100 ||
        amountPkr > 50000000 ||
        !VALID_PAYMENTS.includes(paymentMethod)
      ) {
        res.status(400).json({ error: 'Valid invoice number, PKR amount, and payment method are required.' });
        return;
      }

      const paidAt = new Date().toLocaleString('en-PK');
      const description = 'Fly Aviation Travel Agency Invoice';

      if (isDatabaseConnected()) {
        const created = await PaidInvoiceModel.create({
          userId,
          invoiceNo,
          description,
          amountPkr: Math.round(amountPkr),
          paymentMethod,
          paidAt,
        });
        res.status(201).json({
          invoice: {
            invoiceNo: created.invoiceNo,
            description: created.description,
            amountPkr: created.amountPkr,
            paymentMethod: created.paymentMethod,
            paidAt: created.paidAt,
          },
        });
        return;
      }

      const invoice: PaidInvoice & { userId: string } = {
        userId,
        invoiceNo,
        description,
        amountPkr: Math.round(amountPkr),
        paymentMethod,
        paidAt,
      };
      memoryInvoices.unshift(invoice);
      res.status(201).json({ invoice });
    } catch {
      res.status(500).json({ error: 'Unable to settle invoice.' });
    }
  });

  // ==========================================
  // VITE MIDDLEWARE (DEV) OR STATIC DIST (PROD)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] eBooking.pk MERN server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
