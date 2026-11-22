import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  connected: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.__mongooseCache ?? {
  conn: null,
  promise: null,
  connected: false,
};

globalThis.__mongooseCache = cached;

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!mongoUri) {
    console.warn(
      '[DB] MONGODB_URI is not set. Configure MONGODB_URI in Settings -> Secrets to enable persistent MongoDB storage.'
    );
    cached.connected = false;
    return null;
  }

  if (mongoUri.includes('<db_password>')) {
    console.warn(
      '[DB] MONGODB_URI still contains the <db_password> placeholder. Replace it with your MongoDB Atlas password in Settings -> Secrets.'
    );
    cached.connected = false;
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    cached.connected = true;
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri, {
      dbName: 'ebooking_fly_aviation',
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    cached.conn = await cached.promise;
    cached.connected = mongoose.connection.readyState === 1;
    if (cached.connected) {
      console.log('[DB] Connected to MongoDB (ebooking_fly_aviation).');
    }
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    cached.connected = false;
    const message = err instanceof Error ? err.message : 'Unknown connection error';
    console.error(`[DB] MongoDB connection failed (${message}). Using in-memory fallback.`);
    return null;
  }
}

export function isDatabaseConnected(): boolean {
  return cached.connected && mongoose.connection.readyState === 1;
}
