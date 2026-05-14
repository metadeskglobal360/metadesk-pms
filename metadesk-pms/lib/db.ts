import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const FALLBACK_DATABASE_NAMES = new Set(["", "test"]);

function getDatabaseName(uri: string) {
  const uriWithoutQuery = uri.split("?")[0] || "";
  const name = uriWithoutQuery.slice(uriWithoutQuery.lastIndexOf("/") + 1).trim();
  return decodeURIComponent(name);
}

// Prevent multiple connections in development (Next.js hot reload)
declare global {
  var mongoose: { conn: typeof import("mongoose") | null; promise: Promise<typeof import("mongoose")> | null };
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("Please define MONGODB_URI in your .env.local file");
  }

  const databaseName = getDatabaseName(MONGODB_URI);
  if (FALLBACK_DATABASE_NAMES.has(databaseName.toLowerCase())) {
    throw new Error("MONGODB_URI must include the production database name, for example /metadesk_pms. Refusing to use MongoDB's default test database.");
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
      })
      .then((mongoose) => mongoose);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
