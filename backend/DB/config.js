import mongoose from "mongoose";

let connectionPromise = null;

async function connectDB() {
  const mongoUri = String(process.env.MONGO_URI || "").trim();
  if (!mongoUri) {
    console.warn("MongoDB disabled: MONGO_URI not configured for minimal_vr backend.");
    return null;
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose
    .connect(mongoUri)
    .then((conn) => {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn.connection;
    })
    .catch((error) => {
      connectionPromise = null;
      console.error(`MongoDB connection error: ${error.message}`);
      return null;
    });

  return connectionPromise;
}

function isDbReady() {
  return mongoose.connection.readyState === 1;
}

export { connectDB, isDbReady };