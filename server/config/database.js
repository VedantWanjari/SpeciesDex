import mongoose from 'mongoose';
import { env, mongoIsConfigured } from './env.js';

export async function connectDatabase() {
  if (!mongoIsConfigured()) return false;

  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
  console.log('[db] connected to MongoDB Atlas');
  return true;
}

export const isDatabaseConnected = () => mongoose.connection.readyState === 1;

