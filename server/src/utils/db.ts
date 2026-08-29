import mongoose from 'mongoose';

const RETRY_MS = 10_000;

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI!);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // Do not exit. A dead database must not take the web service down with it:
    // process.exit(1) here killed the listener a second after it bound, so Render
    // saw "no open ports detected" and failed the deploy instead of reporting the
    // real error. Retry instead, so the service recovers on its own once the DB is
    // reachable again.
    console.error(`MongoDB connection error, retrying in ${RETRY_MS / 1000}s:`, error);
    setTimeout(connectDB, RETRY_MS).unref();
  }
};

export default connectDB;
