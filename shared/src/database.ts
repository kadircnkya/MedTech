import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectDatabase(uri?: string): Promise<void> {
  const mongoUri = uri || process.env.MONGO_URI || 'mongodb://localhost:27017/mediflow';

  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');
  } catch (err) {
    logger.error('MongoDB connection error', err);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB runtime error', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}
