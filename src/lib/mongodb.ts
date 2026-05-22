import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kirana-pos";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global is used here to maintain a cached connection across hot reloads in development.
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

const dbCache = cached;

export async function connectToDatabase() {
  if (dbCache.conn) {
    return dbCache.conn;
  }

  if (!dbCache.promise) {
    const opts = {
      bufferCommands: false,
    };

    dbCache.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log("Connected to MongoDB successfully");
      return mongooseInstance;
    });
  }

  try {
    dbCache.conn = await dbCache.promise;
  } catch (e) {
    dbCache.promise = null;
    throw e;
  }

  return dbCache.conn;
}
